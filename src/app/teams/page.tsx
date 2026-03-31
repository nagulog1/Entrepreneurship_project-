"use client";

import { useState } from "react";
import { TEAMMATES } from "@/lib/data/users";
import { useAppStore } from "@/stores/useAppStore";

export default function TeamsPage() {
  const [search, setSearch] = useState("");
  const { showNotif } = useAppStore();

  const filtered = TEAMMATES.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.college.toLowerCase().includes(search.toLowerCase()) ||
      u.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🤝 Team Finder
        </h1>
        <p style={{ color: "#8B8BAD" }}>Find the perfect teammates for your next hackathon</p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button className="btn-primary" onClick={() => showNotif("Profile posted! You'll receive matching requests soon.")}>
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

      {/* Teammate Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 40 }}>
        {filtered.map((u) => (
          <div key={u.id} className="team-card">
            {/* Top Row */}
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

            {/* Skills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {u.skills.map((s) => (
                <span key={s} className="tag" style={{ background: "#16213E", color: "#A0A0C0", fontSize: 12 }}>{s}</span>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 13, color: "#8B8BAD" }}>
              <span>🏆 {u.hackathons} hackathons</span>
              <span>⭐ {u.rating} rating</span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: "8px 14px", fontSize: 13 }}
                onClick={() => showNotif(`Request sent to ${u.name}! 🎉`)}
              >
                Send Request
              </button>
              <button
                className="btn-ghost"
                style={{ flex: 1, fontSize: 13 }}
                onClick={() => showNotif("Profile preview coming soon!")}
              >
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Active Team */}
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        Your Active Team
      </h2>
      <div className="card" style={{ padding: 24 }}>
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
              fontSize: 26,
            }}
          >
            ⚡
          </div>
          <div>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>Team Neural Ninjas</h3>
            <p style={{ color: "#8B8BAD", fontSize: 14 }}>Registered for Smart India Hackathon 2025</p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span className="badge" style={{ background: "#10B98122", color: "#10B981" }}>Active</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {[
            { name: "You", role: "Lead Dev", color: "#6C3BFF" },
            { name: "Kavya", role: "UI/UX", color: "#10B981" },
            { name: "Sai", role: "ML Eng", color: "#F59E0B" },
          ].map((m) => (
            <div
              key={m.name}
              style={{ flex: 1, background: "#16213E", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}
            >
              <div
                className="avatar"
                style={{ margin: "0 auto 8px", background: m.color + "33", color: m.color, width: 40, height: 40, fontSize: 14 }}
              >
                {m.name.slice(0, 2)}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: "#8B8BAD" }}>{m.role}</div>
            </div>
          ))}

          <div
            style={{
              flex: 1,
              background: "#16213E",
              borderRadius: 10,
              padding: "14px 16px",
              textAlign: "center",
              border: "2px dashed #2D2D50",
              cursor: "pointer",
            }}
            onClick={() => showNotif("Invite link copied!")}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: "#2D2D50",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
                fontSize: 20,
                color: "#5A5A80",
              }}
            >
              +
            </div>
            <div style={{ fontSize: 13, color: "#5A5A80" }}>Add Member</div>
          </div>
        </div>
      </div>
    </div>
  );
}
