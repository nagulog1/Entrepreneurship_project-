"use client";

import { useRouter } from "next/navigation";
import EventCard from "@/components/events/EventCard";
import { EVENTS } from "@/lib/data/events";
import { USERS } from "@/lib/data/users";
import { CHALLENGES } from "@/lib/data/challenges";
import { useAppStore, useLevel } from "@/stores/useAppStore";

export default function HomePage() {
  const router = useRouter();
  const { xp, streak, solvedChallenges, bookmarked, toggleBookmark } = useAppStore();
  const { level, levelXp, levelTitle } = useLevel();

  const featuredEvents = EVENTS.filter((e) => e.featured);
  const dailyChallenge = CHALLENGES[1];

  return (
    <div className="fade-in">
      {/* ── Hero ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1A0A3A 0%, #0A1A2A 50%, #0A2A1A 100%)",
          borderRadius: 20,
          padding: "48px 40px",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
          border: "1px solid #2D2D50",
        }}
      >
        <div style={{ position: "absolute", top: -40, right: -40, width: 300, height: 300, background: "#6C3BFF22", borderRadius: "50%", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -20, width: 200, height: 200, background: "#10B98122", borderRadius: "50%", filter: "blur(40px)" }} />

        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#6C3BFF22",
              border: "1px solid #6C3BFF55",
              borderRadius: 20,
              padding: "6px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#8B5CF6",
              fontWeight: 600,
            }}
          >
            🔥 Season 3 Now Live
          </div>

          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: 16,
              color: "#F0F0FF",
            }}
          >
            Hackathons. Code.
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #6C3BFF, #10B981)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Collaborate. Win.
            </span>
          </h1>

          <p style={{ color: "#8B8BAD", fontSize: 18, marginBottom: 32, maxWidth: 520, lineHeight: 1.6 }}>
            India's premier platform for college students — discover hackathons, sharpen your DSA
            skills, and build legendary teams.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn-primary" style={{ fontSize: 16, padding: "12px 28px" }} onClick={() => router.push("/events")}>
              Explore Events
            </button>
            <button className="btn-outline" style={{ fontSize: 16, padding: "12px 28px" }} onClick={() => router.push("/challenges")}>
              Start Practicing
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {(
          [
            ["🎯", "1,200+", "Active Events"],
            ["💻", "8,500+", "Challenges"],
            ["👥", "2.4L+", "Students"],
            ["🏆", "₹50Cr+", "Prize Pool"],
          ] as const
        ).map(([icon, val, label]) => (
          <div key={label} className="stat-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#F0F0FF", marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 13, color: "#8B8BAD" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Featured Events ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700 }}>🔥 Featured Events</h2>
          <button className="btn-ghost" onClick={() => router.push("/events")}>View All →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {featuredEvents.map((ev) => (
            <EventCard key={ev.id} ev={ev} bookmarked={bookmarked} onToggleBookmark={toggleBookmark} />
          ))}
        </div>
      </div>

      {/* ── Daily Challenge + Progress ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {/* Daily Challenge */}
        <div
          className="card"
          style={{ padding: 24, cursor: "pointer" }}
          onClick={() => router.push(`/challenges/${dailyChallenge.id}`)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "#F59E0B22", borderRadius: 8, padding: 8, fontSize: 20 }}>☀️</div>
            <div>
              <div style={{ fontSize: 11, color: "#8B8BAD", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Daily Challenge</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#F0F0FF" }}>{dailyChallenge.title}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <span className="tag" style={{ background: "#F59E0B22", color: "#F59E0B" }}>Medium</span>
            {dailyChallenge.tags.map((t) => (
              <span key={t} className="tag" style={{ background: "#2D2D50", color: "#8B8BAD" }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#8B8BAD" }}>+50% Bonus XP Today</span>
            <button className="btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>Solve Now →</button>
          </div>
        </div>

        {/* Progress Card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "#8B8BAD", textTransform: "uppercase", letterSpacing: 0.5 }}>Your Progress</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#10B981" }}>{solvedChallenges.size}</div>
              <div style={{ fontSize: 12, color: "#8B8BAD" }}>Solved</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#F59E0B" }}>{streak}</div>
              <div style={{ fontSize: 12, color: "#8B8BAD" }}>Day Streak 🔥</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#6C3BFF" }}>Lv.{level}</div>
              <div style={{ fontSize: 12, color: "#8B8BAD" }}>{levelTitle}</div>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8B8BAD", marginBottom: 6 }}>
              <span>XP Progress to Lv.{level + 1}</span>
              <span>{levelXp}/300</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(levelXp / 300) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Leaderboard Teaser ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>🏆 Top Coders This Week</h3>
          <button className="btn-ghost" onClick={() => router.push("/leaderboard")}>Full Leaderboard →</button>
        </div>

        {USERS.slice(0, 3).map((u, i) => (
          <div key={u.id} className="leaderboard-row">
            <div style={{ width: 28, textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
              {["🥇", "🥈", "🥉"][i]}
            </div>
            <div className="avatar" style={{ background: u.color + "33", color: u.color }}>{u.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "#8B8BAD" }}>{u.college}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: "#6C3BFF", fontSize: 15 }}>{u.score.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "#8B8BAD" }}>{u.solved} solved</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
