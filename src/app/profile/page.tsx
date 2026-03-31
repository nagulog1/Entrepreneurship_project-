"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditProfileModal from "@/components/profile/EditProfileModal";
import { EVENTS } from "@/lib/data/events";
import { useAppStore, useLevel } from "@/stores/useAppStore";

type ProfileTab = "overview" | "badges" | "events" | "settings";

const BADGES = [
  ["🌟", "First Steps", "Solved your first problem", true, "#F59E0B"],
  ["🔥", "Week Warrior", "7-day streak", true, "#EF4444"],
  ["💯", "Century Club", "Solve 100 problems", false, "#6C3BFF"],
  ["⚡", "Speed Demon", "Solve in under 5 mins", false, "#10B981"],
  ["🏆", "Event Victor", "Win a hackathon", false, "#F59E0B"],
  ["🤝", "Team Player", "Form 10 teams", false, "#8B5CF6"],
  ["🎯", "Perfectionist", "First try accepted", true, "#10B981"],
  ["🦁", "Legend", "Solve 1000 problems", false, "#EF4444"],
] as const;

const RECENT_ACTIVITY = [
  ["✅", "Solved Two Sum", "Easy · 10 XP", "2h ago", "#10B981"],
  ["🏆", "Registered for HackWithInfy 2025", "Team Event", "1d ago", "#6C3BFF"],
  ["✅", "Solved Valid Parentheses", "Easy · 10 XP", "2d ago", "#10B981"],
  ["🔥", "Reached 7-day streak!", "Bonus XP awarded", "3d ago", "#F59E0B"],
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [profileTab, setProfileTab] = useState<ProfileTab>("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { xp, streak, solvedChallenges, profile, updateProfile, showNotif } = useAppStore();
  const { level, levelXp, levelTitle } = useLevel();

  const handleSaveProfile = (data: typeof profile) => {
    updateProfile(data);
    showNotif("✓ Profile updated successfully!", "success");
  };

  return (
    <div className="fade-in">
      {/* ── Edit Profile Modal ── */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={profile}
        onSave={handleSaveProfile}
      />

      {/* ── Profile Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1A0A3A, #0A1A2A)",
          borderRadius: 16,
          padding: "32px",
          marginBottom: 24,
          border: "1px solid #2D2D50",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: "#6C3BFF22",
            borderRadius: "50%",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", position: "relative" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6C3BFF, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              border: "3px solid #6C3BFF55",
            }}
          >
            {profile.name.charAt(0)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700 }}>{profile.name}</h1>
              <span className="badge" style={{ background: "#6C3BFF33", color: "#8B5CF6", fontSize: 12 }}>
                Lv.{level} {levelTitle}
              </span>
            </div>
            <p style={{ color: "#8B8BAD", marginBottom: 12 }}>
              B.Tech {profile.branch} · {profile.year} Year · {profile.college}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {profile.skills.map((s) => (
                <span key={s} className="tag" style={{ background: "#16213E", color: "#A0A0C0" }}>{s}</span>
              ))}
            </div>
          </div>

          <button
            className="btn-outline"
            onClick={() => setIsEditModalOpen(true)}
            style={{
              background: "transparent",
              color: "#6C3BFF",
              border: "1px solid #6C3BFF55",
              padding: "8px 18px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 14,
              transition: "all 0.2s",
            }}
          >
            Edit Profile
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 24 }}>
          {(
            [
              ["⚡", xp, "XP"],
              ["✅", solvedChallenges.size, "Solved"],
              ["🔥", streak, "Streak"],
              ["🏆", 3, "Events Won"],
              ["👥", 2, "Teams"],
            ] as const
          ).map(([icon, val, label]) => (
            <div key={label} style={{ textAlign: "center", background: "#16213E", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: "#F0F0FF" }}>{val}</div>
              <div style={{ fontSize: 11, color: "#8B8BAD" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sub Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["overview", "badges", "events", "settings"] as ProfileTab[]).map((t) => (
          <button
            key={t}
            className="tab-btn"
            onClick={() => setProfileTab(t)}
            style={{
              background: profileTab === t ? "#6C3BFF33" : "#1E1E35",
              color: profileTab === t ? "#8B5CF6" : "#8B8BAD",
              border: `1px solid ${profileTab === t ? "#6C3BFF44" : "#2D2D50"}`,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {profileTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Problem Solving */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Problem Solving</h3>
            {([["Easy", "#10B981", 3, 150], ["Medium", "#F59E0B", 1, 80], ["Hard", "#EF4444", 0, 40]] as const).map(([d, color, solved, total]) => (
              <div key={d} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
                  <span style={{ color, fontWeight: 600 }}>{d}</span>
                  <span style={{ color: "#8B8BAD" }}>{solved}/{total}</span>
                </div>
                <div className="progress-bar">
                  <div style={{ height: "100%", borderRadius: 4, background: color, width: `${(solved / total) * 100}%`, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Activity Heatmap */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Activity (Last 12 Weeks)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 3 }}>
              {Array.from({ length: 84 }, (_, i) => {
                const intensity = Math.random();
                const active = Math.random() > 0.4;
                return (
                  <div
                    key={i}
                    style={{
                      width: "100%",
                      paddingBottom: "100%",
                      borderRadius: 2,
                      background: active ? `rgba(108, 59, 255, ${0.2 + intensity * 0.8})` : "#16213E",
                    }}
                  />
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: "#5A5A80", marginTop: 8, textAlign: "right" }}>🔥 7-day current streak</div>
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ padding: 24, gridColumn: "1/-1" }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECENT_ACTIVITY.map(([icon, title, sub, time, color]) => (
                <div key={title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#16213E", borderRadius: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#8B8BAD" }}>{sub}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#5A5A80" }}>{time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Badges ── */}
      {profileTab === "badges" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {BADGES.map(([icon, name, desc, earned, color]) => (
            <div
              key={name}
              className="card"
              style={{
                padding: 20,
                textAlign: "center",
                opacity: earned ? 1 : 0.5,
                border: earned ? `1px solid ${color}44` : "1px solid #2D2D50",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 10, filter: earned ? "none" : "grayscale(1)" }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: earned ? "#F0F0FF" : "#8B8BAD" }}>{name}</div>
              <div style={{ fontSize: 12, color: "#5A5A80" }}>{desc}</div>
              {earned && <div style={{ marginTop: 8, fontSize: 11, color, fontWeight: 600 }}>EARNED</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Events ── */}
      {profileTab === "events" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {EVENTS.slice(0, 4).map((ev) => (
            <div
              key={ev.id}
              className="card"
              style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
              onClick={() => router.push(`/events/${ev.id}`)}
            >
              <div style={{ fontSize: 36 }}>{ev.banner}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{ev.title}</div>
                <div style={{ fontSize: 13, color: "#8B8BAD" }}>by {ev.org} · {ev.date}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="badge" style={{ background: "#6C3BFF22", color: "#8B5CF6", marginBottom: 8, display: "block" }}>Registered</span>
                <div style={{ fontSize: 12, color: "#8B8BAD" }}>Prize: {ev.prize}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Settings ── */}
      {profileTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Notifications */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Notifications</h3>
            {(
              [
                ["Event Reminders", true],
                ["Team Requests", true],
                ["Daily Challenge", true],
                ["Leaderboard Updates", false],
                ["Weekly Digest", true],
              ] as const
            ).map(([label, on]) => (
              <ToggleRow key={label} label={label} defaultOn={on} onChange={() => showNotif("Settings updated!")} />
            ))}
          </div>

          {/* Privacy */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Privacy</h3>
            {(
              [
                ["Public Profile", true],
                ["Show in Leaderboard", true],
                ["Allow Team Requests", true],
                ["Show Email", false],
              ] as const
            ).map(([label, on]) => (
              <ToggleRow key={label} label={label} defaultOn={on} onChange={() => showNotif("Privacy updated!")} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toggle Row sub-component ──
function ToggleRow({ label, defaultOn, onChange }: { label: string; defaultOn: boolean; onChange: () => void }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1E1E35" }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <div
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: on ? "#6C3BFF" : "#2D2D50",
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s",
        }}
        onClick={() => { setOn(!on); onChange(); }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: on ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#F0F0FF",
            transition: "left 0.2s",
          }}
        />
      </div>
    </div>
  );
}
