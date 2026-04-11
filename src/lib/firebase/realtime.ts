import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  doc,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  User,
  TeamMessage,
  ContestLeaderboardEntry,
  Contest,
} from '@/types';

// ─── Real-Time Leaderboard ──────────────────────────────────────────────────

export function subscribeToGlobalLeaderboard(
  limitCount: number,
  callback: (users: User[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('stats.xp', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
      callback(users);
    }, (err) => {
      console.error('[realtime] leaderboard subscription error', err);
    });
  } catch {
    return () => {};
  }
}

// ─── Real-Time Contest Leaderboard ──────────────────────────────────────────

export function subscribeToContestLeaderboard(
  contestId: string,
  callback: (entries: ContestLeaderboardEntry[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'contests', contestId, 'leaderboard'),
      orderBy('score', 'desc'),
      orderBy('penalty', 'asc'),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const entries = snap.docs.map((d) => ({ ...d.data() } as ContestLeaderboardEntry));
      callback(entries);
    }, (err) => {
      console.error('[realtime] contest leaderboard subscription error', err);
    });
  } catch {
    return () => {};
  }
}

// ─── Real-Time Contest Status ───────────────────────────────────────────────

export function subscribeToContestStatus(
  contestId: string,
  callback: (contest: Contest | null) => void
): () => void {
  try {
    return onSnapshot(doc(db, 'contests', contestId), (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() } as Contest);
    }, (err) => {
      console.error('[realtime] contest status subscription error', err);
    });
  } catch {
    return () => {};
  }
}

// ─── Real-Time Team Chat ────────────────────────────────────────────────────

export function subscribeToTeamChat(
  teamId: string,
  callback: (messages: TeamMessage[]) => void,
  limitCount = 100
): () => void {
  try {
    const q = query(
      collection(db, 'teams', teamId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMessage));
      callback(messages);
    }, (err) => {
      console.error('[realtime] team chat subscription error', err);
    });
  } catch {
    return () => {};
  }
}

// ─── Real-Time User Presence ────────────────────────────────────────────────

export function subscribeToTeamPresence(
  teamId: string,
  callback: (onlineUserIds: string[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'teams', teamId, 'presence'),
      where('online', '==', true)
    );
    return onSnapshot(q, (snap) => {
      const userIds = snap.docs.map((d) => d.id);
      callback(userIds);
    }, (err) => {
      console.error('[realtime] presence subscription error', err);
    });
  } catch {
    return () => {};
  }
}

// ─── Real-Time Notifications ────────────────────────────────────────────────

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: Array<{ id: string; type: string; title: string; message: string; isRead: boolean; createdAt: unknown }>) => void,
  limitCount = 20
): () => void {
  try {
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snap) => {
      const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as {
        id: string; type: string; title: string; message: string; isRead: boolean; createdAt: unknown;
      }));
      callback(notifs);
    }, (err) => {
      console.error('[realtime] notifications subscription error', err);
    });
  } catch {
    return () => {};
  }
}

// ─── Real-Time Typing Indicator ─────────────────────────────────────────────

import { setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export async function setTypingStatus(
  teamId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const typingRef = doc(db, 'teams', teamId, 'typing', userId);
    if (isTyping) {
      await setDoc(typingRef, { userId, timestamp: serverTimestamp() });
    } else {
      await deleteDoc(typingRef);
    }
  } catch {}
}

export function subscribeToTypingIndicators(
  teamId: string,
  callback: (typingUserIds: string[]) => void
): () => void {
  try {
    return onSnapshot(
      collection(db, 'teams', teamId, 'typing'),
      (snap) => {
        const now = Date.now();
        const typingUsers = snap.docs
          .filter((d) => {
            const ts = d.data().timestamp?.toDate?.();
            return ts && now - ts.getTime() < 10000; // Only show if within 10s
          })
          .map((d) => d.id);
        callback(typingUsers);
      }
    );
  } catch {
    return () => {};
  }
}
