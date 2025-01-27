'use client';

import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

export function UserMenu() {
  const { user } = useAuth();
  
  return (
    <div className="flex items-center">
      {user?.photoURL && (
        <Link href="/profile">
          <Image 
            src={user.photoURL}
            alt="Profile"
            width={32}
            height={32}
            className="rounded-full cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          />
        </Link>
      )}
    </div>
  );
}