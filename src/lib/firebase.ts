/**
 * firebase.ts — Client-side Firebase SDK initialisation.
 *
 * Safe to import anywhere (client + server components, API routes).
 * When Firebase env vars are not configured it returns stub objects so the
 * rest of the app can run in "offline / static" mode without throwing.
 *
 * Replace your existing src/lib/firebase.ts with this file.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  type Auth,
} from "firebase/auth";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";
import {
  getAnalytics,
  isSupported,
  type Analytics,
} from "firebase/analytics";

// ─── Config ───────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/** True when all required Firebase vars are present. */
export const isFirebaseReady =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.authDomain;

// ─── Initialise (once) ────────────────────────────────────────────────────────

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _storage: FirebaseStorage | null = null;
let _analytics: Analytics | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseReady) return null;

  try {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return _app;
  } catch (err) {
    console.warn("[Firebase] Initialisation failed. Running in offline/static mode.", err);
    return null;
  }
}

// Initialise eagerly (but safely)
const app = getFirebaseApp();

// ─── Service accessors ────────────────────────────────────────────────────────

export function getDb(): Firestore | null {
  if (_db) return _db;
  if (!app) return null;

  try {
    _db = getFirestore(app);

    // Connect to local emulator in development when flag is set
    if (
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
      typeof window !== "undefined"
    ) {
      connectFirestoreEmulator(_db, "localhost", 8080);
    }

    return _db;
  } catch (err) {
    console.warn("[Firebase] Firestore init failed:", err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;
  if (!app) return null;

  try {
    _auth = getAuth(app);

    if (
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
      typeof window !== "undefined"
    ) {
      connectAuthEmulator(_auth, "http://localhost:9099", { disableWarnings: true });
    }

    return _auth;
  } catch (err) {
    console.warn("[Firebase] Auth init failed:", err);
    return null;
  }
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (_storage) return _storage;
  if (!app) return null;

  try {
    _storage = getStorage(app);

    if (
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
      typeof window !== "undefined"
    ) {
      connectStorageEmulator(_storage, "localhost", 9199);
    }

    return _storage;
  } catch (err) {
    console.warn("[Firebase] Storage init failed:", err);
    return null;
  }
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (_analytics) return _analytics;
  if (!app) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;
    _analytics = getAnalytics(app);
    return _analytics;
  } catch {
    return null;
  }
}

// ─── Convenience re-exports ───────────────────────────────────────────────────
// Your existing code may import `db` and `auth` directly.
// These are the same objects — just lazily initialised.

/** Firestore instance. null when Firebase is not configured. */
export const db = getDb();

/** Firebase Auth instance. null when Firebase is not configured. */
export const auth = getFirebaseAuth();

/** Firebase Storage instance. null when Firebase is not configured. */
export const storage = getFirebaseStorage();

export { app };
export default app;