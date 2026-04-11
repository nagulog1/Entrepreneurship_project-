"use client";

import { useEffect } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";
import { onForegroundNotification, registerFcmToken } from "@/lib/firebase/messaging";

const PERMISSION_PROMPT_KEY = "unio:fcm:permissionPrompted";

async function saveFcmToken(userId: string, token: string) {
  await setDoc(doc(db, "users", userId, "fcmTokens", token), {
    token,
    platform: "web",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

async function removeFcmToken(userId: string, token: string) {
  await deleteDoc(doc(db, "users", userId, "fcmTokens", token));
}

export default function FcmManager() {
  const { user, isAuthenticated } = useAuthContext();
  const showNotif = useAppStore((s) => s.showNotif);

  useEffect(() => {
    let activeToken: string | null = null;

    const syncToken = async () => {
      if (!isAuthenticated || !user) return;

      const prompted = localStorage.getItem(PERMISSION_PROMPT_KEY) === "1";
      if (!prompted && typeof Notification !== "undefined" && Notification.permission === "default") {
        localStorage.setItem(PERMISSION_PROMPT_KEY, "1");
      } else if (prompted && typeof Notification !== "undefined" && Notification.permission === "default") {
        return;
      }

      const token = await registerFcmToken().catch(() => null);
      if (!token) {
        if (typeof Notification !== "undefined" && Notification.permission === "denied") {
          showNotif("Push notifications are blocked in your browser settings.", "error");
        }
        return;
      }

      activeToken = token;
      await saveFcmToken(user.uid, token).catch(() => undefined);
    };

    syncToken();

    return () => {
      if (user?.uid && activeToken) {
        removeFcmToken(user.uid, activeToken).catch(() => undefined);
      }
    };
  }, [isAuthenticated, showNotif, user]);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    onForegroundNotification((payload) => {
      const title = payload.notification?.title || "New notification";
      const body = payload.notification?.body || "You have a new update.";
      showNotif(`${title}: ${body}`, "success");
    }).then((cleanup) => {
      unsub = cleanup;
    });

    return () => {
      if (unsub) unsub();
    };
  }, [showNotif]);

  return null;
}
