// Define types for Google API client
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>;
        setToken: (token: TokenObject | string) => void;
        calendar: {
          events: {
            list: (params: CalendarListParams) => Promise<CalendarListResponse>;
            insert: (params: CalendarInsertParams) => Promise<CalendarEventResponse>;
            patch: (params: CalendarPatchParams) => Promise<CalendarEventResponse>;
            delete: (params: CalendarDeleteParams) => Promise<void>;
          };
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

interface TokenObject {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenObject) => void;
  prompt?: 'consent' | 'select_account' | 'none';
}

interface TokenClient {
  requestAccessToken: () => void;
  callback?: (response: TokenObject) => void;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

interface CreateCalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

interface CalendarListParams {
  calendarId: string;
  timeMin: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: string;
}

interface CalendarListResponse {
  result: {
    items: CalendarEvent[];
  };
}

interface CalendarInsertParams {
  calendarId: string;
  resource: CreateCalendarEvent;
}

interface CalendarPatchParams {
  calendarId: string;
  eventId: string;
  resource: Partial<CalendarEvent>;
}

interface CalendarDeleteParams {
  calendarId: string;
  eventId: string;
}

interface CalendarEventResponse {
  result: CalendarEvent;
}

interface GoogleApiError {
  status: number;
  message: string;
  result: {
    error: {
      code: number;
      message: string;
    };
  };
}

// Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];

class CalendarService {
  private tokenClient: TokenClient | null = null;
  private accessToken: string | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize() {
    try {
      // Try to restore token from localStorage
      const savedToken = localStorage.getItem('calendar_token');
      if (savedToken) {
        try {
          const tokenData = JSON.parse(savedToken);
          const expiryTime = tokenData.timestamp + (tokenData.expires_in * 1000);
          if (expiryTime > Date.now()) {
            this.accessToken = tokenData.access_token;
          } else {
            localStorage.removeItem('calendar_token');
          }
        } catch (error) {
          console.error('Error restoring token:', error);
          localStorage.removeItem('calendar_token');
        }
      }

      // Load both APIs concurrently
      await Promise.all([
        this.loadGoogleAPIClient(),
        this.loadGoogleAccountsLibrary()
      ]);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize calendar service:', error);
      throw error;
    }
  }

  private loadGoogleAPIClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            });
            if (this.accessToken) {
              window.gapi.client.setToken({ access_token: this.accessToken });
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = () => reject(new Error('Failed to load Google API client'));
      document.head.appendChild(script);
    });
  }

  private loadGoogleAccountsLibrary(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES.join(' '),
          callback: (response: TokenObject) => {
            if (response.access_token) {
              this.accessToken = response.access_token;
              localStorage.setItem('calendar_token', JSON.stringify({
                ...response,
                timestamp: Date.now()
              }));
              window.gapi.client.setToken(response);
            }
          },
        });
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Accounts library'));
      document.head.appendChild(script);
    });
  }

  async ensureInitialized() {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
  }

  async connect() {
    await this.ensureInitialized();
    
    if (!this.tokenClient) {
      throw new Error('Token client not initialized');
    }

    // Clear any existing token
    this.accessToken = null;
    localStorage.removeItem('calendar_token');
    window.gapi.client.setToken(null);

    return new Promise<void>((resolve) => {
      const tokenClient = this.tokenClient!;
      tokenClient.callback = (response: TokenObject) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
          localStorage.setItem('calendar_token', JSON.stringify({
            ...response,
            timestamp: Date.now()
          }));
          window.gapi.client.setToken(response);
        }
        resolve();
      };
      tokenClient.requestAccessToken();
    });
  }

  async disconnect() {
    await this.ensureInitialized();
    
    if (this.accessToken) {
      return new Promise<void>((resolve) => {
        window.google.accounts.oauth2.revoke(this.accessToken!, () => {
          this.accessToken = null;
          localStorage.removeItem('calendar_token');
          window.gapi.client.setToken({ access_token: '', token_type: '', expires_in: 0 });
          resolve();
        });
      });
    }
  }

  async listEvents(timeMin: Date = new Date()) {
    await this.ensureInitialized();
    
    if (!this.accessToken) {
      await this.connect();
      if (!this.accessToken) {
        throw new Error('Failed to authenticate with Google Calendar');
      }
    }

    try {
      // Ensure token is set
      window.gapi.client.setToken({ access_token: this.accessToken });
      
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      if (!response.result) {
        throw new Error('No response from Google Calendar API');
      }

      return response.result.items || [];
    } catch (error) {
      // If we get a 403, we need to re-authenticate
      const apiError = error as GoogleApiError;
      if (apiError.status === 403) {
        this.accessToken = null;
        localStorage.removeItem('calendar_token');
        throw new Error('Calendar access denied. Please reconnect to Google Calendar.');
      }
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  async createEvent(event: CreateCalendarEvent) {
    try {
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.result;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>) {
    try {
      const response = await window.gapi.client.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });

      return response.result;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return !!this.accessToken;
  }
}

export const calendarService = new CalendarService(); 