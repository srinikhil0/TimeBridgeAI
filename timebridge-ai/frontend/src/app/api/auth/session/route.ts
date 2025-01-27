import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    // Create session cookie with Firebase Admin
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('firebase-session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn / 1000, // Convert to seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
} 