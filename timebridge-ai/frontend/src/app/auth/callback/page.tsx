'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function CallbackPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const setupCalendar = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');

      if (!user) {
        console.error('No authenticated user');
        router.push('/profile?calendar=error');
        return;
      }

      try {
        // Get a fresh ID token
        const idToken = await user.getIdToken(true);
        
        const response = await fetch('http://127.0.0.1:8000/api/auth/setup-calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            auth_code: authCode
          })
        });

        const data = await response.json();
        if (data.status === 'success') {
          await fetch('/api/user/preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              calendarAccess: true
            })
          });
          
          router.push('/profile?calendar=success');
        } else {
          router.push('/profile?calendar=error');
        }
      } catch (error) {
        console.error('Setup error:', error);
        router.push('/profile?calendar=error');
      }
    };

    if (user) {
      setupCalendar();
    }
  }, [router, user]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-4">Setting up calendar access...</h1>
        <p className="text-gray-400">Please wait while we complete the setup.</p>
      </div>
    </div>
  );
} 