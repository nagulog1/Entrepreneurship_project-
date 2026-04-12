/**
 * db.ts — Null-safe Firestore accessor.
 *
 * When Firebase isn't configured (no .env.local), returns a stub so
 * pages gracefully fall back to mock data instead of throwing.
 *
 * Usage:
 *   import { requireDb, getDbOrNull } from "@/lib/firebase/db";
 *
 *   const db = requireDb();   // throws if not configured (use in API routes)
 *   const db = getDbOrNull(); // returns null (use in UI code)
 */

import { getDb } from "@/lib/firebase";
import type { Firestore } from "firebase/firestore";

/**
 * Returns the Firestore instance.
 * Throws a descriptive error if Firebase is not configured.
 * Use in API routes where Firebase is required.
 */
export function requireDb(): Firestore {
  const db = getDb();
  if (!db) {
    throw new Error(
      "Firestore is not initialised. " +
      "Add NEXT_PUBLIC_FIREBASE_* variables to .env.local."
    );
  }
  return db;
}

/**
 * Returns the Firestore instance, or null if Firebase is not configured.
 * Use in UI code / data-fetching where you can fall back to mock data.
 */
export function getDbOrNull(): Firestore | null {
  return getDb();
}