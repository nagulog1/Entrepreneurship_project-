import { httpsCallable } from 'firebase/functions';
import { functionsClient } from '@/lib/firebase';

interface SendNotificationPayload {
  targetUserId: string;
  title: string;
  body: string;
  link?: string;
}

export async function sendPushNotificationToUser(payload: SendNotificationPayload): Promise<void> {
  const callable = httpsCallable<SendNotificationPayload, { ok: boolean }>(
    functionsClient,
    'sendNotificationToUser'
  );
  await callable(payload);
}
