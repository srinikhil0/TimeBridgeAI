'use client';

import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export function UserMenu() {
  const { user, signOut } = useAuth();
  
  return (
    <div className="flex items-center gap-4">
      {user?.photoURL && (
        <Image 
          src={user.photoURL}
          alt="Profile"
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <button
        onClick={signOut}
        className="px-4 py-2 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}