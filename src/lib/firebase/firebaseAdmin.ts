// This file runs SERVER-SIDE ONLY (API routes, Server Components)
// Never import this in client components

let adminDb: import('firebase-admin').firestore.Firestore;
let adminAuth: import('firebase-admin').auth.Auth;
let adminStorage: import('firebase-admin').storage.Storage;

try {
  const admin = require('firebase-admin');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  adminDb = admin.firestore();
  adminAuth = admin.auth();
  adminStorage = admin.storage();
} catch (err) {
  console.warn('[Firebase Admin] Initialization failed.', err);
}

export { adminDb, adminAuth, adminStorage };
