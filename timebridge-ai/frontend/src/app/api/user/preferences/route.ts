import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth, db } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('firebase-session');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await auth.verifySessionCookie(sessionCookie.value);
    const uid = decodedToken.uid;

    // Fetch user preferences from Firestore
    const userPrefs = await db.collection('userPreferences').doc(uid).get();
    
    if (!userPrefs.exists) {
      // Return default preferences if none exist
      return NextResponse.json({
        calendarAccess: false,
        lastUpdated: null
      });
    }

    return NextResponse.json(userPrefs.data());
  } catch (error) {
    console.error('Failed to fetch preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('firebase-session');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await auth.verifySessionCookie(sessionCookie.value);
    const uid = decodedToken.uid;
    const { calendarAccess } = await request.json();

    // Update user preferences in Firestore
    await db.collection('userPreferences').doc(uid).set({
      calendarAccess,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({
      calendarAccess,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 