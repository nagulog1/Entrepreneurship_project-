"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CHALLENGES } from "@/lib/data/challenges";
import { SAMPLE_CODE, SAMPLE_CODE_BY_LANGUAGE } from "@/lib/data/constants";
import { useAppStore } from "@/stores/useAppStore";
import { useCodeRunner } from "@/hooks/useCodeRunner";
import { difficultyColor, difficultyBg } from "@/lib/utils/difficulty";
import { getChallengeById } from "@/lib/firebase/firestore";
import { mapChallengeToListChallenge } from "@/lib/utils/firestoreMappers";
import { logAnalyticsEvent } from "@/lib/analytics";
import type { Challenge } from "@/types";
import ShimmerCard from "@/components/shared/ShimmerCard";

const LANGUAGES = ["JavaScript", "Python", "Java", "C++"];

function starterCodeForLanguage(challenge: Challenge | null, language: string): string {
  if (challenge?.starterCode) {
    const key = language.toLowerCase();
    if (challenge.starterCode[key]) return challenge.starterCode[key];
    if (challenge.starterCode.javascript) return challenge.starterCode.javascript;
  }
  return SAMPLE_CODE_BY_LANGUAGE[language] || SAMPLE_CODE;
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("JavaScript");
  const [code, setCode] = useState(SAMPLE_CODE);
  const { solvedChallenges, markSolved, addXp, showNotif } = useAppStore();
  const { running, runResult, run, reset } = useCodeRunner();

  useEffect(() => {
    let mounted = true;

    getChallengeById(id)
      .then((doc) => {
        if (!mounted) return;
        if (doc) {
          setChallenge(mapChallengeToListChallenge(doc));
          return;
        }
        setChallenge(CHALLENGES.find((c) => c.id === id) || null);
      })
      .catch(() => {
        if (mounted) setChallenge(CHALLENGES.find((c) => c.id === id) || null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!loading && challenge) {
      void logAnalyticsEvent("view_item", {
        item_category: "challenge",
        item_id: challenge.id,
        difficulty: challenge.difficulty,
      });
    }
  }, [challenge, loading]);

  useEffect(() => {
    setCode(starterCodeForLanguage(challenge, lang));
  }, [challenge, lang]);

  const examples = useMemo(() => {
    if (challenge?.sampleTestCases?.length) {
      return challenge.sampleTestCases.slice(0, 3).map((test, index) => ({
        ex: index + 1,
        input: test.input,
        output: test.output,
        explain: test.explanation,
      }));
    }

    return [
      { ex: 1, input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explain: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { ex: 2, input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    ];
  }, [challenge]);

  // Build test cases for the execution engine
  const testCasesForRunner = useMemo(() => {
    if (challenge?.sampleTestCases?.length) {
      return challenge.sampleTestCases.map((tc) => ({
        input: tc.input,
        expected: tc.output,
      }));
    }
    // Fallback test cases for Two Sum (default challenge)
    return [
      { input: "nums = [2,7,11,15], target = 9", expected: "[0,1]" },
      { input: "nums = [3,2,4], target = 6", expected: "[1,2]" },
      { input: "nums = [3,3], target = 6", expected: "[0,1]" },
    ];
  }, [challenge]);

  const handleRun = (action: "run" | "submit") => {
    if (!challenge) return;

    void logAnalyticsEvent("challenge_code_execute", {
      challenge_id: challenge.id,
      action,
      language: lang,
    });

    run(code, lang, {
      testCases: testCasesForRunner,
      onSuccess: () => {
        const newlySolved = !solvedChallenges.has(challenge.id);
        void logAnalyticsEvent("challenge_result", {
          challenge_id: challenge.id,
          action,
          accepted: true,
          newly_solved: newlySolved,
        });
        if (!solvedChallenges.has(challenge.id)) {
          markSolved(challenge.id);
          addXp(challenge.xpReward || 10);
          showNotif(`✓ Accepted! +${challenge.xpReward || 10} XP earned`, "success");
        } else {
          showNotif("✓ All test cases passed!", "success");
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="fade-in" style={{ display: "grid", gap: 12 }}>
        <ShimmerCard height={120} />
        <ShimmerCard height={280} />
        <ShimmerCard height={320} />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div style={{ textAlign: "center", padding: 80, color: "#5A5A80" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, color: "#8B8BAD" }}>Challenge not found</div>
        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push("/challenges")}>
          ← Back to Challenges
        </button>
      </div>
    );
  }

  const isSolved = solvedChallenges.has(challenge.id);
  const outputStatusColor = runResult?.status === "accepted" ? "#10B981" : "#EF4444";

  return (
    <div className="fade-in">
      <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => { reset(); router.push("/challenges"); }}>
        ← Back to Challenges
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, minHeight: 600 }}>
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, flex: 1 }}>
                {challenge.title}
              </h2>
              <span
                className="tag"
                style={{
                  background: difficultyBg(challenge.difficulty),
                  color: difficultyColor(challenge.difficulty),
                  fontWeight: 700,
                }}
              >
                {challenge.difficulty}
              </span>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {challenge.tags.map((t) => (
                <span key={t} className="tag" style={{ background: "#16213E", color: "#8B8BAD" }}>{t}</span>
              ))}
              <span style={{ marginLeft: "auto", fontSize: 13, color: "#5A5A80" }}>{challenge.acceptance}% acceptance</span>
            </div>

            <div style={{ color: "#A0A0C0", lineHeight: 1.8, fontSize: 15 }}>
              <p style={{ marginBottom: 16 }}>
                {challenge.description || "Solve this challenge by writing an efficient algorithm. Use the examples and constraints below to validate your logic."}
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>Examples</h3>
            {examples.map((e) => (
              <div
                key={e.ex}
                style={{
                  background: "#0D0D1A",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: "#8B8BAD" }}>Input: </span>
                  <span style={{ color: "#E0E0FF" }}>{e.input}</span>
                </div>
                <div style={{ marginBottom: e.explain ? 6 : 0 }}>
                  <span style={{ color: "#8B8BAD" }}>Output: </span>
                  <span style={{ color: "#10B981" }}>{e.output}</span>
                </div>
                {e.explain && (
                  <div>
                    <span style={{ color: "#8B8BAD" }}>Explain: </span>
                    <span style={{ color: "#8B8BAD" }}>{e.explain}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Constraints</h3>
            <ul style={{ color: "#8B8BAD", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, listStyle: "none", lineHeight: 2 }}>
              {(challenge.constraints
                ? challenge.constraints.split("\n").filter(Boolean)
                : [
                    "2 ≤ nums.length ≤ 10⁴",
                    "-10⁹ ≤ nums[i], target ≤ 10⁹",
                    "Only one valid answer exists",
                  ]).map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid #2D2D50",
                background: "#16213E",
              }}
            >
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{
                  background: "#0D0D1A",
                  border: "1px solid #2D2D50",
                  borderRadius: 6,
                  padding: "5px 10px",
                  color: "#E0E0FF",
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>

              {isSolved && (
                <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>✓ Solved</span>
              )}

              <div style={{ marginLeft: "auto" }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setCode(starterCodeForLanguage(challenge, lang))}>
                  Reset
                </button>
              </div>
            </div>

            <textarea
              className="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ borderRadius: 0, border: "none", borderBottom: "1px solid #2D2D50", minHeight: 280 }}
              spellCheck={false}
            />

            {running && (
              <div style={{ padding: 16, borderBottom: "1px solid #2D2D50", textAlign: "center" }}>
                <div style={{ color: "#8B8BAD", fontSize: 14, display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid #6C3BFF",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Running test cases...
                </div>
              </div>
            )}

            {runResult && (
              <div style={{ padding: 16, borderBottom: "1px solid #2D2D50" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: outputStatusColor, fontSize: 16 }}>
                    {runResult.status === "accepted" ? "✓ Accepted" : `✗ ${runResult.status.replaceAll("_", " ")}`}
                  </span>
                  <span style={{ fontSize: 13, color: "#8B8BAD" }}>Runtime: {runResult.runtime}</span>
                  <span style={{ fontSize: 13, color: "#8B8BAD" }}>Memory: {runResult.memory}</span>
                </div>

                {runResult.error && (
                  <div style={{
                    background: "#1A0A0A",
                    border: "1px solid #3B1010",
                    borderRadius: 6,
                    padding: "10px 14px",
                    marginBottom: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: "#EF4444",
                    whiteSpace: "pre-wrap",
                    maxHeight: 120,
                    overflow: "auto",
                  }}>
                    {runResult.error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {runResult.cases.map((tc, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#0D0D1A",
                        borderRadius: 6,
                        padding: "8px 12px",
                      }}
                    >
                      <span style={{ color: tc.pass ? "#10B981" : "#EF4444", fontWeight: 700 }}>{tc.pass ? "✓" : "✗"}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#8B8BAD" }}>
                        Case {i + 1}: {tc.input}
                      </span>
                      <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: tc.pass ? "#10B981" : "#EF4444" }}>
                        → {tc.got}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, padding: 16 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => handleRun("run")} disabled={running}>
                ▶ Run Code
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleRun("submit")} disabled={running}>
                Submit Solution
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
