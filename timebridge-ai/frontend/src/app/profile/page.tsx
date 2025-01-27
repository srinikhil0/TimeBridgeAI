'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserPreferences } from '@/types/user';
import Image from 'next/image';
import Link from 'next/link';
import { UserMenu } from '@/components/chat/UserMenu';

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences>({
    calendarAccess: false
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/user/preferences', {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch preferences');
        }
        const data = await response.json();
        setPreferences({
          calendarAccess: data.calendarAccess,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : undefined
        });
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      }
    };

    if (user) {
      fetchPreferences();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleCalendarConsent = async (consent: boolean) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarAccess: consent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(prev => ({
        ...prev,
        calendarAccess: data.calendarAccess,
        lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : undefined
      }));
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/chat"
              className="text-gray-300 hover:text-white transition-colors"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold gradient-text">TimeBridgeAI</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Existing content */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800/50 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white mb-8">Profile Settings</h1>
            
            {/* User Info */}
            <div className="mb-8">
              <div className="flex items-center gap-4">
                {user.photoURL && (
                  <Image 
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                )}
                <div>
                  <h2 className="text-xl font-medium text-white">
                    {user.displayName}
                  </h2>
                  <p className="text-gray-400">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Google Calendar Access Consent */}
            <div className="glass-effect p-6 rounded-xl mb-8">
              <h3 className="text-lg font-medium text-white mb-4">
                Google Calendar Access Permission
              </h3>
              <p className="text-gray-300 mb-6">
                Allow TimeBridgeAI to manage your Google Calendar. This integration enables:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
                <li>Real-time access to your Google Calendar events</li>
                <li>Creating and modifying events through AI conversations</li>
                <li>Smart scheduling based on your calendar availability</li>
                <li>Automated event management and updates</li>
              </ul>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleCalendarConsent(true)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    preferences.calendarAccess
                      ? 'bg-primary text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-primary/90'
                  }`}
                >
                  Allow Google Calendar Access
                </button>
                <button
                  onClick={() => handleCalendarConsent(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    !preferences.calendarAccess
                      ? 'bg-red-500/80 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-red-500/70'
                  }`}
                >
                  Revoke Access
                </button>
              </div>
              {preferences.lastUpdated && (
                <p className="text-sm text-gray-400 mt-4">
                  {preferences.calendarAccess 
                    ? `Google Calendar access granted on ${preferences.lastUpdated.toLocaleString()}`
                    : `Google Calendar access revoked on ${preferences.lastUpdated.toLocaleString()}`
                  }
                </p>
              )}
            </div>

            {/* Sign Out Section */}
            <div className="glass-effect p-6 rounded-xl">
              <h3 className="text-lg font-medium text-white mb-4">
                Account Actions
              </h3>
              <p className="text-gray-300 mb-6">
                Sign out from your account across all devices.
              </p>
              <button
                onClick={handleSignOut}
                className="px-6 py-2 bg-red-500/80 text-white rounded-lg 
                         hover:bg-red-500/70 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 