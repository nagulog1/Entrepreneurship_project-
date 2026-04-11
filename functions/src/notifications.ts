import * as functions from 'firebase-functions/v1';
import { admin, db } from './admin';

interface PushPayload {
  title: string;
  body: string;
  link?: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export async function sendWelcomeEmail(email?: string | null, displayName?: string | null): Promise<void> {
  if (!email) return;
  functions.logger.info('Welcome email trigger placeholder', { email, displayName });
}

async function getUserFcmTokens(userId: string): Promise<string[]> {
  const snap = await db.collection('users').doc(userId).collection('fcmTokens').limit(500).get();
  return snap.docs.map((docSnap) => docSnap.id);
}

async function removeInvalidTokens(userId: string, invalidTokens: string[]): Promise<void> {
  if (!invalidTokens.length) return;
  const batch = db.batch();
  invalidTokens.forEach((token) => {
    batch.delete(db.collection('users').doc(userId).collection('fcmTokens').doc(token));
  });
  await batch.commit();
}

export async function sendPushNotification(userId: string, payloadOrTitle: PushPayload | string, bodyText?: string): Promise<void> {
  const payload: PushPayload =
    typeof payloadOrTitle === 'string'
      ? { title: payloadOrTitle, body: bodyText ?? '' }
      : payloadOrTitle;

  const tokens = await getUserFcmTokens(userId);
  if (!tokens.length) {
    functions.logger.info('No FCM tokens found for user', { userId });
    return;
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
    },
    data: {
      link: payload.link ?? '',
      ...payload.data,
    },
    webpush: {
      fcmOptions: {
        link: payload.link,
      },
      notification: {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        title: payload.title,
        body: payload.body,
        image: payload.imageUrl,
      },
    },
  };

  const result = await admin.messaging().sendEachForMulticast(message);
  if (result.failureCount === 0) {
    functions.logger.info('Push sent to user', { userId, success: result.successCount });
    return;
  }

  const invalidTokens: string[] = [];
  result.responses.forEach((response, index) => {
    if (!response.success && response.error) {
      const code = response.error.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  await removeInvalidTokens(userId, invalidTokens);

  functions.logger.warn('Push send completed with failures', {
    userId,
    successCount: result.successCount,
    failureCount: result.failureCount,
    invalidTokenCount: invalidTokens.length,
  });
}

export const sendNotificationToUser = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to send notifications.');
  }

  const targetUserId = String(data?.targetUserId ?? '');
  const title = String(data?.title ?? '').trim();
  const body = String(data?.body ?? '').trim();
  const link = data?.link ? String(data.link) : undefined;

  if (!targetUserId || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUserId, title and body are required.');
  }

  // Allows admin users or self-notifications.
  const senderSnap = await db.collection('users').doc(context.auth.uid).get();
  const senderRole = senderSnap.data()?.role;
  if (context.auth.uid !== targetUserId && senderRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Not allowed to send this notification.');
  }

  await sendPushNotification(targetUserId, { title, body, link });
  return { ok: true };
});
