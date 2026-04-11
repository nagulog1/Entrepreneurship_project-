/**
 * TeamChat.tsx — Real-time team chat using Firestore subscriptions.
 * Connects to /teams/{teamId}/messages subcollection.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  subscribeToTeamChat,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/firebase/firestoreService";

interface TeamChatProps {
  teamId: string;
  teamName?: string;
}

export default function TeamChat({ teamId, teamName }: TeamChatProps) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!teamId) return;
    const unsub = subscribeToTeamChat(teamId, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [teamId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    setError(null);

    try {
      await sendChatMessage(teamId, user.uid, user.displayName || "You", content);
    } catch (err) {
      setError("Failed to send message. Please try again.");
      setInput(content); // Restore input
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const isOwnMessage = (msg: ChatMessage) => msg.userId === user?.uid;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 480,
        background: "#0D0D1A",
        borderRadius: 12,
        border: "1px solid #2D2D50",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "#16213E",
          borderBottom: "1px solid #2D2D50",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ fontWeight: 600, color: "#E0E0FF", fontSize: 14 }}>
          {teamName ? `${teamName} Chat` : "Team Chat"}
        </span>
        <span
          style={{
            marginLeft: "auto",
            width: 8,
            height: 8,
            background: "#10B981",
            borderRadius: "50%",
          }}
        />
        <span style={{ fontSize: 11, color: "#10B981" }}>Live</span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#5A5A80",
              fontSize: 13,
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>👋</span>
            <span>No messages yet. Say hello to your team!</span>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = isOwnMessage(msg);
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isOwn ? "row-reverse" : "row",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              {/* Avatar */}
              {!isOwn && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#6C3BFF33",
                    color: "#8B5CF6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {msg.userName.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Bubble */}
              <div style={{ maxWidth: "72%" }}>
                {!isOwn && (
                  <div style={{ fontSize: 11, color: "#5A5A80", marginBottom: 2, paddingLeft: 4 }}>
                    {msg.userName}
                  </div>
                )}
                <div
                  style={{
                    background: isOwn ? "#6C3BFF" : "#1E1E35",
                    color: isOwn ? "#fff" : "#E0E0FF",
                    padding: "8px 12px",
                    borderRadius: isOwn ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    fontSize: 13,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#5A5A80",
                    marginTop: 2,
                    textAlign: isOwn ? "right" : "left",
                    paddingInline: 4,
                  }}
                >
                  {formatTime(msg.sentAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "6px 16px",
            background: "#1A0A0A",
            color: "#EF4444",
            fontSize: 12,
            borderTop: "1px solid #3B1010",
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #2D2D50",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        {!user ? (
          <div style={{ flex: 1, color: "#5A5A80", fontSize: 13, textAlign: "center" }}>
            Sign in to chat with your team
          </div>
        ) : (
          <>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              rows={1}
              maxLength={2000}
              style={{
                flex: 1,
                background: "#16213E",
                border: "1px solid #2D2D50",
                borderRadius: 8,
                padding: "8px 12px",
                color: "#E0E0FF",
                fontSize: 13,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                minHeight: 36,
                maxHeight: 100,
              }}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                background: input.trim() ? "#6C3BFF" : "#2D2D50",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                color: "#fff",
                cursor: input.trim() ? "pointer" : "default",
                fontSize: 13,
                fontWeight: 600,
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              {sending ? "..." : "Send"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}