import { getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { app } from '@/lib/firebase';

let foregroundUnsubscribe: (() => void) | null = null;

async function getMessagingInstance() {
  const supported = await isSupported().catch(() => false);
  if (!supported || typeof window === 'undefined') return null;
  const { getMessaging } = await import('firebase/messaging');
  return getMessaging(app);
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function registerFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  const permission = await ensureNotificationPermission();
  if (permission !== 'granted') return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing. Skipping FCM token generation.');
    return null;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  return token || null;
}

export async function onForegroundNotification(
  callback: (payload: MessagePayload) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  if (foregroundUnsubscribe) {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }

  foregroundUnsubscribe = onMessage(messaging, callback);

  return () => {
    if (foregroundUnsubscribe) {
      foregroundUnsubscribe();
      foregroundUnsubscribe = null;
    }
  };
}
