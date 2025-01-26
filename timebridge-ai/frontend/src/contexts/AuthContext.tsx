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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
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
      // Add calendar scopes
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      // Set the session cookie
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      setError('Failed to sign in after consent');
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
          clearError: () => setError(null)
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