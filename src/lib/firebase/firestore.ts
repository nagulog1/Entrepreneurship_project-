import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  Event,
  Challenge,
  User,
  Team,
  TeamMessage,
  TeamRequest,
  ForumThread,
  ForumReply,
  LearningPath,
  Contest,
  ContestLeaderboardEntry,
  Submission,
  EventReview,
  FirestoreNotification,
  Mentorship,
} from '@/types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function safeSnap<T>(snap: import('firebase/firestore').DocumentSnapshot): T | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

function safeDocs<T>(snap: import('firebase/firestore').QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(filters?: {
  category?: string;
  mode?: string;
  status?: string;
  limitCount?: number;
}): Promise<Event[]> {
  try {
    const constraints: QueryConstraint[] = [];
    if (filters?.category) constraints.push(where('category', '==', filters.category));
    if (filters?.mode) constraints.push(where('mode', '==', filters.mode));
    if (filters?.status) constraints.push(where('status', '==', filters.status));
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(filters?.limitCount ?? 50));

    const q = query(collection(db, 'events'), ...constraints);
    const snap = await getDocs(q);
    return safeDocs<Event>(snap);
  } catch {
    return [];
  }
}

export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    return safeSnap<Event>(snap);
  } catch {
    return null;
  }
}

export async function createEvent(data: Partial<Event>, userId: string): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), {
    ...data,
    createdBy: userId,
    registrationCount: 0,
    viewCount: 0,
    averageRating: 0,
    reviewCount: 0,
    isFeatured: false,
    isTrending: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function registerForEvent(
  eventId: string,
  userId: string,
  teamId?: string
): Promise<void> {
  // Fetch event details for context
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);
  const eventData = eventSnap.exists() ? eventSnap.data() : null;
  const eventTitle = eventData?.title || eventId;

  const regRef = doc(db, 'events', eventId, 'registrations', userId);
  const studentRegRef = doc(db, 'studentRegistrations', `${userId}_${eventId}`);

  await setDoc(regRef, {
    userId,
    eventId,
    eventTitle,
    teamId: teamId ?? null,
    registeredAt: serverTimestamp(),
    status: 'registered',
  });

  await setDoc(studentRegRef, {
    eventId,
    eventTitle,
    userId,
    teamId: teamId ?? null,
    registeredAt: serverTimestamp(),
    status: 'registered',
  });

  // Use setDoc with merge to upsert the event doc if it doesn't exist
  await setDoc(
    eventRef,
    { registrationCount: increment(1) },
    { merge: true }
  );
}

export async function unregisterFromEvent(eventId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId, 'registrations', userId));
  await deleteDoc(doc(db, 'studentRegistrations', `${userId}_${eventId}`));
  // Use setDoc with merge to safely decrement even if doc is missing
  await setDoc(
    doc(db, 'events', eventId),
    { registrationCount: increment(-1) },
    { merge: true }
  );
}

export async function checkEventRegistration(
  eventId: string,
  userId: string
): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'events', eventId, 'registrations', userId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function addEventReview(
  eventId: string,
  review: Partial<EventReview>
): Promise<void> {
  await addDoc(collection(db, 'events', eventId, 'reviews'), {
    ...review,
    helpful: 0,
    notHelpful: 0,
    createdAt: serverTimestamp(),
  });
  // Update average rating
  const reviews = await getEventReviews(eventId);
  const avg = reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length;
  await updateDoc(doc(db, 'events', eventId), {
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: reviews.length,
  });
}

export async function getEventReviews(eventId: string): Promise<EventReview[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'events', eventId, 'reviews'),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
    );
    return safeDocs<EventReview>(snap);
  } catch {
    return [];
  }
}

export async function bookmarkItem(
  userId: string,
  itemId: string,
  type: 'event' | 'challenge'
): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'bookmarks', itemId), {
    type,
    itemId,
    createdAt: serverTimestamp(),
  });
}

export async function unbookmarkItem(userId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'bookmarks', itemId));
}

export async function getUserBookmarks(userId: string): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'bookmarks'));
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

export async function incrementEventViewCount(eventId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'events', eventId),
      { viewCount: increment(1) },
      { merge: true }
    );
  } catch {}
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export async function getChallenges(filters?: {
  difficulty?: string;
  topic?: string;
  domain?: string;
  isPremium?: boolean;
  limitCount?: number;
}): Promise<Challenge[]> {
  try {
    const constraints: QueryConstraint[] = [];
    if (filters?.difficulty) constraints.push(where('difficulty', '==', filters.difficulty));
    if (filters?.domain) constraints.push(where('domain', '==', filters.domain));
    if (filters?.isPremium !== undefined)
      constraints.push(where('isPremium', '==', filters.isPremium));
    constraints.push(limit(filters?.limitCount ?? 100));

    const q = query(collection(db, 'challenges'), ...constraints);
    const snap = await getDocs(q);
    return safeDocs<Challenge>(snap);
  } catch {
    return [];
  }
}

