"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CHALLENGES } from "@/lib/data/challenges";
import { SAMPLE_CODE } from "@/lib/data/constants";
import { useAppStore } from "@/stores/useAppStore";
import { useCodeRunner } from "@/hooks/useCodeRunner";
import { difficultyColor, difficultyBg } from "@/lib/utils/difficulty";

const LANGUAGES = ["JavaScript", "Python", "Java", "C++"];

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState(SAMPLE_CODE);
  const [lang, setLang] = useState("JavaScript");
  const { solvedChallenges, markSolved, addXp, showNotif } = useAppStore();
  const { running, runResult, run, reset } = useCodeRunner();

  const challenge = CHALLENGES.find((c) => c.id === id);

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

  const handleRun = () => {
    run(() => {
      if (!solvedChallenges.has(challenge.id)) {
        markSolved(challenge.id);
        addXp(10);
        showNotif("✓ Accepted! +10 XP earned", "success");
      } else {
        showNotif("✓ All test cases passed!", "success");
      }
    });
  };

  const examples = [
    { ex: 1, input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explain: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
    { ex: 2, input: "nums = [3,2,4], target = 6", output: "[1,2]" },
  ];

  return (
    <div className="fade-in">
      <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => { reset(); router.push("/challenges"); }}>
        ← Back to Challenges
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, minHeight: 600 }}>
        {/* ── Problem Description ── */}
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
                Given an array of integers{" "}
                <code style={{ background: "#16213E", padding: "2px 6px", borderRadius: 4, color: "#8B5CF6", fontFamily: "'JetBrains Mono', monospace" }}>
                  nums
                </code>{" "}
                and an integer{" "}
                <code style={{ background: "#16213E", padding: "2px 6px", borderRadius: 4, color: "#8B5CF6", fontFamily: "'JetBrains Mono', monospace" }}>
                  target
                </code>
                , return <em>indices of the two numbers such that they add up to target</em>.
              </p>
              <p style={{ marginBottom: 16 }}>
                You may assume that each input would have{" "}
                <strong style={{ color: "#F0F0FF" }}>exactly one solution</strong>, and you may not use the same element twice.
              </p>
              <p>You can return the answer in any order.</p>
            </div>
          </div>

          {/* Examples */}
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

          {/* Constraints */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Constraints</h3>
            <ul style={{ color: "#8B8BAD", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, listStyle: "none", lineHeight: 2 }}>
              <li>• 2 ≤ nums.length ≤ 10⁴</li>
              <li>• -10⁹ ≤ nums[i] ≤ 10⁹</li>
              <li>• -10⁹ ≤ target ≤ 10⁹</li>
              <li>• Only one valid answer exists.</li>
            </ul>
          </div>
        </div>

        {/* ── Code Editor ── */}
        <div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Editor Header */}
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

              {solvedChallenges.has(challenge.id) && (
                <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>✓ Solved</span>
              )}

              <div style={{ marginLeft: "auto" }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setCode(SAMPLE_CODE)}>
                  Reset
                </button>
              </div>
            </div>

            {/* Code Area */}
            <textarea
              className="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ borderRadius: 0, border: "none", borderBottom: "1px solid #2D2D50", minHeight: 280 }}
              spellCheck={false}
            />

            {/* Spinner */}
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

            {/* Test Results */}
            {runResult && (
              <div style={{ padding: 16, borderBottom: "1px solid #2D2D50" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: "#10B981", fontSize: 16 }}>✓ Accepted</span>
                  <span style={{ fontSize: 13, color: "#8B8BAD" }}>Runtime: {runResult.runtime}</span>
                  <span style={{ fontSize: 13, color: "#8B8BAD" }}>Memory: {runResult.memory}</span>
                </div>
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
                      <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#10B981" }}>
                        → {tc.got}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10, padding: 16 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={handleRun} disabled={running}>
                ▶ Run Code
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleRun} disabled={running}>
                Submit Solution
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
