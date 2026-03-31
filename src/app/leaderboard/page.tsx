"use client";

import { useRouter } from "next/navigation";
import { USERS } from "@/lib/data/users";
import { useAppStore } from "@/stores/useAppStore";

const PODIUM_ORDER = [USERS[1], USERS[0], USERS[2]]; // Silver, Gold, Bronze
const PODIUM_HEIGHTS = [130, 180, 110];
const PODIUM_MEDALS = ["🥈", "🥇", "🥉"];
const PODIUM_RANKS = [2, 1, 3];

export default function LeaderboardPage() {
  const router = useRouter();
  const { showNotif } = useAppStore();

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🏆 Leaderboards
        </h1>
        <p style={{ color: "#8B8BAD" }}>See where you stand among India's best coders</p>
      </div>

      {/* ── Podium ── */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32, alignItems: "flex-end" }}>
        {PODIUM_ORDER.map((u, i) => (
          <div key={u.id} style={{ textAlign: "center", width: 120 }}>
            <div
              className="avatar"
              style={{ width: 48, height: 48, fontSize: 18, background: u.color + "33", color: u.color, margin: "0 auto 8px" }}
            >
              {u.avatar}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{u.name.split(" ")[0]}</div>
            <div style={{ fontSize: 11, color: "#8B8BAD", marginBottom: 8 }}>{u.score.toLocaleString()} XP</div>
            <div
              style={{
                height: PODIUM_HEIGHTS[i],
                background: `linear-gradient(180deg, ${u.color}33, ${u.color}11)`,
                border: `1px solid ${u.color}44`,
                borderRadius: "8px 8px 0 0",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>{PODIUM_MEDALS[i]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Full List ── */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        {/* Tab bar */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #2D2D50", display: "flex", gap: 16 }}>
          {["Global", "My College", "Friends"].map((t) => (
            <button
              key={t}
              className="tab-btn"
              style={{
                background: t === "Global" ? "#6C3BFF33" : "transparent",
                color: t === "Global" ? "#8B5CF6" : "#8B8BAD",
              }}
              onClick={() => t !== "Global" && showNotif(`${t} leaderboard coming soon!`)}
            >
              {t}
            </button>
          ))}
        </div>

        {USERS.map((u, i) => (
          <div
            key={u.id}
            className="leaderboard-row"
            style={{
              padding: "16px 20px",
              borderBottom: i < USERS.length - 1 ? "1px solid #1E1E35" : "none",
            }}
          >
            <div
              style={{
                width: 36,
                textAlign: "center",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: i === 0 ? "#F59E0B" : i === 1 ? "#8B8BAD" : i === 2 ? "#CD7F32" : "#5A5A80",
              }}
            >
              {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
            </div>

            <div className="avatar" style={{ background: u.color + "33", color: u.color }}>{u.avatar}</div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "#8B8BAD" }}>{u.college} · {u.streak}🔥 streak</div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: "#10B981" }}>{u.solved}</div>
                <div style={{ fontSize: 11, color: "#5A5A80" }}>solved</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 80 }}>
                <div style={{ fontWeight: 700, color: "#6C3BFF", fontSize: 16 }}>{u.score.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: "#5A5A80" }}>XP</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Your Rank ── */}
      <div
        style={{
          background: "#6C3BFF22",
          border: "1px solid #6C3BFF44",
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: "#6C3BFF" }}>
          #4,218
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>Your Global Rank</div>
          <div style={{ fontSize: 13, color: "#8B8BAD" }}>Top 12% of all users · Solve 3 more challenges to climb!</div>
        </div>
        <button
          className="btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => router.push("/challenges")}
        >
          Improve Rank →
        </button>
      </div>
    </div>
  );
}
