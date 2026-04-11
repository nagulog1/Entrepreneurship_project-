//src/app/challenges/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ChallengeRow from "@/components/challenges/ChallengeRow";
import { CHALLENGES } from "@/lib/data/challenges";
import { useAppStore, useLevel } from "@/stores/useAppStore";
import { getChallenges } from "@/lib/firebase/firestore";
import { mapChallengeToListChallenge } from "@/lib/utils/firestoreMappers";
import { isAlgoliaSearchConfigured, searchChallengesInAlgolia } from "@/lib/search/algolia";
import type { Challenge } from "@/types";
import ShimmerCard from "@/components/shared/ShimmerCard";

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  All:    { bg: "#6C3BFF33", text: "#8B5CF6" },
  Easy:   { bg: "#10B98133", text: "#10B981" },
  Medium: { bg: "#F59E0B33", text: "#F59E0B" },
  Hard:   { bg: "#EF444433", text: "#EF4444" },
};

export default function ChallengesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [diffFilter, setDiffFilter] = useState<Difficulty>("All");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [remoteSearchResults, setRemoteSearchResults] = useState<Challenge[] | null>(null);
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [loading, setLoading] = useState(true);
  const { xp, streak, solvedChallenges } = useAppStore();

  useEffect(() => {
    let mounted = true;

    getChallenges({ limitCount: 120 })
      .then((docs) => {
        if (!mounted) return;
        const mapped = docs.map((c) => mapChallengeToListChallenge(c));
        setChallenges(mapped.length ? mapped : CHALLENGES);
      })
      .catch(() => {
        if (mounted) setChallenges(CHALLENGES);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredChallenges = useMemo(() => challenges.filter((c) => {
    const matchQ =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchD = diffFilter === "All" || c.difficulty === diffFilter;
    return matchQ && matchD;
  }), [challenges, diffFilter, searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteSearchResults(null);
      setSearchingRemote(false);
      return;
    }

    if (!isAlgoliaSearchConfigured()) {
      setRemoteSearchResults(null);
      return;
    }

    let active = true;
    setSearchingRemote(true);

    searchChallengesInAlgolia(q, diffFilter)
      .then((hits) => {
        if (!active) return;
        setRemoteSearchResults(hits);
      })
      .catch(() => {
        if (!active) return;
        setRemoteSearchResults(null);
      })
      .finally(() => {
        if (active) setSearchingRemote(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, diffFilter]);

  const displayedChallenges = remoteSearchResults ?? filteredChallenges;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          ⚡ Practice Arena
        </h1>
        <p style={{ color: "#8B8BAD" }}>Sharpen your skills with curated coding challenges</p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {(
          [
            ["✅", solvedChallenges.size, "Solved", "#10B981"],
            ["🔥", streak, "Day Streak", "#F59E0B"],
            ["⚡", xp, "XP Earned", "#6C3BFF"],
            ["📊", "#4,218", "Global Rank", "#8B5CF6"],
          ] as const
        ).map(([icon, val, label, color]) => (
          <div key={label} className="stat-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color, marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 12, color: "#8B8BAD" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search + Difficulty Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="🔍 Search challenges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {DIFFICULTIES.map((d) => {
            const active = diffFilter === d;
            const colors = DIFF_COLORS[d];
            return (
              <button
                key={d}
                className="pill"
                onClick={() => setDiffFilter(d)}
                style={{
                  background: active ? colors.bg : "#1E1E35",
                  color: active ? colors.text : "#8B8BAD",
                  border: `1px solid ${active ? colors.text : "#2D2D50"}`,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Challenge List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(loading || searchingRemote) && [1, 2, 3, 4, 5].map((i) => <ShimmerCard key={i} height={60} />)}
        {displayedChallenges.map((c) => (
          <ChallengeRow key={c.id} challenge={c} solved={solvedChallenges.has(c.id)} />
        ))}
        {!loading && !searchingRemote && displayedChallenges.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#5A5A80" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#8B8BAD" }}>No challenges found</div>
          </div>
        )}
      </div>
    </div>
  );
}
