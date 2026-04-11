/**
 * TeamRequestsPanel.tsx — Real-time team request notifications.
 * Shows incoming requests and allows accept/reject with email notification.
 */

"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { subscribeToTeamRequests, type TeamRequest } from "@/lib/firebase/firestoreService";
import { useAppStore } from "@/stores/useAppStore";
import { useRouter } from "next/navigation";

export default function TeamRequestsPanel() {
  const { user } = useAuthContext();
  const { showNotif } = useAppStore();
  const router = useRouter();
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeToTeamRequests(user.uid, (reqs) => {
      setRequests(reqs);
      // Show notification badge for new requests
      if (reqs.length > 0) {
        const newest = reqs[0];
        showNotif(`🤝 Team request from ${newest.fromUserName} for ${newest.eventTitle}`, "info");
      }
    });

    return unsub;
  }, [user?.uid, showNotif]);

  const handleRespond = async (request: TeamRequest, action: "accepted" | "rejected") => {
    if (!user || responding) return;
    setResponding(request.id);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/teams/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          requestId: request.id,
          action,
          requesterEmail: request.fromUserEmail,
          requesterName: request.fromUserName,
          eventTitle: request.eventTitle,
          eventId: request.eventId,
          teamId: request.teamId,
        }),
      });

      if (!res.ok) throw new Error("Failed to respond");

      showNotif(
        action === "accepted"
          ? `✓ Accepted! You and ${request.fromUserName} are now teammates.`
          : `Request from ${request.fromUserName} declined.`,
        action === "accepted" ? "success" : "info"
      );
    } catch {
      showNotif("Failed to respond. Please try again.", "error");
    } finally {
      setResponding(null);
    }
  };

  if (!user || requests.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 900,
        width: expanded ? 360 : "auto",
      }}
    >
      {/* Badge Button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          background: "#6C3BFF",
          border: "none",
          borderRadius: expanded ? "12px 12px 0 0" : 12,
          padding: "10px 16px",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 600,
          fontSize: 13,
          width: expanded ? "100%" : "auto",
        }}
      >
        <span
          style={{
            background: "#EF4444",
            color: "#fff",
            borderRadius: "50%",
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {requests.length}
        </span>
        🤝 Team Requests
        <span style={{ marginLeft: "auto" }}>{expanded ? "▼" : "▲"}</span>
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div
          style={{
            background: "#16213E",
            border: "1px solid #2D2D50",
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {requests.map((req) => (
            <div
              key={req.id}
              style={{
                padding: "16px",
                borderBottom: "1px solid #2D2D50",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#6C3BFF33",
                    color: "#8B5CF6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {req.fromUserName.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#F0F0FF", fontSize: 13 }}>
                    {req.fromUserName}
                  </div>
                  <div style={{ fontSize: 11, color: "#8B8BAD" }}>
                    wants to team up for
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#0D0D1A",
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 10,
                  fontSize: 12,
                  color: "#A0A0C0",
                }}
              >
                <div style={{ fontWeight: 600, color: "#E0E0FF", marginBottom: 2 }}>
                  📌 {req.eventTitle}
                </div>
                {req.message && (
                  <div style={{ color: "#8B8BAD", fontStyle: "italic" }}>"{req.message}"</div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleRespond(req, "rejected")}
                  disabled={responding === req.id}
                  style={{
                    flex: 1,
                    padding: "7px",
                    background: "#1E1E35",
                    border: "1px solid #2D2D50",
                    borderRadius: 8,
                    color: "#8B8BAD",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => handleRespond(req, "accepted")}
                  disabled={responding === req.id}
                  style={{
                    flex: 1,
                    padding: "7px",
                    background: "#6C3BFF",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {responding === req.id ? "..." : "Accept ✓"}
                </button>
              </div>

              <button
                onClick={() => router.push(`/events/${req.eventId}`)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "4px",
                  background: "none",
                  border: "none",
                  color: "#5A5A80",
                  fontSize: 11,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                View event →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}