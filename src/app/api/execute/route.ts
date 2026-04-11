/**
 * /api/execute/route.ts
 * POST — execute user code against test cases
 * Uses Judge0 CE (self-hosted or cloud) as the sandbox.
 * Falls back to a safe local runner for testing.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/firebaseAdmin";
import { rateLimit, rateLimitHeaders, getClientIp } from "@/lib/ratelimit/rateLimiter";
import { captureError, createLogger } from "@/lib/monitoring/monitoring";

const logger = createLogger("api:execute");

// Judge0 language IDs
const LANGUAGE_IDS: Record<string, number> = {
  javascript: 93, // Node.js 18
  python:     71, // Python 3.8
  java:       62, // Java OpenJDK 13
  "c++":      54, // C++ GCC 9.2
  cpp:        54,
  typescript: 94, // TypeScript
};

const JUDGE0_URL = process.env.JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_RAPIDAPI_KEY || "";
const JUDGE0_HOST = process.env.JUDGE0_RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";

interface TestCase {
  input: string;
  expected: string;
}

interface TestResult {
  input: string;
  expected: string;
  got: string;
  pass: boolean;
  time?: string;
  memory?: string;
  error?: string;
}

interface ExecuteResponse {
  status: "accepted" | "wrong_answer" | "runtime_error" | "time_limit_exceeded" | "compilation_error";
  runtime: string;
  memory: string;
  cases: TestResult[];
  error?: string;
}

// ─── Judge0 Submission ────────────────────────────────────────────────────────

async function submitToJudge0(
  code: string,
  languageId: number,
  stdin: string
): Promise<{ stdout: string; stderr: string; status: string; time: string; memory: number }> {
  // Create submission
  const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": JUDGE0_KEY,
      "X-RapidAPI-Host": JUDGE0_HOST,
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin,
      cpu_time_limit: 5,
      memory_limit: 131072, // 128MB
      wall_time_limit: 10,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Judge0 submission failed: ${createRes.status}`);
  }

  const { token } = await createRes.json() as { token: string };

  // Poll for result (max 30 seconds)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const resultRes = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      {
        headers: {
          "X-RapidAPI-Key": JUDGE0_KEY,
          "X-RapidAPI-Host": JUDGE0_HOST,
        },
      }
    );

    const result = await resultRes.json() as {
      status: { id: number; description: string };
      stdout: string;
      stderr: string;
      time: string;
      memory: number;
    };

    // status.id < 3 means still processing
    if (result.status.id < 3) continue;

    return {
      stdout: result.stdout || "",
      stderr: result.stderr || result.status.description,
      status: result.status.description,
      time: result.time,
      memory: result.memory,
    };
  }

  throw new Error("Execution timed out");
}

// ─── Output Comparison ────────────────────────────────────────────────────────

function normalizeOutput(s: string): string {
  return s.trim().replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n");
}

function outputMatches(got: string, expected: string): boolean {
  return normalizeOutput(got) === normalizeOutput(expected);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth check (optional for anonymous, but rate-limited harder)
  let userId: string | null = null;
  try {
    const decoded = await verifyIdToken(request.headers.get("authorization"));
    userId = decoded.uid;
  } catch {
    // Allow unauthenticated execution with stricter limits
  }

  // 2. Rate limit — stricter for anonymous
  const rlPreset = userId ? "execute" : { max: 3, window: 60 };
  const rlResult = await rateLimit(request, rlPreset, userId ?? undefined);

  if (!rlResult.success) {
    return NextResponse.json(
      { error: "Execution rate limit exceeded. Please wait before trying again." },
      { status: 429, headers: rateLimitHeaders(rlResult) }
    );
  }

  // 3. Parse and validate request body
  let body: { code: string; language: string; testCases: TestCase[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { code, language, testCases } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }

  if (code.length > 50000) {
    return NextResponse.json({ error: "Code too long (max 50,000 chars)." }, { status: 400 });
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    return NextResponse.json({ error: "testCases must be a non-empty array." }, { status: 400 });
  }

  if (testCases.length > 20) {
    return NextResponse.json({ error: "Maximum 20 test cases per request." }, { status: 400 });
  }

  const langKey = language.toLowerCase().replace(/ /g, "");
  const languageId = LANGUAGE_IDS[langKey];

  if (!languageId) {
    return NextResponse.json(
      { error: `Unsupported language: ${language}. Supported: JavaScript, Python, Java, C++.` },
      { status: 400 }
    );
  }

  // 4. Code safety checks (basic — Judge0 sandboxes this properly)
  const BANNED_PATTERNS = [
    /require\s*\(\s*['"]child_process['"]\s*\)/,
    /require\s*\(\s*['"]fs['"]\s*\)/,
    /process\.exit/,
    /\bexec\s*\(/,
    /\bspawn\s*\(/,
    /import\s+os/,
    /subprocess/,
    /Runtime\.getRuntime/,
    /System\.exit/,
  ];

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(code)) {
      logger.warn("Blocked code pattern", { pattern: pattern.source, ip: getClientIp(request) });
      return NextResponse.json(
        { error: "Code contains disallowed system operations." },
        { status: 400 }
      );
    }
  }

  // 5. Execute against each test case
  const results: TestResult[] = [];
  let totalTimeMs = 0;
  let maxMemory = 0;
  let compilationError: string | null = null;

  // Execute test cases (cap at 10 for latency)
  const casesToRun = testCases.slice(0, 10);

  for (const tc of casesToRun) {
    try {
      if (!JUDGE0_KEY) {
        // Development fallback: mock execution
        const mockResult = mockExecute(code, language, tc);
        results.push(mockResult);
        continue;
      }

      const result = await submitToJudge0(code, languageId, tc.input);

      if (result.status.toLowerCase().includes("compilation")) {
        compilationError = result.stderr;
        // No point running more cases
        results.push({
          input: tc.input,
          expected: tc.expected,
          got: "",
          pass: false,
          error: result.stderr,
        });
        break;
      }

      const output = result.stdout.trim();
      const pass = outputMatches(output, tc.expected);

      totalTimeMs += parseFloat(result.time || "0") * 1000;
      maxMemory = Math.max(maxMemory, result.memory || 0);

      results.push({
        input: tc.input,
        expected: tc.expected,
        got: output || (result.stderr ? `Error: ${result.stderr}` : ""),
        pass,
        time: `${result.time}s`,
        memory: `${Math.round((result.memory || 0) / 1024)}MB`,
        error: result.stderr || undefined,
      });
    } catch (err) {
      results.push({
        input: tc.input,
        expected: tc.expected,
        got: "",
        pass: false,
        error: err instanceof Error ? err.message : "Execution error",
      });
    }
  }

  const allPassed = results.length > 0 && results.every((r) => r.pass);
  const anyRuntimeError = results.some((r) => r.error && !r.error.includes("Compilation"));

  const response: ExecuteResponse = {
    status: compilationError
      ? "compilation_error"
      : allPassed
      ? "accepted"
      : anyRuntimeError
      ? "runtime_error"
      : "wrong_answer",
    runtime: `${totalTimeMs.toFixed(0)}ms`,
    memory: `${Math.round(maxMemory / 1024)}MB`,
    cases: results,
    error: compilationError || undefined,
  };

  return NextResponse.json(response, {
    headers: rateLimitHeaders(rlResult),
  });
}

// ─── Development Mock ─────────────────────────────────────────────────────────

function mockExecute(code: string, language: string, tc: TestCase): TestResult {
  // Very basic mock — just checks if code seems to return the right thing
  // In production this is replaced by Judge0
  try {
    if (language.toLowerCase() === "javascript") {
      // Wrap in a function and try to eval (only safe in dev/testing)
      const fn = new Function("return (" + code.replace(/console\.log/g, "return") + ")")();
      const got = String(typeof fn === "function" ? fn() : fn);
      return {
        input: tc.input,
        expected: tc.expected,
        got,
        pass: normalizeOutput(got) === normalizeOutput(tc.expected),
      };
    }
  } catch (err) {
    return {
      input: tc.input,
      expected: tc.expected,
      got: "",
      pass: false,
      error: err instanceof Error ? err.message : "Runtime error",
    };
  }

  return {
    input: tc.input,
    expected: tc.expected,
    got: "[Mock: Judge0 not configured]",
    pass: false,
  };
}