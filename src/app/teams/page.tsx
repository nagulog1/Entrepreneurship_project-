"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAMMATES } from "@/lib/data/users";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthContext } from "@/contexts/AuthContext";
import { getLeaderboard, getUserTeams } from "@/lib/firebase/firestore";
import { mapUserToTeammate } from "@/lib/utils/firestoreMappers";
import { logAnalyticsEvent } from "@/lib/analytics";
import type { Team, Teammate } from "@/types";
import ShimmerCard from "@/components/shared/ShimmerCard";

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [previewUser, setPreviewUser] = useState<Teammate | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotif } = useAppStore();
  const { user } = useAuthContext();

  useEffect(() => {
    let mounted = true;

    getLeaderboard(60)
      .then((docs) => {
        if (!mounted) return;
        const mapped = docs.map((u) => mapUserToTeammate(u));
        setTeammates(mapped.length ? mapped : TEAMMATES);
      })
      .catch(() => {
        if (mounted) setTeammates(TEAMMATES);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMyTeams([]);
      return;
    }

    getUserTeams(user.uid)
      .then((teams) => setMyTeams(teams))
      .catch(() => setMyTeams([]));
  }, [user]);

  const filtered = useMemo(() => teammates.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.college.toLowerCase().includes(search.toLowerCase()) ||
      u.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  ), [search, teammates]);

  const activeTeam = myTeams[0] || null;

  const closePreview = () => setPreviewUser(null);

  return (
    <div className="fade-in">
      {previewUser && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreview();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 24,
              position: "relative",
              borderRadius: 14,
            }}
          >
            <button
              className="btn-ghost"
              onClick={closePreview}
              style={{ position: "absolute", right: 12, top: 12, padding: "4px 10px" }}
            >
              ✕
            </button>

            <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
              <div
                className="avatar"
                style={{ width: 56, height: 56, fontSize: 18, background: previewUser.color + "33", color: previewUser.color }}
              >
                {previewUser.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{previewUser.name}</div>
                <div style={{ color: "#8B8BAD", marginBottom: 8 }}>{previewUser.college}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge" style={{ background: "#6C3BFF22", color: "#8B5CF6", fontSize: 11 }}>🎯 {previewUser.match}% Match</span>
                  <span className="badge" style={{ background: "#F59E0B22", color: "#F59E0B", fontSize: 11 }}>{previewUser.looking}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#8B8BAD", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Skills
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {previewUser.skills.map((s) => (
                  <span key={s} className="tag" style={{ background: "#16213E", color: "#A0A0C0" }}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div className="stat-card" style={{ padding: 12 }}>
                <div style={{ color: "#8B8BAD", fontSize: 12, marginBottom: 3 }}>Hackathons</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{previewUser.hackathons}</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div style={{ color: "#8B8BAD", fontSize: 12, marginBottom: 3 }}>Rating</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>⭐ {previewUser.rating}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  showNotif(`Request sent to ${previewUser.name}! 🎉`);
                  closePreview();
                }}
              >
                Send Request
              </button>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={closePreview}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🤝 Team Finder
        </h1>
        <p style={{ color: "#8B8BAD" }}>Find the perfect teammates for your next hackathon</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button className="btn-primary" onClick={() => {
          void logAnalyticsEvent("team_profile_post_click");
          showNotif("Profile posted! You'll receive matching requests soon.");
        }}>
          + Post My Profile
        </button>
        <input
          className="input"
          placeholder="🔍 Search by skill, college, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 40 }}>
        {loading && [1, 2, 3, 4].map((i) => <ShimmerCard key={i} height={250} />)}
        {!loading && filtered.map((u) => (
          <div key={u.id} className="team-card">
            <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
              <div
                className="avatar"
                style={{ width: 48, height: 48, fontSize: 16, background: u.color + "33", color: u.color }}
              >
                {u.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{u.name}</div>
                <div style={{ fontSize: 13, color: "#8B8BAD", marginBottom: 6 }}>{u.college}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="badge" style={{ background: "#6C3BFF22", color: "#8B5CF6", fontSize: 11, padding: "3px 10px" }}>
                    🎯 {u.match}% Match
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: u.looking.includes("Has") ? "#10B98122" : "#F59E0B22",
                      color: u.looking.includes("Has") ? "#10B981" : "#F59E0B",
                      fontSize: 11,
                      padding: "3px 10px",
                    }}
                  >
                    {u.looking}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {u.skills.map((s) => (
                <span key={s} className="tag" style={{ background: "#16213E", color: "#A0A0C0", fontSize: 12 }}>{s}</span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13, color: "#8B8BAD" }}>
              <span>🏆 {u.hackathons} hackathons</span>
              <span>⭐ {u.rating} rating</span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: "8px 14px", fontSize: 13 }}
                onClick={() => {
                  void logAnalyticsEvent("team_request_send", { target_user_id: u.id, target_user_name: u.name });
                  showNotif(`Request sent to ${u.name}! 🎉`);
                }}
              >
                Send Request
              </button>
              <button
                className="btn-ghost"
                style={{ flex: 1, fontSize: 13 }}
                onClick={() => {
                  void logAnalyticsEvent("team_profile_preview_click", { target_user_id: u.id, target_user_name: u.name });
                  setPreviewUser(u);
                }}
              >
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Your Active Team
      </h2>
      <div className="card" style={{ padding: 24 }}>
        {activeTeam ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "linear-gradient(135deg, #6C3BFF, #10B981)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                👥
              </div>
              <div>
                <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>{activeTeam.name}</h3>
                <p style={{ color: "#8B8BAD", fontSize: 14 }}>{activeTeam.description || "Your live team from Firestore"}</p>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span className="badge" style={{ background: "#10B98122", color: "#10B981" }}>{activeTeam.status}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              {activeTeam.members.slice(0, 4).map((m) => (
                <div
                  key={m.userId}
                  style={{ flex: 1, background: "#16213E", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}
                >
                  <div
                    className="avatar"
                    style={{ margin: "0 auto 8px", background: "#6C3BFF33", color: "#6C3BFF", width: 40, height: 40, fontSize: 14 }}
                  >
                    {m.userId.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.role}</div>
                  <div style={{ fontSize: 12, color: "#8B8BAD" }}>{m.userId.slice(0, 8)}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ color: "#8B8BAD" }}>No active teams yet. Create or join a team to see it here.</div>
        )}
      </div>
    </div>
  );
}
