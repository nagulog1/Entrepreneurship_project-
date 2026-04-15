"use client";

import { useEffect, useMemo, useState } from "react";
import { TEAMMATES } from "@/lib/data/users";
import ShimmerCard from "@/components/shared/ShimmerCard";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";
import { logAnalyticsEvent } from "@/lib/analytics";
import {
  createTeam,
  getLeaderboard,
  getOpenTeams,
  getUserTeams,
  joinTeam,
  leaveTeam,
  updateTeam,
} from "@/lib/firebase/firestore";
import { mapUserToTeammate } from "@/lib/utils/firestoreMappers";
import type { Team, Teammate } from "@/types";

type TeamModalMode = "create" | "edit";

function TeamModal({
  mode,
  team,
  onClose,
  onCreated,
  onUpdated,
}: {
  mode: TeamModalMode;
  team?: Team;
  onClose: () => void;
  onCreated: (team: Team) => void;
  onUpdated: (team: Team) => void;
}) {
  const { user } = useAuthContext();
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [maxMembers, setMaxMembers] = useState(team?.maxMembers ?? 4);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(team?.skills ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = mode === "edit";
  const currentMemberCount = team?.memberIds?.length ?? team?.members?.length ?? 1;

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      setError("You must be signed in.");
      return;
    }

    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    if (isEditMode && maxMembers < currentMemberCount) {
      setError("Max members cannot be less than the current team size.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        maxMembers,
        skills,
      };

      if (isEditMode && team) {
        await updateTeam(team.id, payload);
        void logAnalyticsEvent("team_updated", {
          team_id: team.id,
          team_name: payload.name,
        });
        onUpdated({
          ...team,
          ...payload,
          updatedAt: null as any,
        });
      } else {
        const teamId = await createTeam(
          {
            ...payload,
            linkedEvents: [],
            resources: [],
          },
          user.uid
        );

        onCreated({
          id: teamId,
          name: payload.name,
          description: payload.description,
          avatar: "👥",
          createdBy: user.uid,
          members: [{ userId: user.uid, role: "leader", joinedAt: null as any }],
          memberIds: [user.uid],
          maxMembers: payload.maxMembers,
          skills: payload.skills,
          linkedEvents: [],
          status: "forming",
          chat: true,
          resources: [],
          createdAt: null as any,
          updatedAt: null as any,
        });
        void logAnalyticsEvent("team_created", { team_name: payload.name });
      }
    } catch {
      setError(isEditMode ? "Failed to update team. Please try again." : "Failed to create team. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 480, padding: 28, borderRadius: 16, position: "relative" }}>
        <button className="btn-ghost" onClick={onClose} style={{ position: "absolute", right: 12, top: 12, padding: "4px 10px" }}>
          ✕
        </button>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          {isEditMode ? "✏️ Edit Team" : "🚀 Create a Team"}
        </h2>
        <p style={{ color: "#8B8BAD", fontSize: 14, marginBottom: 22 }}>
          {isEditMode ? "Update your team details and keep your listing current" : "Start a team and invite others to join"}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)}>
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
              {[2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setMaxMembers(count)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "1.5px solid",
                    borderColor: maxMembers === count ? "#6C3BFF" : "#2A2A4A",
                    background: maxMembers === count ? "#6C3BFF22" : "transparent",
                    color: maxMembers === count ? "#8B5CF6" : "#8B8BAD",
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: maxMembers === count ? 700 : 400,
                  }}
                >
                  {count}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-ghost" onClick={addSkill} style={{ padding: "8px 14px" }}>
                Add
              </button>
            </div>
            {skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="tag"
                    style={{ background: "#6C3BFF22", color: "#8B5CF6", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => setSkills((prev) => prev.filter((entry) => entry !== skill))}
                  >
                    {skill} <span style={{ opacity: 0.7 }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {isEditMode ? (submitting ? "Saving..." : "Save Changes") : (submitting ? "Creating..." : "Create Team")}
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
      openTeams.filter((team) => {
        if (currentUserTeamIds.includes(team.id)) return false;
        if (!search) return true;
        return (
          team.name.toLowerCase().includes(search.toLowerCase()) ||
          team.description?.toLowerCase().includes(search.toLowerCase()) ||
          team.skills?.some((skill) => skill.toLowerCase().includes(search.toLowerCase()))
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

  const isFull = (team: Team) => (team.memberIds?.length ?? team.members?.length ?? 0) >= (team.maxMembers ?? 4);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 560, padding: 28, borderRadius: 16, position: "relative", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <button className="btn-ghost" onClick={onClose} style={{ position: "absolute", right: 12, top: 12, padding: "4px 10px" }}>
          ✕
        </button>
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
          {loading && [1, 2, 3].map((entry) => <ShimmerCard key={entry} height={90} />)}

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
                <div key={team.id} className="card" style={{ padding: 16, marginBottom: 12, borderRadius: 12, display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: "linear-gradient(135deg, #6C3BFF, #10B981)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                    }}
                  >
                    👥
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{team.name}</div>
                    {team.description && (
                      <div style={{ fontSize: 12, color: "#8B8BAD", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {team.description}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#8B8BAD" }}>
                        👥 {memberCount}/{team.maxMembers ?? 4} members
                      </span>
                      {team.skills?.slice(0, 3).map((skill) => (
                        <span key={skill} className="tag" style={{ fontSize: 11, background: "#16213E", color: "#A0A0C0", padding: "2px 8px" }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className={full ? "btn-ghost" : "btn-primary"}
                    style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13 }}
                    disabled={full || joiningId === team.id}
                    onClick={() => {
                      if (!full) void handleJoin(team);
                    }}
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

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [previewUser, setPreviewUser] = useState<Teammate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { showNotif } = useAppStore();
  const { user } = useAuthContext();

  useEffect(() => {
    let mounted = true;

    getLeaderboard(60)
      .then((docs) => {
        if (!mounted) return;
        const mapped = docs.map((entry) => mapUserToTeammate(entry));
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
        (entry) =>
          !search ||
          entry.name.toLowerCase().includes(search.toLowerCase()) ||
          entry.college.toLowerCase().includes(search.toLowerCase()) ||
          entry.skills.some((skill) => skill.toLowerCase().includes(search.toLowerCase()))
      ),
    [search, teammates]
  );

  function handleTeamCreated(team: Team) {
    setMyTeams((prev) => [team, ...prev]);
    setShowCreateModal(false);
    showNotif(`Team "${team.name}" created! 🎉`);
  }

  function handleTeamUpdated(updatedTeam: Team) {
    setMyTeams((prev) => prev.map((team) => (team.id === updatedTeam.id ? updatedTeam : team)));
    setEditingTeam(null);
    showNotif(`Updated "${updatedTeam.name}" successfully.`);
  }

  function handleTeamJoined(team: Team) {
    setMyTeams((prev) => {
      if (prev.find((entry) => entry.id === team.id)) return prev;
      return [team, ...prev];
    });
    setShowJoinModal(false);
    showNotif(`Joined "${team.name}" successfully! 🎉`);
  }

  async function handleLeaveTeam(team: Team) {
    if (!user) return;
    try {
      await leaveTeam(team.id, user.uid);
      setMyTeams((prev) => prev.filter((entry) => entry.id !== team.id));
      showNotif(`Left "${team.name}".`);
    } catch {
      showNotif("Failed to leave team.");
    }
  }

  function isTeamOwner(team: Team) {
    return team.createdBy === user?.uid;
  }

  const closePreview = () => setPreviewUser(null);

  return (
    <div className="fade-in">
      {showCreateModal && (
        <TeamModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTeamCreated}
          onUpdated={handleTeamUpdated}
        />
      )}

      {editingTeam && (
        <TeamModal
          mode="edit"
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onCreated={handleTeamCreated}
          onUpdated={handleTeamUpdated}
        />
      )}

      {showJoinModal && user && (
        <JoinTeamModal
          onClose={() => setShowJoinModal(false)}
          onJoined={handleTeamJoined}
          currentUserId={user.uid}
          currentUserTeamIds={myTeams.map((team) => team.id)}
        />
      )}

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
          <div className="card" style={{ width: "100%", maxWidth: 520, padding: 24, position: "relative", borderRadius: 14 }}>
            <button className="btn-ghost" onClick={closePreview} style={{ position: "absolute", right: 12, top: 12, padding: "4px 10px" }}>
              ✕
            </button>

            <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 18, background: previewUser.color + "33", color: previewUser.color }}>
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
                {previewUser.skills.map((skill) => (
                  <span key={skill} className="tag" style={{ background: "#16213E", color: "#A0A0C0" }}>
                    {skill}
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

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🤝 Team Finder
        </h1>
        <p style={{ color: "#8B8BAD" }}>Find the perfect teammates for your next hackathon</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          className="btn-primary"
          onClick={() => {
            if (!user) {
              showNotif("Sign in to create a team.");
              return;
            }
            setShowCreateModal(true);
          }}
        >
          + Create Team
        </button>
        <button
          className="btn-ghost"
          style={{ border: "1.5px solid #2A2A4A" }}
          onClick={() => {
            if (!user) {
              showNotif("Sign in to join a team.");
              return;
            }
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 40 }}>
        {loading && [1, 2, 3, 4].map((entry) => <ShimmerCard key={entry} height={250} />)}
        {!loading &&
          filtered.map((entry) => (
            <div key={entry.id} className="team-card">
              <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: entry.color + "33", color: entry.color }}>
                  {entry.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{entry.name}</div>
                  <div style={{ fontSize: 13, color: "#8B8BAD", marginBottom: 6 }}>{entry.college}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge" style={{ background: "#6C3BFF22", color: "#8B5CF6", fontSize: 11, padding: "3px 10px" }}>
                      🎯 {entry.match}% Match
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: entry.looking.includes("Has") ? "#10B98122" : "#F59E0B22",
                        color: entry.looking.includes("Has") ? "#10B981" : "#F59E0B",
                        fontSize: 11,
                        padding: "3px 10px",
                      }}
                    >
                      {entry.looking}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {entry.skills.map((skill) => (
                  <span key={skill} className="tag" style={{ background: "#16213E", color: "#A0A0C0", fontSize: 12 }}>
                    {skill}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13, color: "#8B8BAD" }}>
                <span>🏆 {entry.hackathons} hackathons</span>
                <span>⭐ {entry.rating} rating</span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1, padding: "8px 14px", fontSize: 13 }}
                  onClick={() => {
                    void logAnalyticsEvent("team_request_send", { target_user_id: entry.id, target_user_name: entry.name });
                    showNotif(`Request sent to ${entry.name}! 🎉`);
                  }}
                >
                  Send Request
                </button>
                <button
                  className="btn-ghost"
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={() => {
                    void logAnalyticsEvent("team_profile_preview_click", { target_user_id: entry.id, target_user_name: entry.name });
                    setPreviewUser(entry);
                  }}
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
      </div>

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
                if (!user) {
                  showNotif("Sign in to create a team.");
                  return;
                }
                setShowCreateModal(true);
              }}
            >
              + Create Team
            </button>
            <button
              className="btn-ghost"
              style={{ border: "1.5px solid #2A2A4A" }}
              onClick={() => {
                if (!user) {
                  showNotif("Sign in to join a team.");
                  return;
                }
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
                      width: 56,
                      height: 56,
                      flexShrink: 0,
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
                    {team.skills.map((skill) => (
                      <span key={skill} className="tag" style={{ background: "#16213E", color: "#A0A0C0", fontSize: 12 }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                  {team.members.slice(0, 5).map((member) => (
                    <div
                      key={member.userId}
                      style={{
                        flex: "1 1 110px",
                        background: "#16213E",
                        borderRadius: 10,
                        padding: "12px 14px",
                        textAlign: "center",
                      }}
                    >
                      <div className="avatar" style={{ margin: "0 auto 8px", background: "#6C3BFF33", color: "#6C3BFF", width: 36, height: 36, fontSize: 13 }}>
                        {member.userId.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{member.role}</div>
                      <div style={{ fontSize: 11, color: "#8B8BAD" }}>
                        {member.userId === user?.uid ? "You" : member.userId.slice(0, 8) + "..."}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {isTeamOwner(team) ? (
                    <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setEditingTeam(team)}>
                      Edit Team
                    </button>
                  ) : (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 13, color: "#EF4444", borderColor: "#EF444422" }}
                      onClick={() => void handleLeaveTeam(team)}
                    >
                      Leave Team
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
