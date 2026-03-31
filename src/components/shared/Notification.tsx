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
        background: isSuccess ? "#10B98122" : "#EF444422",
        border: `1px solid ${isSuccess ? "#10B981" : "#EF4444"}`,
        color: isSuccess ? "#10B981" : "#EF4444",
      }}
    >
      {notification.msg}
    </div>
  );
}
