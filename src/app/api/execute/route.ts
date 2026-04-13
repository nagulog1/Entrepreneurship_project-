/**
 * /api/execute/route.ts
 * Runs user code against test cases via Judge0.
 * Falls back to mock results in dev when JUDGE0_RAPIDAPI_KEY is not set.
 */

import { NextRequest, NextResponse } from "next/server";
import { captureError, createLogger } from "@/lib/monitoring/monitoring";
import { rateLimit, rateLimitHeaders, getClientIp } from "@/lib/ratelimit/rateLimiter";

const logger = createLogger("api:execute");

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 93,
  python:     71,
  java:       62,
  "c++":      54,
  cpp:        54,
  typescript: 94,
};

interface TestCase { input: string; expected: string; }
interface TestResult { input: string; expected: string; got: string; pass: boolean; error?: string; time?: string; memory?: string; }

interface ExecuteResponse {
  status: "accepted" | "wrong_answer" | "runtime_error" | "time_limit_exceeded" | "compilation_error";
  runtime: string;
  memory: string;
  cases: TestResult[];
  error?: string;
}

function normalizeOutput(s: string) {
  return s.trim().replace(/\r\n/g, "\n");
}

// ── Judge0 submission ─────────────────────────────────────────────────────────

async function runOnJudge0(
  code: string,
  languageId: number,
  stdin: string
): Promise<{ stdout: string; stderr: string; status: string; time: string; memory: number }> {
  const JUDGE0_URL  = process.env.JUDGE0_URL  || "https://judge0-ce.p.rapidapi.com";
  const JUDGE0_KEY  = process.env.JUDGE0_RAPIDAPI_KEY  || "";
  const JUDGE0_HOST = process.env.JUDGE0_RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";

  const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key":  JUDGE0_KEY,
      "X-RapidAPI-Host": JUDGE0_HOST,
    },
    body: JSON.stringify({
      source_code:      code,
      language_id:      languageId,
      stdin,
      cpu_time_limit:   5,
      memory_limit:     131072,
      wall_time_limit:  10,
    }),
  });

  if (!createRes.ok) throw new Error(`Judge0 error: ${createRes.status}`);
  const { token } = await createRes.json() as { token: string };

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${JUDGE0_URL}/submissions/${token}?base64_encoded=false`, {
      headers: { "X-RapidAPI-Key": JUDGE0_KEY, "X-RapidAPI-Host": JUDGE0_HOST },
    });
    const result = await res.json() as {
      status: { id: number; description: string };
      stdout: string; stderr: string; time: string; memory: number;
    };
    if (result.status.id < 3) continue;
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || result.status.description,
      status: result.status.description,
      time:   result.time,
      memory: result.memory,
    };
  }
  throw new Error("Execution timed out");
}

// ── Mock execution for dev (no Judge0 key needed) ─────────────────────────────

function mockRun(code: string, language: string, tc: TestCase): TestResult {
  // Very basic JS eval mock — just for local dev
  if (language.toLowerCase() === "javascript") {
    try {
      // Safe-ish eval: wrap in function, catch errors
      // eslint-disable-next-line no-new-func
      const fn = new Function(`
        const results = [];
        const console = { log: (...a) => results.push(a.join(' ')) };
        ${code}
        return results;
      `);
      const output = (fn() as string[]).join("\n");
      const pass = normalizeOutput(output) === normalizeOutput(tc.expected);
      return { input: tc.input, expected: tc.expected, got: output, pass };
    } catch (err) {
      return { input: tc.input, expected: tc.expected, got: "", pass: false, error: String(err) };
    }
  }
  return {
    input: tc.input, expected: tc.expected,
    got: "[Mock: add JUDGE0_RAPIDAPI_KEY to .env.local for real execution]",
    pass: false,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Rate limit
  const rlResult = await rateLimit(request, "execute");
  if (!rlResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before running again." },
      { status: 429, headers: rateLimitHeaders(rlResult) }
    );
  }

  // 2. Parse body
  let body: { code: string; language: string; testCases: TestCase[] };
  try {
    body = await request.json() as typeof body;
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

  // 3. Safety checks
  const BANNED = [
    /require\s*\(\s*['"]child_process['"]\s*\)/,
    /process\.exit/,
    /import\s+os\b/,
    /subprocess/,
    /Runtime\.getRuntime/,
    /System\.exit/,
  ];
  for (const pattern of BANNED) {
    if (pattern.test(code)) {
      logger.warn("Blocked dangerous code pattern", { ip: getClientIp(request) });
      return NextResponse.json({ error: "Code contains disallowed operations." }, { status: 400 });
    }
  }

  // 4. Execute
  const hasJudge0 = !!process.env.JUDGE0_RAPIDAPI_KEY;
  const results: TestResult[] = [];
  let totalTimeMs = 0;
  let maxMemory = 0;
  let compilationError: string | null = null;

  for (const tc of testCases.slice(0, 10)) {
    try {
      if (!hasJudge0) {
        results.push(mockRun(code, language, tc));
        continue;
      }

      const result = await runOnJudge0(code, languageId, tc.input);

      if (result.status.toLowerCase().includes("compilation")) {
        compilationError = result.stderr;
        results.push({ input: tc.input, expected: tc.expected, got: "", pass: false, error: result.stderr });
        break;
      }

      const output = result.stdout.trim();
      const pass = normalizeOutput(output) === normalizeOutput(tc.expected);
      totalTimeMs += parseFloat(result.time || "0") * 1000;
      maxMemory = Math.max(maxMemory, result.memory || 0);

      results.push({
        input: tc.input, expected: tc.expected, got: output, pass,
        time: `${result.time}s`,
        memory: `${Math.round((result.memory || 0) / 1024)}MB`,
        error: result.stderr || undefined,
      });
    } catch (err) {
      results.push({
        input: tc.input, expected: tc.expected, got: "", pass: false,
        error: err instanceof Error ? err.message : "Execution error",
      });
    }
  }

  const allPassed = results.length > 0 && results.every((r) => r.pass);
  const anyError  = results.some((r) => r.error && !compilationError);

  const response: ExecuteResponse = {
    status: compilationError ? "compilation_error"
          : allPassed       ? "accepted"
          : anyError        ? "runtime_error"
          : "wrong_answer",
    runtime: `${Math.round(totalTimeMs)}ms`,
    memory:  `${Math.round(maxMemory / 1024)}MB`,
    cases:   results,
    error:   compilationError || undefined,
  };

  return NextResponse.json(response, { headers: rateLimitHeaders(rlResult) });
}