"use client";

import { useRouter } from "next/navigation";
import type { Event } from "@/types";
import { difficultyColor, difficultyBg } from "@/lib/utils/difficulty";
import { logAnalyticsEvent } from "@/lib/analytics";

interface EventCardProps {
  ev: Event;
  bookmarked: Set<string>;
  onToggleBookmark: (id: string) => void;
  large?: boolean;
}

export default function EventCard({ ev, bookmarked, onToggleBookmark, large }: EventCardProps) {
  const router = useRouter();

  return (
    <div className="event-card" onClick={() => {
      void logAnalyticsEvent("select_content", { content_type: "event_card", content_id: ev.id, content_label: ev.title });
      router.push(`/events/${ev.id}`);
    }}>
      {ev.featured && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "#F59E0B",
            color: "#0A0A14",
            borderRadius: 20,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            zIndex: 2,
          }}
        >
          FEATURED
        </div>
      )}

      <div style={{ fontSize: 36, marginBottom: 14 }}>{ev.banner}</div>

      <h3
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: large ? 17 : 15,
          marginBottom: 4,
          color: "#F0F0FF",
          lineHeight: 1.3,
        }}
      >
        {ev.title}
      </h3>
      <p style={{ color: "#8B8BAD", fontSize: 13, marginBottom: 12 }}>by {ev.org}</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <span
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 20,
            background: difficultyBg(ev.difficulty),
            color: difficultyColor(ev.difficulty),
            fontWeight: 600,
          }}
        >
          {ev.difficulty}
        </span>
        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#2D2D50", color: "#8B8BAD" }}>
          {ev.mode}
        </span>
        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "#2D2D50", color: "#8B8BAD" }}>
          👥 {ev.teamSize}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#F59E0B" }}>
            {ev.prize}
          </div>
          <div style={{ fontSize: 11, color: "#8B8BAD" }}>Prize Pool</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#F0F0FF" }}>{ev.date}</div>
          <div style={{ fontSize: 11, color: "#EF4444" }}>Deadline: {ev.deadline}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="btn-primary"
          style={{ flex: 1, padding: "8px", fontSize: 13 }}
          onClick={(e) => {
            e.stopPropagation();
            void logAnalyticsEvent("event_view_details_click", { event_id: ev.id });
            router.push(`/events/${ev.id}`);
          }}
        >
          View Details
        </button>
        <button
          className="btn-ghost"
          style={{ padding: "8px 12px", fontSize: 16 }}
          onClick={(e) => {
            e.stopPropagation();
            void logAnalyticsEvent("event_bookmark_toggle", { event_id: ev.id, bookmarked_after: !bookmarked.has(ev.id) });
            onToggleBookmark(ev.id);
          }}
        >
          {bookmarked.has(ev.id) ? "🔖" : "🏷️"}
        </button>
      </div>
    </div>
  );
}
