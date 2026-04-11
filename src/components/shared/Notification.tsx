"use client";

import { useAppStore } from "@/stores/useAppStore";

export default function Notification() {
  const notification = useAppStore((s) => s.notification);

  if (!notification) return null;

  const isSuccess = notification.type === "success";

  return (
    <div
      className="notif"
      style={{
        background: isSuccess ? "#052E2B" : "#3A1016",
        border: `1px solid ${isSuccess ? "#10B98188" : "#EF444488"}`,
        color: isSuccess ? "#E8FFF6" : "#FFECEE",
      }}
    >
      {notification.msg}
    </div>
  );
}