export async function getChallengeById(challengeId: string): Promise<Challenge | null> {
  try {
    const snap = await getDoc(doc(db, 'challenges', challengeId));
    return safeSnap<Challenge>(snap);
  } catch {
    return null;
  }
}

export async function submitChallenge(
  userId: string,
  submission: Partial<Submission>
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'users', userId, 'submissions'),
    {
      ...submission,
      submittedAt: serverTimestamp(),
    }
  );
  // Update challenge stats
  if (submission.challengeId && submission.status === 'accepted') {
    try {
      await updateDoc(doc(db, 'challenges', submission.challengeId), {
        totalSubmissions: increment(1),
        totalSolved: increment(1),
      });
    } catch {}
  }
  return ref.id;
}

export async function getUserSubmissionsForChallenge(
  userId: string,
  challengeId: string
): Promise<Submission[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'submissions'),
      where('challengeId', '==', challengeId),
      orderBy('submittedAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return safeDocs<Submission>(snap);
  } catch {
    return [];
  }
}

export async function getChallengeDiscussions(challengeId: string): Promise<unknown[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'challenges', challengeId, 'discussions'),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
    );
    return safeDocs<unknown>(snap);
  } catch {
    return [];
  }
}

export async function addChallengeDiscussion(
  challengeId: string,
  userId: string,
  content: string,
  userInfo: { name: string; photo: string }
): Promise<void> {
  await addDoc(collection(db, 'challenges', challengeId, 'discussions'), {
    userId,
    userName: userInfo.name,
    userPhoto: userInfo.photo,
    content,
    upvotes: 0,
    downvotes: 0,
    isAnswer: false,
    createdAt: serverTimestamp(),
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return safeSnap<User>(snap);
  } catch {
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  data: Partial<User>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserStats(
  userId: string,
  updates: Record<string, unknown>
): Promise<void> {
  try {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      mapped[`stats.${key}`] = value;
    }
    mapped['updatedAt'] = serverTimestamp();
    await updateDoc(doc(db, 'users', userId), mapped);
  } catch {}
}

export async function getLeaderboard(limitCount = 50): Promise<User[]> {
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('stats.xp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return safeDocs<User>(snap);
  } catch {
    return [];
  }
}

export async function getUserNotifications(
  userId: string,
  limitCount = 30
): Promise<FirestoreNotification[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return safeDocs<FirestoreNotification>(snap);
  } catch {
    return [];
  }
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  try {
    await updateDoc(
      doc(db, 'users', userId, 'notifications', notificationId),
      { isRead: true }
    );
  } catch {}
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users', userId, 'notifications'),
        where('isRead', '==', false)
      )
    );
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  } catch {}
}

export async function getUserActivity(userId: string): Promise<unknown[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'activityFeed'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return safeDocs<unknown>(snap);
  } catch {
    return [];
  }
}

export async function addUserActivity(
  userId: string,
  activity: Record<string, unknown>
): Promise<void> {
  try {
    await addDoc(collection(db, 'users', userId, 'activityFeed'), {
      ...activity,
      createdAt: serverTimestamp(),
    });
  } catch {}
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function createTeam(
  data: Partial<Team>,
  userId: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'teams'), {
    ...data,
    createdBy: userId,
    members: [{ userId, role: 'leader', joinedAt: serverTimestamp() }],
    memberIds: [userId],
    status: 'forming',
    chat: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  try {
    const snap = await getDoc(doc(db, 'teams', teamId));
    return safeSnap<Team>(snap);
  } catch {
    return null;
  }
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  try {
    const q = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', userId),
      limit(10)
    );
    const snap = await getDocs(q);
    return safeDocs<Team>(snap);
  } catch {
    return [];
  }
}

