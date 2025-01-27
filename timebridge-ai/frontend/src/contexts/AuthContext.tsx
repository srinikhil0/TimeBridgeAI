'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ConsentDialog } from '@/components/auth/ConsentDialog';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  hasCalendarConsent: boolean;
  updateCalendarConsent: (consent: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [hasCalendarConsent, setHasCalendarConsent] = useState(false);

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('Preferences not found, using defaults');
        return { calendarAccess: false };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      return { calendarAccess: false };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setUser(user);
        if (user) {
          const prefs = await fetchUserPreferences();
          setHasCalendarConsent(prefs.calendarAccess || false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      }
    );
  
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Show consent dialog first
      setShowConsent(true);
      
    } catch {
      const errorMessage = 'Failed to sign in with Google';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentConfirm = async () => {
    setShowConsent(false);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Set the session cookie with credentials
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to set session');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setError('Failed to sign in after consent');
    }
  };

  const updateCalendarConsent = async (consent: boolean) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarAccess: consent }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      setHasCalendarConsent(consent);
    } catch (error) {
      console.error('Failed to update calendar consent:', error);
      throw error;
    }
  };

  return (
    <>
      <AuthContext.Provider 
        value={{ 
          user, 
          loading, 
          error, 
          signInWithGoogle,
          signOut: async () => await auth.signOut(),
          clearError: () => setError(null),
          hasCalendarConsent,
          updateCalendarConsent
        }}
      >
        {children}
      </AuthContext.Provider>
      
      <ConsentDialog
        isOpen={showConsent}
        onConfirm={handleConsentConfirm}
        onCancel={() => setShowConsent(false)}
      />
    </>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};