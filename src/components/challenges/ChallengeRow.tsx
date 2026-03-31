"use client";

import { useRouter } from "next/navigation";
import type { Challenge } from "@/types";
import { difficultyColor, difficultyBg } from "@/lib/utils/difficulty";

interface ChallengeRowProps {
  challenge: Challenge;
  solved: boolean;
}

export default function ChallengeRow({ challenge: c, solved }: ChallengeRowProps) {
  const router = useRouter();

  return (
    <div
      className="challenge-row"
      onClick={() => router.push(`/challenges/${c.id}`)}
    >
      <div style={{ width: 32, textAlign: "center" }}>
        {solved ? (
          <span style={{ color: "#10B981", fontSize: 18 }}>✓</span>
        ) : (
          <span style={{ color: "#2D2D50", fontSize: 16 }}>○</span>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{c.title}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {c.tags.map((t) => (
            <span
              key={t}
              className="tag"
              style={{ background: "#16213E", color: "#8B8BAD", padding: "2px 8px", fontSize: 11 }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <span
          className="tag"
          style={{
            background: difficultyBg(c.difficulty),
            color: difficultyColor(c.difficulty),
            marginBottom: 4,
            display: "inline-block",
          }}
        >
          {c.difficulty}
        </span>
        <div style={{ fontSize: 12, color: "#5A5A80" }}>{c.acceptance}% acceptance</div>
      </div>

      <div style={{ fontSize: 12, color: "#5A5A80", minWidth: 60, textAlign: "right" }}>
        {c.submissions}
      </div>
    </div>
  );
}
