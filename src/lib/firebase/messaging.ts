/**
 * messaging.ts — Firebase Cloud Messaging (push notifications).
 * Fully defensive — never crashes regardless of Firebase config state.
 */

// ── Internal helpers ──────────────────────────────────────────────────────────

async function safeGetApp() {
  // Synchronous — getApps() never throws
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getApps } = await import("firebase/app");
    const apps = getApps() as unknown[];
    return apps.length ? apps[0] : null;
  } catch {
    return null;
  }
}

async function safeGetMessaging(app: unknown) {
  // getMessaging() CAN throw synchronously ("getProvider" crash) when the
  // Firebase app was initialised with invalid/placeholder credentials.
  // A plain try/catch is enough here — no async needed.
  if (!(app as any).options?.messagingSenderId) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getMessaging } = await import("firebase/messaging");
    return getMessaging(app) as unknown;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getFirebaseMessaging() {
  try {
    if (typeof window === "undefined") return null;

    const app = await safeGetApp();
    if (!app) return null;

    // isSupported() is async and safe
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isSupported } = await import("firebase/messaging");
    const supported: boolean = await isSupported();
    if (!supported) return null;

    return await safeGetMessaging(app);
  } catch {
    return null;
  }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export async function getFcmToken(): Promise<string | null> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getToken } = await import("firebase/messaging");
    return (await getToken(messaging, { vapidKey })) as string;
  } catch {
    return null;
  }
}

export async function registerFcmToken(userId?: string): Promise<string | null> {
  try {
    const permission = await ensureNotificationPermission();
    if (permission !== "granted") return null;

    const token = await getFcmToken();
    if (!token) return null;

    if (userId) {
      try {
        const { getDbOrNull } = await import("@/lib/firebase/db");
        const db = getDbOrNull();
        if (db) {
          const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
          await setDoc(
            doc(db, "fcmTokens", userId),
            { token, userId, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }
      } catch {
        // best-effort — don't fail token registration
      }
    }

    return token;
  } catch {
    return null;
  }
}

export async function onForegroundNotification(
  handler: (payload: {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  }) => void
): Promise<() => void> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { onMessage } = await import("firebase/messaging");

    return onMessage(
      messaging,
      (payload: {
        notification?: { title?: string; body?: string };
        data?: Record<string, string>;
      }) => {
        handler({
          title: payload.notification?.title,
          body: payload.notification?.body,
          data: payload.data,
        });
      }
    ) as () => void;
  } catch {
    return () => {};
  }
}