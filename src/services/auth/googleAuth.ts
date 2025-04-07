// import { GoogleOAuthProvider } from '@react-oauth/google';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private tokenData: TokenResponse | null = null;
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private readonly CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  private readonly REDIRECT_URI = `${window.location.origin}/auth/callback`;
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks.readonly'
  ];

  private constructor() {
    // Try to load token from localStorage
    const savedToken = localStorage.getItem('google_token');
    if (savedToken) {
      this.tokenData = JSON.parse(savedToken);
    }
  }

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async getAccessToken(): Promise<string> {
    if (this.tokenData && this.isTokenValid()) {
      return this.tokenData.access_token;
    }

    // Try to refresh token if we have one
    if (this.tokenData?.refresh_token) {
      try {
        await this.refreshToken();
        return this.tokenData!.access_token;
      } catch (error) {
        console.error('Error refreshing token:', error);
        // Clear invalid token data
        this.clearTokenData();
      }
    }

    // If we get here, we need a new token
    return this.initiateOAuthFlow();
  }

  private clearTokenData(): void {
    this.tokenData = null;
    localStorage.removeItem('google_token');
  }

  private saveTokenData(): void {
    if (this.tokenData) {
      localStorage.setItem('google_token', JSON.stringify(this.tokenData));
    }
  }

  private isTokenValid(): boolean {
    if (!this.tokenData?.expires_in) return false;
    
    // Add some buffer time (5 minutes) before token expiry
    const bufferTime = 5 * 60 * 1000;
    const expiryTime = new Date(this.tokenData.expires_in).getTime();
    return Date.now() + bufferTime < expiryTime;
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokenData?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.CLIENT_ID,
        client_secret: this.CLIENT_SECRET,
        refresh_token: this.tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.tokenData = {
      ...this.tokenData,
      ...data,
      expires_in: Date.now() + (data.expires_in * 1000)
    };
    this.saveTokenData();
  }

  private async initiateOAuthFlow(): Promise<string> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(this.SCOPES.join(' '))}&` +
        `access_type=offline&` +
        `prompt=consent`,
        'Google OAuth',
        'width=500,height=600'
      );

      const checkPopup = setInterval(async () => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            reject(new Error('Authentication window was closed'));
            return;
          }

          const currentUrl = popup.location.href;
          if (currentUrl.startsWith(this.REDIRECT_URI)) {
            clearInterval(checkPopup);
            popup.close();

            const urlParams = new URLSearchParams(new URL(currentUrl).search);
            const code = urlParams.get('code');

            if (!code) {
              reject(new Error('No authorization code received'));
              return;
            }

            // Exchange code for token
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
                code,
                redirect_uri: this.REDIRECT_URI,
                grant_type: 'authorization_code',
              }),
            });

            if (!tokenResponse.ok) {
              reject(new Error('Failed to exchange code for token'));
              return;
            }

            const tokenData = await tokenResponse.json();
            this.tokenData = {
              ...tokenData,
              expires_in: Date.now() + (tokenData.expires_in * 1000)
            };
            this.saveTokenData();
            if (!this.tokenData?.access_token) {
              reject(new Error('No access token received'));
              return;
            }
            resolve(this.tokenData.access_token);
          }
        } catch {
          // Ignore cross-origin errors while polling
        }
      }, 500);
    });
  }
}

export const googleAuthService = GoogleAuthService.getInstance(); 