let _msg: unknown = null;

export async function getFirebaseMessaging() {
  if (_msg) return _msg;
  try {
    if (typeof window === "undefined") return null;
    const { getApps } = await import("firebase/app");
    const apps = getApps();
    if (!apps.length) return null;
    const { isSupported, getMessaging } = await import("firebase/messaging");
    if (!(await isSupported().catch(() => false))) return null;
    try { _msg = getMessaging(apps[0]); return _msg; } catch { return null; }
  } catch { return null; }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

export async function getFcmToken(): Promise<string | null> {
  try {
    const m = await getFirebaseMessaging();
    if (!m) return null;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;
    const { getToken } = await import("firebase/messaging");
    return await getToken(m as never, { vapidKey });
  } catch { return null; }
}

export async function registerFcmToken(userId?: string): Promise<string | null> {
  try {
    if ((await ensureNotificationPermission()) !== "granted") return null;
    const token = await getFcmToken();
    if (!token || !userId) return token ?? null;
    try {
      const { getApps } = await import("firebase/app");
      if (getApps().length) {
        const { getFirestore, doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        await setDoc(
          doc(getFirestore(getApps()[0]), "fcmTokens", userId),
          { token, userId, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    } catch { /* best-effort */ }
    return token;
  } catch { return null; }
}

export async function onForegroundNotification(
  handler: (p: { title?: string; body?: string; data?: Record<string, string> }) => void
): Promise<() => void> {
  try {
    const m = await getFirebaseMessaging();
    if (!m) return () => {};
    const { onMessage } = await import("firebase/messaging");
    return onMessage(
      m as never,
      (p) => handler({
        title: p.notification?.title,
        body: p.notification?.body,
        data: p.data as Record<string, string>,
      })
    );
  } catch { return () => {}; }
}