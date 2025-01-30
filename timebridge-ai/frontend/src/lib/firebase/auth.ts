import { getAuth, User } from 'firebase/auth';
import { app } from './config';

const auth = getAuth(app);

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  try {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
      return cachedToken;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      // Wait briefly to see if auth state is still initializing
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryUser = auth.currentUser as User | null;
      if (!retryUser) {
        console.debug('No user found after retry');
        return null;
      }
      const token = await retryUser.getIdToken(forceRefresh);
      // Cache token with 55 minute expiry (tokens typically last 1 hour)
      cachedToken = token;
      tokenExpiry = Date.now() + (55 * 60 * 1000);
      await createSession(token);
      return token;
    }
    
    const token = await currentUser.getIdToken(forceRefresh);
    cachedToken = token;
    tokenExpiry = Date.now() + (55 * 60 * 1000);
    await createSession(token);
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

async function createSession(idToken: string) {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
  } catch (error) {
    console.error('Session creation failed:', error);
    throw error;
  }
} 