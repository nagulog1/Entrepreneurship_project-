'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/types';

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserProfile({ id: uid, ...snap.data() } as User);
      }
    } catch (err) {
      console.error('[useAuth] fetchUserProfile error:', err);
    }
  }, []);

  useEffect(() => {
    // If Firebase wasn't initialised (missing env vars) skip listener
    if (!auth?.onAuthStateChanged) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await fetchUserProfile(fbUser.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  // ── helpers ──────────────────────────────────────────────────────────────────

  const friendlyError = (err: unknown): string => {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes('user-not-found') || msg.includes('wrong-password')) return 'Invalid email or password.';
      if (msg.includes('email-already-in-use')) return 'An account with this email already exists.';
      if (msg.includes('weak-password')) return 'Password must be at least 6 characters.';
      if (msg.includes('popup-closed-by-user')) return 'Sign-in popup was closed. Please try again.';
      if (msg.includes('network-request-failed')) return 'Network error. Check your connection.';
      return msg;
    }
    return 'An unexpected error occurred.';
  };

  const createUserDocument = async (
    fbUser: FirebaseUser,
    extra?: { displayName?: string }
  ) => {
    const name = extra?.displayName || fbUser.displayName || '';
    const userRef = doc(db, 'users', fbUser.uid);
    const data = {
      uid: fbUser.uid,
      email: fbUser.email ?? '',
      displayName: name,
      photoURL: fbUser.photoURL ?? '',
      phoneNumber: fbUser.phoneNumber ?? null,
      college: '',
      academicYear: '',
      course: '',
      branch: 'CSE',
      year: '1st',
      location: { city: '', state: '' },
      bio: '',
      skills: [],
      interests: [],
      preferredRoles: [],
      socialLinks: { github: '', linkedin: '', twitter: '', portfolio: '' },
      settings: {
        profileVisibility: 'public',
        notifications: {
          email: true,
          push: true,
          inApp: true,
          frequency: 'realtime',
          categories: {
            events: true,
            teams: true,
            challenges: true,
            achievements: true,
            social: true,
          },
        },
        theme: 'dark',
      },
      stats: {
        totalChallengesSolved: 0,
        easyCount: 0,
        mediumCount: 0,
        hardCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastSolvedDate: null,
        xp: 0,
        level: 1,
        rating: 1200,
        eventsParticipated: 0,
        eventsWon: 0,
        teamsFormed: 0,
        globalRank: 0,
        collegeRank: 0,
      },
      // Legacy fields — keep Zustand store happy
      name,
      avatar: name.charAt(0).toUpperCase() || 'U',
      color: '#6C3BFF',
      score: 0,
      solved: 0,
      streak: 0,
      badges: [],
      isPremium: false,
      premiumExpiresAt: null,
      reputation: 5.0,
      role: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(userRef, data);
    return data;
  };

  // ── public API ────────────────────────────────────────────────────────────────

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserProfile(result.user.uid);
      return result;
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await sendEmailVerification(result.user);
      await createUserDocument(result.user, { displayName });
      await fetchUserProfile(result.user.uid);
      return result;
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await createUserDocument(result.user);
      }
      await fetchUserProfile(result.user.uid);
      return result;
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const signInWithGithub = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await createUserDocument(result.user);
      }
      await fetchUserProfile(result.user.uid);
      return result;
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const refreshUserProfile = useCallback(() => {
    if (user) fetchUserProfile(user.uid);
  }, [user, fetchUserProfile]);

  return {
    user,
    userProfile,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGithub,
    signOut,
    resetPassword,
    refreshUserProfile,
    isAuthenticated: !!user,
  };
}
