import * as functions from 'firebase-functions/v1';
import { admin, db } from './admin';
import { sendPushNotification } from './notifications';

async function updateStreak(userId: string): Promise<void> {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) return;

  const data = snap.data() ?? {};
  const lastSolvedRaw = data.stats?.lastSolvedDate;
  let currentStreak = data.stats?.currentStreak ?? 0;
  let longestStreak = data.stats?.longestStreak ?? 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (lastSolvedRaw?.toDate) {
    const lastSolvedDate = lastSolvedRaw.toDate();
    const lastDay = new Date(lastSolvedDate.getFullYear(), lastSolvedDate.getMonth(), lastSolvedDate.getDate());
    const diffDays = Math.round((today.getTime() - lastDay.getTime()) / 86400000);
    if (diffDays === 1) {
      currentStreak += 1;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  if (currentStreak > longestStreak) longestStreak = currentStreak;

  await userRef.update({
    'stats.currentStreak': currentStreak,
    'stats.longestStreak': longestStreak,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function checkAndAwardBadges(_userId: string): Promise<void> {
  // Placeholder for badge evaluation logic
}

async function checkAchievements(_userId: string, _type: string, _metadata: Record<string, unknown>): Promise<void> {
  // Placeholder for achievement orchestration
}

export const onChallengeSubmission = functions.firestore
  .document('users/{userId}/submissions/{submissionId}')
  .onCreate(async (snap, context) => {
    const submission = snap.data();
    const userId = context.params.userId as string;
    const challengeId = submission.challengeId as string | undefined;

    if (!challengeId) return;

    const userRef = db.collection('users').doc(userId);
    const challengeRef = db.collection('challenges').doc(challengeId);

    const challengeSnap = await challengeRef.get();
    const challenge = challengeSnap.data() ?? {};
    const difficulty = String(challenge.difficulty ?? '').toLowerCase();

    const challengeUpdates: Record<string, unknown> = {
      totalSubmissions: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (submission.status === 'accepted') {
      challengeUpdates.totalSolved = admin.firestore.FieldValue.increment(1);
    }

    await challengeRef.set(challengeUpdates, { merge: true });

    if (submission.status !== 'accepted') return;

    const userUpdates: Record<string, unknown> = {
      'stats.totalChallengesSolved': admin.firestore.FieldValue.increment(1),
      'stats.xp': admin.firestore.FieldValue.increment(Number(challenge.xpReward ?? 0)),
      'stats.lastSolvedDate': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (difficulty === 'easy') userUpdates['stats.easyCount'] = admin.firestore.FieldValue.increment(1);
    if (difficulty === 'medium') userUpdates['stats.mediumCount'] = admin.firestore.FieldValue.increment(1);
    if (difficulty === 'hard') userUpdates['stats.hardCount'] = admin.firestore.FieldValue.increment(1);

    await userRef.set(userUpdates, { merge: true });

    await updateStreak(userId);
    await checkAndAwardBadges(userId);
    await checkAchievements(userId, 'challenge_solved', { challengeId, difficulty });
  });

export const onEventRegistration = functions.firestore
  .document('events/{eventId}/registrations/{registrationId}')
  .onCreate(async (_, context) => {
    const eventId = context.params.eventId as string;
    await db.collection('events').doc(eventId).set({
      registrationCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

export const onTeamRequest = functions.firestore
  .document('teams/{teamId}/requests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const teamId = context.params.teamId as string;
    const requestId = context.params.requestId as string;

    const teamSnap = await db.collection('teams').doc(teamId).get();
    const teamData = teamSnap.data();
    const teamCreatorId = teamData?.createdBy as string | undefined;

    if (!teamCreatorId) return;

    await db.collection('users').doc(teamCreatorId).collection('notifications').add({
      type: 'team_request',
      title: 'New Team Request',
      message: `${request.fromUserName ?? 'A user'} wants to join your team`,
      link: `/teams/${teamId}`,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        teamId,
        requestId,
        fromUserId: request.fromUserId ?? null,
      },
    });
  });

export const onUserNotificationCreate = functions.firestore
  .document('users/{userId}/notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId as string;
    const notification = snap.data();
    const title = String(notification.title ?? 'New notification');
    const body = String(notification.message ?? 'You have a new update');
    const link = notification.link ? String(notification.link) : undefined;

    await sendPushNotification(userId, {
      title,
      body,
      link,
      data: {
        type: String(notification.type ?? ''),
        notificationId: String(context.params.notificationId ?? ''),
      },
    });
  });

export const updateGlobalStatsOnUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async () => {
    await db.collection('stats').doc('global').set({
      totalUsers: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
