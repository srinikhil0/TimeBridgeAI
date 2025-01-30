import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIREBASE_PROJECT_ID) {
  throw new Error('Missing FIREBASE_PROJECT_ID');
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
  throw new Error('Missing FIREBASE_CLIENT_EMAIL');
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('Missing FIREBASE_PRIVATE_KEY');
}

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
};

// Initialize Firebase Admin if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app); 