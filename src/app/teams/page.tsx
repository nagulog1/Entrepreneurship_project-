"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAMMATES } from "@/lib/data/users";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  getLeaderboard,
  getUserTeams,
  createTeam,
  joinTeam,
  leaveTeam,
  getOpenTeams,
} from "@/lib/firebase/firestore";
import { mapUserToTeammate } from "@/lib/utils/firestoreMappers";
import { logAnalyticsEvent } from "@/lib/analytics";
import type { Team, Teammate } from "@/types";
import ShimmerCard from "@/components/shared/ShimmerCard";

// ─── Create Team Modal ─────────────────────────────────────────────────────────

function CreateTeamModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (team: Team) => void;
}) {
  const { user } = useAuthContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(4);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setError("You must be signed in."); return; }
    if (!name.trim()) { setError("Team name is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const teamId = await createTeam(
        {
          name: name.trim(),
          description: description.trim(),
          maxMembers,
          skills,
          linkedEvents: [],
          resources: [],
        },
        user.uid
      );
      const newTeam: Team = {
        id: teamId,
        name: name.trim(),
        description: description.trim(),
        avatar: "👥",
        createdBy: user.uid,
        members: [{ userId: user.uid, role: "leader", joinedAt: null as any }],
        memberIds: [user.uid],
        maxMembers,
        skills,
        linkedEvents: [],
        status: "forming",
        chat: true,
        resources: [],
        createdAt: null as any,
        updatedAt: null as any,
      };
      void logAnalyticsEvent("team_created", { team_name: name.trim() });
      onCreated(newTeam);
    } catch {
      setError("Failed to create team. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 480, padding: 28, borderRadius: 16, position: "relative" }}>
        <button className="btn-ghost" onClick={onClose} style={{ position: "absolute", right: 12, top: 12, padding: "4px 10px" }}>✕</button>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          🚀 Create a Team
        </h2>
        <p style={{ color: "#8B8BAD", fontSize: 14, marginBottom: 22 }}>Start a team and invite others to join</p>

        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#8B8BAD", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Team Name *
            </label>
            <input
              className="input"
              placeholder="e.g. Code Warriors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%" }}
              maxLength={40}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#8B8BAD", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Description
            </label>
            <textarea
              className="input"
              placeholder="What is your team about? What are you building?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ width: "100%", resize: "none" }}
              maxLength={200}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#8B8BAD", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Max Members
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxMembers(n)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "1.5px solid",
                    borderColor: maxMembers === n ? "#6C3BFF" : "#2A2A4A",
                    background: maxMembers === n ? "#6C3BFF22" : "transparent",
                    color: maxMembers === n ? "#8B5CF6" : "#8B8BAD",
                    cursor: "pointer", fontSize: 15, fontWeight: maxMembers === n ? 700 : 400,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#8B8BAD", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Skills Needed
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                className="input"
                placeholder="e.g. React, ML, UI/UX"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-ghost" onClick={addSkill} style={{ padding: "8px 14px" }}>
                Add
              </button>
            </div>
            {skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {skills.map((s) => (
                  <span
                    key={s}
                    className="tag"
                    style={{ background: "#6C3BFF22", color: "#8B5CF6", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                  >
                    {s} <span style={{ opacity: 0.7 }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? "Creating..." : "Create Team"}
            </button>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Join Team Modal ───────────────────────────────────────────────────────────

function JoinTeamModal({
  onClose,
  onJoined,
  currentUserId,
  currentUserTeamIds,
}: {
  onClose: () => void;
  onJoined: (team: Team) => void;
  currentUserId: string;
  currentUserTeamIds: string[];
}) {
  const [openTeams, setOpenTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getOpenTeams(30)
      .then(setOpenTeams)
      .catch(() => setOpenTeams([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      openTeams.filter((t) => {
        if (currentUserTeamIds.includes(t.id)) return false;
        if (!search) return true;
        return (
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase()) ||
          t.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
        );
      }),
    [openTeams, search, currentUserTeamIds]
  );

  async function handleJoin(team: Team) {
    setJoiningId(team.id);
    setError("");
    try {
      await joinTeam(team.id, currentUserId);
      void logAnalyticsEvent("team_joined", { team_id: team.id, team_name: team.name });
      onJoined({ ...team, memberIds: [...(team.memberIds ?? []), currentUserId] });
    } catch {
      setError("Failed to join team. Please try again.");
    } finally {
      setJoiningId(null);
    }
  }

  const isFull = (team: Team) =>
    (team.memberIds?.length ?? team.members?.length ?? 0) >= (team.maxMembers ?? 4);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%", maxWidth: 560, padding: 28, borderRadius: 16,
          position: "relative", maxHeight: "85vh", display: "flex", flexDirection: "column",
        }}
      >
        <button className="btn-ghost" onClick={onClose} style={{ position: "absolute", right: 12, top: 12, padding: "4px 10px" }}>✕</button>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          🔍 Browse Open Teams
        </h2>
        <p style={{ color: "#8B8BAD", fontSize: 14, marginBottom: 16 }}>Find a team that matches your skills</p>

        <input
          className="input"
          placeholder="Search by team name or skill..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && [1, 2, 3].map((i) => <ShimmerCard key={i} height={90} />)}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", color: "#8B8BAD", padding: "40px 0" }}>
              No open teams found. Be the first to create one!
            </div>
          )}

          {!loading &&
            filtered.map((team) => {
              const memberCount = team.memberIds?.length ?? team.members?.length ?? 1;
              const full = isFull(team);
              return (
                <div
                  key={team.id}
                  className="card"
                  style={{ padding: 16, marginBottom: 12, borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: "linear-gradient(135deg, #6C3BFF, #10B981)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                    }}
                  >
                    👥
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{team.name}</div>
                    {team.description && (
                      <div
                        style={{
                          fontSize: 12, color: "#8B8BAD", marginBottom: 6,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {team.description}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#8B8BAD" }}>
                        👥 {memberCount}/{team.maxMembers ?? 4} members
                      </span>
                      {team.skills?.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="tag"
                          style={{ fontSize: 11, background: "#16213E", color: "#A0A0C0", padding: "2px 8px" }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className={full ? "btn-ghost" : "btn-primary"}
                    style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13 }}
                    disabled={full || joiningId === team.id}
                    onClick={() => { if (!full) void handleJoin(team); }}
                  >
                    {joiningId === team.id ? "Joining..." : full ? "Full" : "Join"}
                  </button>
                </div>
              );
            })}
        </div>

        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [previewUser, setPreviewUser] = useState<Teammate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
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

  const filtered = useMemo(
    () =>
      teammates.filter(
        (u) =>
          !search ||
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.college.toLowerCase().includes(search.toLowerCase()) ||
          u.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      ),
    [search, teammates]
  );

  const closePreview = () => setPreviewUser(null);

  function handleTeamCreated(team: Team) {
    setMyTeams((prev) => [team, ...prev]);
    setShowCreateModal(false);
    showNotif(`Team "${team.name}" created! 🎉`);
  }

  function handleTeamJoined(team: Team) {
    setMyTeams((prev) => {
      if (prev.find((t) => t.id === team.id)) return prev;
      return [team, ...prev];
    });
    setShowJoinModal(false);
    showNotif(`Joined "${team.name}" successfully! 🎉`);
  }

  async function handleLeaveTeam(team: Team) {
    if (!user) return;
    try {
      await leaveTeam(team.id, user.uid);
      setMyTeams((prev) => prev.filter((t) => t.id !== team.id));
      showNotif(`Left "${team.name}".`);
    } catch {
      showNotif("Failed to leave team.");
    }
  }

  return (
    <div className="fade-in">
      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTeamCreated}
        />
      )}

      {showJoinModal && user && (
        <JoinTeamModal
          onClose={() => setShowJoinModal(false)}
          onJoined={handleTeamJoined}
          currentUserId={user.uid}
          currentUserTeamIds={myTeams.map((t) => t.id)}
        />
      )}

      {/* Teammate preview modal */}
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
                  <span className="badge" style={{ background: "#6C3BFF22", color: "#8B5CF6", fontSize: 11 }}>
                    🎯 {previewUser.match}% Match
                  </span>
                  <span className="badge" style={{ background: "#F59E0B22", color: "#F59E0B", fontSize: 11 }}>
                    {previewUser.looking}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#8B8BAD", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Skills
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {previewUser.skills.map((s) => (
                  <span key={s} className="tag" style={{ background: "#16213E", color: "#A0A0C0" }}>
                    {s}
                  </span>
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

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🤝 Team Finder
        </h1>
        <p style={{ color: "#8B8BAD" }}>Find the perfect teammates for your next hackathon</p>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          className="btn-primary"
          onClick={() => {
            if (!user) { showNotif("Sign in to create a team."); return; }
            setShowCreateModal(true);
          }}
        >
          + Create Team
        </button>
        <button
          className="btn-ghost"
          style={{ border: "1.5px solid #2A2A4A" }}
          onClick={() => {
            if (!user) { showNotif("Sign in to join a team."); return; }
            setShowJoinModal(true);
          }}
        >
          🔍 Join a Team
        </button>
        <input
          className="input"
          placeholder="🔍 Search by skill, college, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
      </div>

      {/* Teammate cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 40 }}>
        {loading && [1, 2, 3, 4].map((i) => <ShimmerCard key={i} height={250} />)}
        {!loading &&
          filtered.map((u) => (
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
                    <span
                      className="badge"
                      style={{ background: "#6C3BFF22", color: "#8B5CF6", fontSize: 11, padding: "3px 10px" }}
                    >
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
                  <span key={s} className="tag" style={{ background: "#16213E", color: "#A0A0C0", fontSize: 12 }}>
                    {s}
                  </span>
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

      {/* My Teams */}
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Your Active Team{myTeams.length > 1 ? "s" : ""}
      </h2>

      {myTeams.length === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
          <p style={{ color: "#8B8BAD", marginBottom: 20, fontSize: 15 }}>
            No active teams yet. Create or join a team to see it here.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn-primary"
              onClick={() => {
                if (!user) { showNotif("Sign in to create a team."); return; }
                setShowCreateModal(true);
              }}
            >
              + Create Team
            </button>
            <button
              className="btn-ghost"
              style={{ border: "1.5px solid #2A2A4A" }}
              onClick={() => {
                if (!user) { showNotif("Sign in to join a team."); return; }
                setShowJoinModal(true);
              }}
            >
              🔍 Join a Team
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {myTeams.map((team) => {
            const memberCount = team.memberIds?.length ?? team.members?.length ?? 1;
            return (
              <div key={team.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 56, height: 56, flexShrink: 0,
                      background: "linear-gradient(135deg, #6C3BFF, #10B981)",
                      borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    👥
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 2 }}>
                      {team.name}
                    </h3>
                    <p style={{ color: "#8B8BAD", fontSize: 14 }}>{team.description || "No description"}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span className="badge" style={{ background: "#10B98122", color: "#10B981" }}>
                      {team.status}
                    </span>
                    <span style={{ fontSize: 12, color: "#8B8BAD" }}>
                      👥 {memberCount}/{team.maxMembers ?? 4}
                    </span>
                  </div>
                </div>

                {team.skills?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                    {team.skills.map((s) => (
                      <span key={s} className="tag" style={{ background: "#16213E", color: "#A0A0C0", fontSize: 12 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: team.createdBy !== user?.uid ? 16 : 0 }}>
                  {team.members.slice(0, 5).map((m) => (
                    <div
                      key={m.userId}
                      style={{
                        flex: "1 1 110px", background: "#16213E",
                        borderRadius: 10, padding: "12px 14px", textAlign: "center",
                      }}
                    >
                      <div
                        className="avatar"
                        style={{ margin: "0 auto 8px", background: "#6C3BFF33", color: "#6C3BFF", width: 36, height: 36, fontSize: 13 }}
                      >
                        {m.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{m.role}</div>
                      <div style={{ fontSize: 11, color: "#8B8BAD" }}>
                        {m.userId === user?.uid ? "You" : m.userId.slice(0, 8) + "..."}
                      </div>
                    </div>
                  ))}
                </div>

                {team.createdBy !== user?.uid && (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 13, color: "#EF4444", borderColor: "#EF444422" }}
                    onClick={() => void handleLeaveTeam(team)}
                  >
                    Leave Team
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
