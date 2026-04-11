/**
 * functions/src/index.ts — Firebase Cloud Functions
 * - Contest reminders (scheduled)
 * - Subscription expiry checks (scheduled)
 * - New user welcome email trigger
 * - Team request notification trigger
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserDoc {
  email: string;
  name: string;
  isPro?: boolean;
  plan?: string;
}

interface ContestDoc {
  title: string;
  status: string;
  startTime: admin.firestore.Timestamp;
  endTime: admin.firestore.Timestamp;
  registeredUsers?: string[];
}

interface SubscriptionDoc {
  userId: string;
  plan: string;
  status: string;
  expiresAt: admin.firestore.Timestamp;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendEmailViaAPI(params: {
  to: string;
  template: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const { default: fetch } = await import("node-fetch");
  const baseUrl = functions.config().app?.base_url || "https://uni-o.in";

  await fetch(`${baseUrl}/api/internal/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": functions.config().app?.internal_secret || "",
    },
    body: JSON.stringify(params),
  });
}

// ── Triggers ──────────────────────────────────────────────────────────────────

/**
 * Send welcome email when a new user document is created.
 */
export const onUserCreated = functions.firestore.onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const data = event.data?.data() as UserDoc | undefined;
    if (!data?.email) return;

    await sendEmailViaAPI({
      to: data.email,
      template: "welcome",
      data: { userName: data.name || "Coder" },
    });

    functions.logger.info("Welcome email sent", { userId: event.params.userId });
  }
);

/**
 * Trigger email when a team request is created.
 */
export const onTeamRequestCreated = functions.firestore.onDocumentCreated(
  "teamRequests/{requestId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Get recipient email
    const userSnap = await db.doc(`users/${data.toUserId}`).get();
    const user = userSnap.data() as UserDoc | undefined;
    if (!user?.email) return;

    await sendEmailViaAPI({
      to: user.email,
      template: "team_request_received",
      data: {
        toName: user.name,
        fromName: data.fromUserName,
        eventTitle: data.eventTitle,
        eventId: data.eventId,
        requestId: event.params.requestId,
        message: data.message,
      },
    });

    functions.logger.info("Team request email sent", { requestId: event.params.requestId });
  }
);

/**
 * Send confirmation when a team request is accepted.
 */
export const onTeamRequestUpdated = functions.firestore.onDocumentUpdated(
  "teamRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after || before?.status === after.status) return;
    if (after.status !== "accepted") return;

    // Notify the original requester
    const userSnap = await db.doc(`users/${after.fromUserId}`).get();
    const user = userSnap.data() as UserDoc | undefined;
    if (!user?.email) return;

    const acceptorSnap = await db.doc(`users/${after.toUserId}`).get();
    const acceptor = acceptorSnap.data() as UserDoc | undefined;

    await sendEmailViaAPI({
      to: user.email,
      template: "team_request_accepted",
      data: {
        toName: user.name,
        acceptorName: acceptor?.name || "Your new teammate",
        eventTitle: after.eventTitle,
        eventId: after.eventId,
        teamId: after.teamId || "",
      },
    });
  }
);

// ── Scheduled Functions ───────────────────────────────────────────────────────

/**
 * Send contest reminders 30 minutes before contest starts.
 * Runs every 10 minutes.
 */
export const contestReminders = functions.scheduler.onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const thirtyMinsFromNow = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 30 * 60 * 1000
    );
    const fortyMinsFromNow = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 40 * 60 * 1000
    );

    // Find contests starting in the next 30-40 minutes
    const contestsSnap = await db
      .collection("contests")
      .where("status", "==", "upcoming")
      .where("startTime", ">=", thirtyMinsFromNow)
      .where("startTime", "<=", fortyMinsFromNow)
      .get();

    if (contestsSnap.empty) {
      functions.logger.info("No contests to remind about.");
      return;
    }

    for (const contestDoc of contestsSnap.docs) {
      const contest = contestDoc.data() as ContestDoc;
      const registeredUsers = contest.registeredUsers || [];

      functions.logger.info(`Sending reminders for contest: ${contest.title}`, {
        userCount: registeredUsers.length,
      });

      // Send reminder to each registered user
      for (const userId of registeredUsers) {
        const userSnap = await db.doc(`users/${userId}`).get();
        const user = userSnap.data() as UserDoc | undefined;
        if (!user?.email) continue;

        await sendEmailViaAPI({
          to: user.email,
          template: "contest_reminder",
          data: {
            userName: user.name,
            contestTitle: contest.title,
            contestId: contestDoc.id,
            minutesBefore: 30,
            startsAt: contest.startTime.toDate().toISOString(),
          },
        }).catch((err: Error) => {
          functions.logger.warn("Failed to send reminder", { userId, error: err.message });
        });
      }

      // Mark contest as reminded to avoid duplicate sends
      await contestDoc.ref.update({ reminderSent: true });
    }
  }
);

/**
 * Update contest status based on start/end times.
 * Runs every minute.
 */
export const updateContestStatus = functions.scheduler.onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    // Upcoming → Live
    const toActivate = await db
      .collection("contests")
      .where("status", "==", "upcoming")
      .where("startTime", "<=", now)
      .get();

    for (const doc of toActivate.docs) {
      await doc.ref.update({ status: "live" });
      functions.logger.info(`Contest activated: ${doc.id}`);
    }

    // Live → Ended
    const toEnd = await db
      .collection("contests")
      .where("status", "==", "live")
      .where("endTime", "<=", now)
      .get();

    for (const doc of toEnd.docs) {
      await doc.ref.update({ status: "ended" });
      functions.logger.info(`Contest ended: ${doc.id}`);
    }
  }
);

/**
 * Check and expire subscriptions daily.
 */
export const checkSubscriptionExpiry = functions.scheduler.onSchedule(
  {
    schedule: "0 2 * * *", // 2 AM IST daily
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();

    const expired = await db
      .collection("subscriptions")
      .where("status", "==", "active")
      .where("expiresAt", "<=", now)
      .get();

    functions.logger.info(`Found ${expired.size} expired subscriptions.`);

    const batch = db.batch();
    for (const doc of expired.docs) {
      const sub = doc.data() as SubscriptionDoc;

      // Update subscription
      batch.update(doc.ref, { status: "expired" });

      // Update user
      batch.update(db.doc(`users/${sub.userId}`), {
        isPro: false,
        plan: "free",
      });

      functions.logger.info(`Expired subscription for user: ${sub.userId}`);
    }

    await batch.commit();
  }
);

/**
 * Cleanup old webhook events (older than 30 days).
 */
export const cleanupWebhookEvents = functions.scheduler.onSchedule(
  {
    schedule: "0 3 * * 0", // 3 AM every Sunday
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    const old = await db
      .collection("webhookEvents")
      .where("processedAt", "<=", thirtyDaysAgo)
      .limit(500)
      .get();

    if (old.empty) return;

    const batch = db.batch();
    for (const doc of old.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    functions.logger.info(`Cleaned up ${old.size} old webhook events.`);
  }
);