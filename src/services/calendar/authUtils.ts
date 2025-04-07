import { auth } from '../../config/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.settings.readonly'
];

class CalendarAuth {
  private accessToken: string | null = null;

  async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Force a token refresh to get a new access token
      const provider = new GoogleAuthProvider();
      CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token');
      }

      this.accessToken = credential.accessToken;
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  clearToken() {
    this.accessToken = null;
  }
}

export const calendarAuth = new CalendarAuth(); 