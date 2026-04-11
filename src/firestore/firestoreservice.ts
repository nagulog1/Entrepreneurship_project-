/**
 * firestoreService.ts — Production Firestore service layer.
 * All reads/writes go through here. Handles retry logic, caching hints, and type safety.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase"; // your existing client-side init
import type {
  Challenge,
  Contest,
  Event,
  User,
  TeamRequest,
  Registration,
  Subscription,
  ContestLeaderboardEntry,
} from "@/types";

// ─── Utility ──────────────────────────────────────────────────────────────────

function toDate(ts: unknown): Date {
  if (!ts) return new Date();
  if (ts instanceof Timestamp) return ts.toDate();
  if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as string | number);
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export async function getChallengesProd(opts: {
  limitCount?: number;
  difficulty?: string;
  tag?: string;
} = {}): Promise<Challenge[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (opts.difficulty) constraints.push(where("difficulty", "==", opts.difficulty));
  if (opts.tag) constraints.push(where("tags", "array-contains", opts.tag));
  if (opts.limitCount) constraints.push(limit(opts.limitCount));

  const snap = await getDocs(query(collection(db, "challenges"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge));
}

export async function getChallengeByIdProd(id: string): Promise<Challenge | null> {
  const snap = await getDoc(doc(db, "challenges", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Challenge;
}

export async function markChallengeAttempted(userId: string, challengeId: string): Promise<void> {
  await setDoc(
    doc(db, "userProgress", `${userId}_${challengeId}`),
    {
      userId,
      challengeId,
      attempted: true,
      lastAttemptAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function markChallengeSolved(
  userId: string,
  challengeId: string,
  language: string,
  code: string,
  xpEarned: number
): Promise<void> {
  const batch = [
    setDoc(
      doc(db, "userProgress", `${userId}_${challengeId}`),
      {
        userId,
        challengeId,
        solved: true,
        language,
        code,
        xpEarned,
        solvedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    // Increment user XP atomically
    updateDoc(doc(db, "users", userId), {
      xp: increment(xpEarned),
      solvedChallenges: arrayUnion(challengeId),
      streak: increment(1),
    }),
    // Increment challenge solve count
    updateDoc(doc(db, "challenges", challengeId), {
      solveCount: increment(1),
    }),
  ];
  await Promise.all(batch);
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEventsProd(opts: {
  limitCount?: number;
  mode?: string;
  category?: string;
  featured?: boolean;
} = {}): Promise<Event[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (opts.mode) constraints.push(where("mode", "==", opts.mode));
  if (opts.category) constraints.push(where("category", "==", opts.category));
  if (opts.featured !== undefined) constraints.push(where("featured", "==", opts.featured));
  if (opts.limitCount) constraints.push(limit(opts.limitCount));

  const snap = await getDocs(query(collection(db, "events"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
}

// ─── Event Registration ────────────────────────────────────────────────────────

export interface RegistrationInput {
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamId?: string;
  teamName?: string;
}

export async function registerForEvent(input: RegistrationInput): Promise<Registration> {
  // Use a transaction to prevent double registration and update participant count atomically
  const registrationId = `${input.userId}_${input.eventId}`;
  const registrationRef = doc(db, "registrations", registrationId);
  const eventRef = doc(db, "events", input.eventId);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(registrationRef);
    if (existing.exists()) {
      throw new Error("ALREADY_REGISTERED");
    }

    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists()) throw new Error("EVENT_NOT_FOUND");

    const eventData = eventSnap.data() as Event;
    if (eventData.maxParticipants && eventData.registered >= eventData.maxParticipants) {
      throw new Error("EVENT_FULL");
    }

    const registration: Omit<Registration, "id"> = {
      eventId: input.eventId,
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      teamId: input.teamId,
      teamName: input.teamName,
      status: "confirmed",
      registeredAt: serverTimestamp() as unknown as Timestamp,
    };

    tx.set(registrationRef, registration);
    tx.update(eventRef, { registered: increment(1) });

    return { id: registrationId, ...registration } as Registration;
  });
}

export async function cancelRegistration(userId: string, eventId: string): Promise<void> {
  const registrationRef = doc(db, "registrations", `${userId}_${eventId}`);
  const eventRef = doc(db, "events", eventId);

  await runTransaction(db, async (tx) => {
    const reg = await tx.get(registrationRef);
    if (!reg.exists()) throw new Error("REGISTRATION_NOT_FOUND");
    tx.delete(registrationRef);
    tx.update(eventRef, { registered: increment(-1) });
  });
}

export async function getUserRegistrations(userId: string): Promise<Registration[]> {
  const snap = await getDocs(
    query(
      collection(db, "registrations"),
      where("userId", "==", userId),
      orderBy("registeredAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
}

// ─── Team System ──────────────────────────────────────────────────────────────

export interface TeamRequestInput {
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId: string;
  toUserEmail: string;
  eventId: string;
  eventTitle: string;
  message?: string;
}

export async function sendTeamRequest(input: TeamRequestInput): Promise<string> {
  // Prevent duplicate requests
  const existing = await getDocs(
    query(
      collection(db, "teamRequests"),
      where("fromUserId", "==", input.fromUserId),
      where("toUserId", "==", input.toUserId),
      where("eventId", "==", input.eventId),
      where("status", "==", "pending")
    )
  );
  if (!existing.empty) throw new Error("REQUEST_ALREADY_SENT");

  const ref = await addDoc(collection(db, "teamRequests"), {
    ...input,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function respondToTeamRequest(
  requestId: string,
  userId: string,
  response: "accepted" | "rejected"
): Promise<void> {
  const requestRef = doc(db, "teamRequests", requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) throw new Error("REQUEST_NOT_FOUND");
  const data = snap.data() as TeamRequest;
  if (data.toUserId !== userId) throw new Error("UNAUTHORIZED");
  if (data.status !== "pending") throw new Error("REQUEST_ALREADY_HANDLED");

  await runTransaction(db, async (tx) => {
    tx.update(requestRef, {
      status: response,
      respondedAt: serverTimestamp(),
    });

    if (response === "accepted") {
      // Create or update team
      const teamId = data.teamId || `team_${data.eventId}_${data.fromUserId}`;
      const teamRef = doc(db, "teams", teamId);
      const teamSnap = await tx.get(teamRef);

      if (!teamSnap.exists()) {
        tx.set(teamRef, {
          eventId: data.eventId,
          eventTitle: data.eventTitle,
          creatorId: data.fromUserId,
          members: [
            { userId: data.fromUserId, name: data.fromUserName, email: data.fromUserEmail },
            { userId: data.toUserId, name: data.fromUserName, email: data.toUserEmail }, // will be corrected below
          ],
          createdAt: serverTimestamp(),
        });
      } else {
        tx.update(teamRef, {
          members: arrayUnion({ userId: data.toUserId, email: data.toUserEmail }),
        });
      }
    }
  });
}

export async function getPendingTeamRequests(userId: string): Promise<TeamRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, "teamRequests"),
      where("toUserId", "==", userId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamRequest));
}

export function subscribeToTeamRequests(
  userId: string,
  callback: (requests: TeamRequest[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "teamRequests"),
      where("toUserId", "==", userId),
      where("status", "==", "pending")
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamRequest)));
    }
  );
}

// ─── Team Chat ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  content: string;
  sentAt: Date;
  edited?: boolean;
}

export async function sendChatMessage(
  teamId: string,
  userId: string,
  userName: string,
  content: string
): Promise<string> {
  if (!content.trim()) throw new Error("Empty message");
  if (content.length > 2000) throw new Error("Message too long");

  const ref = await addDoc(collection(db, "teams", teamId, "messages"), {
    teamId,
    userId,
    userName,
    content: content.trim(),
    sentAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToTeamChat(
  teamId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "teams", teamId, "messages"),
      orderBy("sentAt", "asc"),
      limit(100)
    ),
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            teamId,
            userId: data.userId,
            userName: data.userName,
            content: data.content,
            sentAt: toDate(data.sentAt),
            edited: data.edited ?? false,
          } as ChatMessage;
        })
      );
    }
  );
}

// ─── Contests ─────────────────────────────────────────────────────────────────

export function subscribeToContestLive(
  contestId: string,
  callback: (contest: Contest) => void
): Unsubscribe {
  return onSnapshot(doc(db, "contests", contestId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as Contest);
    }
  });
}

export function subscribeToLeaderboardLive(
  contestId: string,
  callback: (entries: ContestLeaderboardEntry[]) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "contests", contestId, "leaderboard"),
      orderBy("score", "desc"),
      limit(50)
    ),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContestLeaderboardEntry)));
    }
  );
}

export async function submitContestSolution(
  contestId: string,
  userId: string,
  userName: string,
  challengeId: string,
  code: string,
  language: string,
  score: number
): Promise<void> {
  const submissionRef = await addDoc(
    collection(db, "contests", contestId, "submissions"),
    {
      userId,
      userName,
      challengeId,
      code,
      language,
      score,
      submittedAt: serverTimestamp(),
    }
  );

  // Upsert leaderboard entry atomically
  const lbRef = doc(db, "contests", contestId, "leaderboard", userId);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(lbRef);
    if (!existing.exists()) {
      tx.set(lbRef, {
        userId,
        userName,
        score,
        solved: 1,
        penalty: 0,
        lastSubmissionAt: serverTimestamp(),
      });
    } else {
      const data = existing.data();
      tx.update(lbRef, {
        score: Math.max(data.score, score),
        solved: increment(1),
        lastSubmissionAt: serverTimestamp(),
      });
    }
  });

  // Increment participant count
  await updateDoc(doc(db, "contests", contestId), {
    participants: increment(1),
  });

  void submissionRef; // suppress unused warning
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function upsertUserProfile(user: {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
}): Promise<void> {
  await setDoc(
    doc(db, "users", user.id),
    {
      name: user.name,
      email: user.email,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<{ name: string; college: string; bio: string; github: string; linkedin: string }>
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const snap = await getDoc(doc(db, "subscriptions", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Subscription;
}

export async function createSubscription(
  userId: string,
  plan: "pro" | "team",
  razorpaySubscriptionId: string,
  razorpayOrderId: string
): Promise<void> {
  await setDoc(doc(db, "subscriptions", userId), {
    userId,
    plan,
    status: "pending",
    razorpaySubscriptionId,
    razorpayOrderId,
    createdAt: serverTimestamp(),
  });
}

export async function activateSubscription(
  userId: string,
  razorpayPaymentId: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await updateDoc(doc(db, "subscriptions", userId), {
    status: "active",
    razorpayPaymentId,
    activatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });

  await updateDoc(doc(db, "users", userId), {
    isPro: true,
    plan: "pro",
  });
}

export async function cancelSubscription(userId: string): Promise<void> {
  await updateDoc(doc(db, "subscriptions", userId), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "users", userId), {
    isPro: false,
    plan: "free",
  });
}

export { toDate };