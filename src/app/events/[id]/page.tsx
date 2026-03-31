"use client";

import { useParams, useRouter } from "next/navigation";
import { EVENTS } from "@/lib/data/events";
import { useAppStore } from "@/stores/useAppStore";
import { difficultyColor, difficultyBg } from "@/lib/utils/difficulty";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { bookmarked, toggleBookmark, showNotif } = useAppStore();

  const ev = EVENTS.find((e) => e.id === id);

  if (!ev) {
    return (
      <div style={{ textAlign: "center", padding: 80, color: "#5A5A80" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, color: "#8B8BAD" }}>Event not found</div>
        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push("/events")}>
          ← Back to Events
        </button>
      </div>
    );
  }

  const similarEvents = EVENTS.filter((e) => e.id !== ev.id).slice(0, 3);

  const infoGrid = [
    ["📅", "Event Date", ev.date],
    ["⏰", "Deadline", ev.deadline],
    ["💰", "Prize Pool", ev.prize],
    ["👥", "Team Size", ev.teamSize],
    ["📍", "Location", ev.city],
    ["👀", "Registered", ev.registered.toLocaleString()],
  ] as const;

  const prizes = [
    ["🥇 1st Place", "₹5,00,000 + Internship Offers", "#F59E0B"],
    ["🥈 2nd Place", "₹3,00,000 + Goodies", "#8B8BAD"],
    ["🥉 3rd Place", "₹1,50,000 + Certificates", "#CD7F32"],
    ["🏅 Special Prizes", "₹50,000 × 3 (Best Innovation, Best Design, Best Pitch)", "#6C3BFF"],
  ] as const;

  return (
    <div className="fade-in">
      <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => router.push("/events")}>
        ← Back to Events
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* ── Left Column ── */}
        <div>
          {/* Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #1A0A3A, #0A1A2A)",
              borderRadius: 16,
              padding: "40px 32px",
              marginBottom: 24,
              border: "1px solid #2D2D50",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: -30, left: -30, width: 150, height: 150, background: "#6C3BFF22", borderRadius: "50%", filter: "blur(40px)" }} />
            <div style={{ fontSize: 64, marginBottom: 16 }}>{ev.banner}</div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, marginBottom: 8 }}>{ev.title}</h1>
            <p style={{ color: "#8B8BAD", marginBottom: 16 }}>by {ev.org}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <span className="tag" style={{ background: "#6C3BFF22", color: "#8B5CF6" }}>{ev.category}</span>
              <span className="tag" style={{ background: difficultyBg(ev.difficulty), color: difficultyColor(ev.difficulty) }}>{ev.difficulty}</span>
              <span className="tag" style={{ background: "#2D2D50", color: "#8B8BAD" }}>{ev.mode}</span>
              {ev.tags.map((t) => (
                <span key={t} className="tag" style={{ background: "#1E1E35", color: "#8B8BAD" }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Info Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {infoGrid.map(([icon, label, val]) => (
              <div key={label} className="stat-card">
                <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 11, color: "#8B8BAD", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#F0F0FF" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* About */}
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>About this Event</h3>
            <p style={{ color: "#A0A0C0", lineHeight: 1.8, marginBottom: 16 }}>
              This is one of India's most prestigious hackathons, bringing together the brightest minds from top engineering colleges. Participants will work on real-world problem statements across multiple domains including AI/ML, healthcare, sustainability, and smart infrastructure.
            </p>
            <p style={{ color: "#A0A0C0", lineHeight: 1.8 }}>
              Teams will have 36 hours to build a working prototype and present their solution to a panel of industry experts. Winners receive cash prizes, internship opportunities, and direct recruitment offers from top tech companies.
            </p>
          </div>

          {/* Prizes */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🏆 Prize Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prizes.map(([pos, val, color]) => (
                <div
                  key={pos}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: "#16213E",
                    borderRadius: 8,
                    border: `1px solid ${color}33`,
                  }}
                >
                  <span style={{ fontWeight: 600, color }}>{pos}</span>
                  <span style={{ color: "#A0A0C0", fontSize: 14 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16, position: "sticky", top: 80 }}>
            <button
              className="btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: 16, marginBottom: 12 }}
              onClick={() => showNotif("🎉 Successfully registered! Check your email.")}
            >
              Register Now
            </button>
            <button
              className="btn-outline"
              style={{ width: "100%", marginBottom: 12 }}
              onClick={() => router.push("/teams")}
            >
              🤝 Find Teammates
            </button>
            <button
              className="btn-ghost"
              style={{ width: "100%", marginBottom: 16 }}
              onClick={() => {
                toggleBookmark(ev.id);
                showNotif(bookmarked.has(ev.id) ? "Bookmark removed" : "Event bookmarked!");
              }}
            >
              {bookmarked.has(ev.id) ? "🔖 Bookmarked" : "🔖 Bookmark"}
            </button>

            <div style={{ borderTop: "1px solid #2D2D50", paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: "#8B8BAD", marginBottom: 12, fontWeight: 600, textTransform: "uppercase" }}>Quick Prep</div>
              <button
                className="btn-ghost"
                style={{ width: "100%", marginBottom: 8 }}
                onClick={() => router.push("/challenges")}
              >
                ⚡ Practice Related Challenges
              </button>
              <button
                className="btn-ghost"
                style={{ width: "100%" }}
                onClick={() => showNotif("Added to Google Calendar!")}
              >
                📅 Add to Calendar
              </button>
            </div>
          </div>

          {/* Similar Events */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#8B8BAD" }}>SIMILAR EVENTS</div>
            {similarEvents.map((se) => (
              <div
                key={se.id}
                style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #1E1E35", cursor: "pointer" }}
                onClick={() => router.push(`/events/${se.id}`)}
              >
                <div style={{ fontSize: 24 }}>{se.banner}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E0E0FF" }}>{se.title}</div>
                  <div style={{ fontSize: 12, color: "#8B8BAD" }}>{se.prize} · {se.mode}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