export async function getOpenTeams(limitCount = 20): Promise<Team[]> {
  try {
    const q = query(
      collection(db, 'teams'),
      where('status', '==', 'forming'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return safeDocs<Team>(snap);
  } catch {
    return [];
  }
}

export async function joinTeam(teamId: string, userId: string): Promise<void> {
  // serverTimestamp() is not allowed inside arrayUnion object elements,
  // so we use Timestamp.now() (client-side) for the joinedAt field.
  const { Timestamp } = await import('firebase/firestore');
  await updateDoc(doc(db, 'teams', teamId), {
    members: arrayUnion({ userId, role: 'member', joinedAt: Timestamp.now() }),
    memberIds: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const team = await getTeamById(teamId);
  if (!team) return;
  const newMembers = team.members.filter((m) => m.userId !== userId);
  const newMemberIds = (team.memberIds ?? team.members.map((m) => m.userId)).filter((id) => id !== userId);
  await updateDoc(doc(db, 'teams', teamId), {
    members: newMembers,
    memberIds: newMemberIds,
    updatedAt: serverTimestamp(),
  });
}

export async function sendTeamJoinRequest(
  teamId: string,
  request: Partial<{ fromUserId: string; fromUserName: string; fromUserPhoto: string; message: string }>
): Promise<void> {
  await addDoc(collection(db, 'teams', teamId, 'requests'), {
    ...request,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getTeamMessages(
  teamId: string,
  limitCount = 30
): Promise<TeamMessage[]> {
  try {
    const q = query(
      collection(db, 'teams', teamId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return safeDocs<TeamMessage>(snap);
  } catch {
    return [];
  }
}

export async function sendTeamMessage(
  teamId: string,
  message: Partial<TeamMessage>
): Promise<void> {
  await addDoc(collection(db, 'teams', teamId, 'messages'), {
    ...message,
    type: message.type ?? 'text',
    createdAt: serverTimestamp(),
  });
}

export function subscribeToTeamMessages(
  teamId: string,
  callback: (messages: TeamMessage[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'teams', teamId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      callback(safeDocs<TeamMessage>(snap));
    });
  } catch {
    return () => {};
  }
}

export async function getTeamRequests(filters?: { status?: string }): Promise<TeamRequest[]> {
  try {
    const constraints: QueryConstraint[] = [];
    constraints.push(where('status', '==', filters?.status ?? 'open'));
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(30));
    const q = query(collection(db, 'teamRequests'), ...constraints);
    const snap = await getDocs(q);
    return safeDocs<TeamRequest>(snap);
  } catch {
    return [];
  }
}

export async function createTeamRequest(
  request: Partial<TeamRequest>
): Promise<string> {
  const ref = await addDoc(collection(db, 'teamRequests'), {
    ...request,
    responses: 0,
    status: 'open',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Forum ────────────────────────────────────────────────────────────────────

export async function getForumThreads(
  category?: string,
  limitCount = 30
): Promise<ForumThread[]> {
  try {
    const constraints: QueryConstraint[] = [];
    if (category && category !== 'all') {
      constraints.push(where('category', '==', category));
    }
    constraints.push(orderBy('isPinned', 'desc'));
    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(limitCount));
    const q = query(collection(db, 'forumThreads'), ...constraints);
    const snap = await getDocs(q);
    return safeDocs<ForumThread>(snap);
  } catch {
    return [];
  }
}

export async function getForumThreadById(
  threadId: string
): Promise<ForumThread | null> {
  try {
    const snap = await getDoc(doc(db, 'forumThreads', threadId));
    return safeSnap<ForumThread>(snap);
  } catch {
    return null;
  }
}

export async function createForumThread(
  data: Partial<ForumThread>
): Promise<string> {
  const ref = await addDoc(collection(db, 'forumThreads'), {
    ...data,
    views: 0,
    replies: 0,
    upvotes: 0,
    downvotes: 0,
    isSolved: false,
    isPinned: false,
    isLocked: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getThreadReplies(threadId: string): Promise<ForumReply[]> {
  try {
    const q = query(
      collection(db, 'forumThreads', threadId, 'replies'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return safeDocs<ForumReply>(snap);
  } catch {
    return [];
  }
}

export async function addThreadReply(
  threadId: string,
  reply: Partial<ForumReply>
): Promise<void> {
  await addDoc(collection(db, 'forumThreads', threadId, 'replies'), {
    ...reply,
    upvotes: 0,
    downvotes: 0,
    isBestAnswer: false,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'forumThreads', threadId), {
    replies: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function upvoteThread(threadId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'forumThreads', threadId), {
      upvotes: increment(1),
    });
  } catch {}
}

export async function incrementThreadViews(threadId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'forumThreads', threadId), {
      views: increment(1),
    });
  } catch {}
}

// ─── Learning Paths ───────────────────────────────────────────────────────────

export async function getLearningPaths(): Promise<LearningPath[]> {
  try {
    const snap = await getDocs(collection(db, 'learningPaths'));
    return safeDocs<LearningPath>(snap);
  } catch {
    return [];
  }
}

export async function getLearningPathById(
  pathId: string
): Promise<LearningPath | null> {
  try {
    const snap = await getDoc(doc(db, 'learningPaths', pathId));
    return safeSnap<LearningPath>(snap);
  } catch {
    return null;
  }
}

export async function enrollInLearningPath(
  pathId: string,
  userId: string
): Promise<void> {
  await setDoc(doc(db, 'learningPaths', pathId, 'enrollments', userId), {
    enrolledAt: serverTimestamp(),
    completedChallenges: [],
    progress: 0,
    lastAccessedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'learningPaths', pathId), {
    enrolledCount: increment(1),
  });
}

export async function getUserEnrollments(userId: string): Promise<unknown[]> {
  try {
    const paths = await getLearningPaths();
    const enrollments: unknown[] = [];
    for (const path of paths) {
      const snap = await getDoc(
        doc(db, 'learningPaths', path.id, 'enrollments', userId)
      );
      if (snap.exists()) {
        enrollments.push({ pathId: path.id, path, ...snap.data() });
      }
    }
    return enrollments;
  } catch {
    return [];
  }
}

export async function updateLearningProgress(
  pathId: string,
  userId: string,
  challengeId: string
): Promise<void> {
  try {
    const path = await getLearningPathById(pathId);
    const enrollRef = doc(db, 'learningPaths', pathId, 'enrollments', userId);
    const enrollSnap = await getDoc(enrollRef);
    if (!enrollSnap.exists()) return;
    const data = enrollSnap.data();
    const completed: string[] = data.completedChallenges ?? [];
    if (!completed.includes(challengeId)) {
      completed.push(challengeId);
    }
    const total = path?.challenges.length ?? 1;
    const progress = Math.round((completed.length / total) * 100);
    await updateDoc(enrollRef, {
      completedChallenges: completed,
      progress,
      lastAccessedAt: serverTimestamp(),
    });
  } catch {}
}

// ─── Contests ─────────────────────────────────────────────────────────────────

export async function getContests(): Promise<Contest[]> {
  try {
    const q = query(
      collection(db, 'contests'),
      orderBy('startTime', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return safeDocs<Contest>(snap);
  } catch {
    return [];
  }
}

export async function getContestById(contestId: string): Promise<Contest | null> {
  try {
    const snap = await getDoc(doc(db, 'contests', contestId));
    return safeSnap<Contest>(snap);
  } catch {
    return null;
  }
}

export async function getContestLeaderboard(
  contestId: string
): Promise<ContestLeaderboardEntry[]> {
  try {
    const q = query(
      collection(db, 'contests', contestId, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return safeDocs<ContestLeaderboardEntry>(snap);
  } catch {
    return [];
  }
}

export function subscribeToContestLeaderboard(
  contestId: string,
  callback: (entries: ContestLeaderboardEntry[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'contests', contestId, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      callback(safeDocs<ContestLeaderboardEntry>(snap));
    });
  } catch {
    return () => {};
  }
}

// ─── Global / Admin ───────────────────────────────────────────────────────────

export async function getGlobalStats(): Promise<{
  totalUsers: number;
  totalEvents: number;
  totalChallenges: number;
  totalSubmissions: number;
  totalTeams: number;
}> {
  try {
    const snap = await getDoc(doc(db, 'stats', 'global'));
    if (snap.exists()) return snap.data() as ReturnType<typeof getGlobalStats> extends Promise<infer T> ? T : never;
  } catch {}
  return {
    totalUsers: 0,
    totalEvents: 0,
    totalChallenges: 0,
    totalSubmissions: 0,
    totalTeams: 0,
  };
}

export async function getAdminConfig(): Promise<unknown> {
  try {
    const snap = await getDoc(doc(db, 'adminConfig', 'main'));
    return snap.exists() ? snap.data() : {};
  } catch {
    return {};
  }
}

export async function getDailyChallenge(): Promise<Challenge | null> {
  try {
    const config = (await getAdminConfig()) as Record<string, unknown>;
    const challengeId = config?.dailyChallenge as string | undefined;
    if (!challengeId) return null;
    return getChallengeById(challengeId);
  } catch {
    return null;
  }
}

// ─── Mentorship ───────────────────────────────────────────────────────────────

export async function getMentors(): Promise<User[]> {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'mentor'),
      limit(20)
    );
    const snap = await getDocs(q);
    return safeDocs<User>(snap);
  } catch {
    return [];
  }
}

export async function requestMentorship(
  data: Partial<Mentorship>
): Promise<string> {
  const ref = await addDoc(collection(db, 'mentorships'), {
    ...data,
    status: 'requested',
    startedAt: null,
    completedAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserMentorships(userId: string): Promise<Mentorship[]> {
  try {
    const q = query(
      collection(db, 'mentorships'),
      where('menteeId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return safeDocs<Mentorship>(snap);
  } catch {
    return [];
  }
}
