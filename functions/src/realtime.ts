import * as functions from 'firebase-functions/v1';
import { admin, db } from './admin';
import { sendPushNotification } from './notifications';

// ─── Real-Time Contest Status Updates ────────────────────────────────────────
// Triggers when a contest document changes status (upcoming -> live -> ended).

export const onContestStatusChange = functions.firestore
  .document('contests/{contestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const contestId = context.params.contestId as string;

    if (before.status === after.status) return;

    const newStatus = after.status as string;
    const title = after.title as string;

    if (newStatus === 'live') {
      // Notify all registered participants
      const registrations = await db
        .collection('contests')
        .doc(contestId)
        .collection('registrations')
        .get();

      const batch = db.batch();
      for (const regDoc of registrations.docs) {
        const userId = regDoc.data().userId as string;
        const notifRef = db.collection('users').doc(userId).collection('notifications').doc();
        batch.set(notifRef, {
          type: 'contest_live',
          title: '🔴 Contest is LIVE!',
          message: `"${title}" has started. Head over now!`,
          link: `/contests/${contestId}`,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      functions.logger.info('Contest went live, notified participants', { contestId, count: registrations.size });
    }

    if (newStatus === 'ended') {
      // Finalize leaderboard ranks
      const leaderboardSnap = await db
        .collection('contests')
        .doc(contestId)
        .collection('leaderboard')
        .orderBy('score', 'desc')
        .orderBy('penalty', 'asc')
        .get();

      const batch = db.batch();
      leaderboardSnap.docs.forEach((docSnap, index) => {
        batch.update(docSnap.ref, { rank: index + 1 });
      });

      // Update contest doc with final stats
      batch.update(change.after.ref, {
        finalParticipants: leaderboardSnap.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      // Notify top 3
      const top3 = leaderboardSnap.docs.slice(0, 3);
      for (const entry of top3) {
        const data = entry.data();
        const userId = data.userId as string;
        const rank = top3.indexOf(entry) + 1;
        const medals = ['🥇', '🥈', '🥉'];
        await sendPushNotification(userId, {
          title: `${medals[rank - 1]} Contest Results!`,
          body: `You placed #${rank} in "${title}". Congratulations!`,
          link: `/contests/${contestId}`,
        });
      }

      functions.logger.info('Contest ended, leaderboard finalized', { contestId, participants: leaderboardSnap.size });
    }
  });

// ─── Real-Time Leaderboard Update on Submission ─────────────────────────────

export const updateContestLeaderboardRealtime = functions.firestore
  .document('contests/{contestId}/submissions/{submissionId}')
  .onCreate(async (snap, context) => {
    const submission = snap.data();
    const contestId = context.params.contestId as string;
    const userId = submission.userId as string;
    const challengeId = submission.challengeId as string;

    if (!userId || !challengeId) return;
    if (submission.status !== 'accepted') return;

    const leaderboardRef = db
      .collection('contests')
      .doc(contestId)
      .collection('leaderboard')
      .doc(userId);

    const existingSnap = await leaderboardRef.get();
    const existing = existingSnap.data() ?? {};
    const existingSubmissions = (existing.submissions ?? []) as Array<{ challengeId: string; solvedAt: unknown; attempts: number }>;

    // Check if already solved this challenge
    const alreadySolved = existingSubmissions.some((s) => s.challengeId === challengeId);
    if (alreadySolved) return;

    const contestSnap = await db.collection('contests').doc(contestId).get();
    const contestData = contestSnap.data();
    const startTime = contestData?.startTime?.toDate?.() ?? new Date();
    const solvedAt = new Date();
    const penaltyMinutes = Math.round((solvedAt.getTime() - startTime.getTime()) / 60000);

    const newSubmissions = [
      ...existingSubmissions,
      {
        challengeId,
        solvedAt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: (submission.attempts as number) || 1,
      },
    ];

    const userSnap = await db.collection('users').doc(userId).get();
    const userData = userSnap.data() ?? {};

    await leaderboardRef.set({
      userId,
      userName: userData.displayName || 'User',
      userPhoto: userData.photoURL || '',
      score: (existing.score ?? 0) + (submission.points ?? 100),
      solved: (existing.solved ?? 0) + 1,
      penalty: (existing.penalty ?? 0) + penaltyMinutes,
      submissions: newSubmissions,
      rank: 0, // Will be recalculated
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Re-rank all entries
    const allEntriesSnap = await db
      .collection('contests')
      .doc(contestId)
      .collection('leaderboard')
      .orderBy('score', 'desc')
      .orderBy('penalty', 'asc')
      .get();

    const batch = db.batch();
    allEntriesSnap.docs.forEach((docSnap, index) => {
      batch.update(docSnap.ref, { rank: index + 1 });
    });

    // Update contest participants count
    batch.update(db.collection('contests').doc(contestId), {
      participants: allEntriesSnap.size,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    functions.logger.info('Contest leaderboard updated', {
      contestId,
      userId,
      challengeId,
      newScore: (existing.score ?? 0) + (submission.points ?? 100),
    });
  });
