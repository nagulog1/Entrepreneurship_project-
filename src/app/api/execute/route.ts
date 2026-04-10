import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { serverLogger } from '@/lib/monitoring';
import {
  detectFunctionName,
  parseTestCaseInput,
  wrapCode,
  parseExecutionOutput,
  type StructuredTestCase,
} from '@/lib/execution/wrapper';

// Lazy-import sandbox to avoid bundling node:vm at module level
async function getExecuteJavaScript() {
  const { executeJavaScript } = await import('@/lib/execution/sandbox');
  return executeJavaScript;
}

// Force Node.js runtime (needed for node:vm in sandbox)
export const runtime = 'nodejs';

const LANGUAGE_IDS: Record<string, number> = {
  JavaScript: 63,
  Python: 71,
  Java: 62,
  'C++': 54,
  C: 50,
  TypeScript: 74,
  Go: 60,
  Rust: 73,
};

const STATUS_MAP: Record<number, string> = {
  3: 'accepted',
  4: 'wrong_answer',
  5: 'time_limit',
  6: 'compilation_error',
};

export async function POST(req: NextRequest) {
  try {
    // ── Rate limiting ────────────────────────────────────────────────────────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';
    const rateLimitResult = checkRateLimit(`execute:${ip}`, RATE_LIMITS.execute);

    if (!rateLimitResult.allowed) {
      serverLogger.warn('Rate limit exceeded on /api/execute', { ip });
      return NextResponse.json(
        { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: 'Too many requests. Please wait before trying again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs ?? 5000) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // ── Input validation ─────────────────────────────────────────────────────
    const body = await req.json();
    const { code, language, testCases: rawTestCases, functionName: explicitFnName, stdin = '' } = body;

    if (typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: 'Code is required.' },
        { status: 400 }
      );
    }

    if (code.length > 50000) {
      return NextResponse.json(
        { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: 'Code exceeds maximum length (50KB).' },
        { status: 400 }
      );
    }

    if (typeof language !== 'string' || !LANGUAGE_IDS[language]) {
      return NextResponse.json(
        { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: `Unsupported language. Supported: ${Object.keys(LANGUAGE_IDS).join(', ')}` },
        { status: 400 }
      );
    }

    if (typeof stdin === 'string' && stdin.length > 10000) {
      return NextResponse.json(
        { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: 'stdin exceeds maximum length (10KB).' },
        { status: 400 }
      );
    }

    // ── Build structured test cases ──────────────────────────────────────────
    const hasTestCases = Array.isArray(rawTestCases) && rawTestCases.length > 0;
    let structuredCases: StructuredTestCase[] = [];
    let functionName: string | null = explicitFnName || null;

    if (hasTestCases) {
      functionName = functionName || detectFunctionName(code, language);

      if (!functionName) {
        return NextResponse.json(
          { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: 'Could not detect function name from your code. Make sure you define a named function.' },
          { status: 400 }
        );
      }

      structuredCases = rawTestCases.map((tc: { input: string; expected: string; args?: unknown[] }) => ({
        args: tc.args ?? parseTestCaseInput(tc.input),
        expected: tc.expected,
        display: tc.input,
      }));
    }

    const apiKey = process.env.JUDGE0_API_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
    const languageId = LANGUAGE_IDS[language] ?? 63;

    // ── Determine execution mode ─────────────────────────────────────────────
    // Priority: Judge0 > Local sandbox (JS only) > error
    const useJudge0 = !!apiKey;
    const canSandbox = language === 'JavaScript' || language === 'TypeScript';

    if (!useJudge0 && !canSandbox) {
      return NextResponse.json(
        { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: `Execution for ${language} requires Judge0 API configuration. Set JUDGE0_API_KEY in your environment.` },
        { status: 400 }
      );
    }

    // ── Build the code to execute ────────────────────────────────────────────
    const codeToRun = hasTestCases && functionName
      ? wrapCode(code, language, functionName, structuredCases)
      : code;

    // ── Execute ──────────────────────────────────────────────────────────────
    if (useJudge0) {
      return await executeWithJudge0(
        codeToRun, languageId, stdin, apiUrl, apiKey,
        hasTestCases ? structuredCases : null
      );
    }

    // Local sandbox (JavaScript only)
    return await executeWithSandbox(
      codeToRun,
      hasTestCases ? structuredCases : null
    );
  } catch (err) {
    serverLogger.error('Execute route error', err);
    return NextResponse.json(
      { status: 'runtime_error', runtime: '—', memory: '—', cases: [], error: 'Execution service unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

// ─── Judge0 execution ────────────────────────────────────────────────────────

async function executeWithJudge0(
  code: string,
  languageId: number,
  stdin: string,
  apiUrl: string,
  apiKey: string,
  testCases: StructuredTestCase[] | null
): Promise<NextResponse> {
  const res = await fetch(
    `${apiUrl}/submissions?base64_encoded=false&wait=true`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin,
        cpu_time_limit: 5,
        memory_limit: 262144,
      }),
    }
  );

  if (!res.ok) throw new Error(`Judge0 responded with ${res.status}`);

  const data = await res.json();
  const statusId: number = data.status?.id ?? 13;
  const runtimeMs = data.time ? `${Math.round(parseFloat(data.time) * 1000)} ms` : '—';
  const memoryMB = data.memory ? `${(data.memory / 1024).toFixed(1)} MB` : '—';
  const stdout = data.stdout ?? '';
  const stderr = data.stderr ?? '';
  const compileOutput = data.compile_output ?? '';

  // Compilation error
  if (statusId === 6) {
    return NextResponse.json({
      status: 'compilation_error',
      runtime: '—', memory: '—',
      cases: [],
      error: compileOutput || 'Compilation failed',
    });
  }

  // Time limit
  if (statusId === 5) {
    return NextResponse.json({
      status: 'time_limit',
      runtime: runtimeMs, memory: memoryMB,
      cases: testCases
        ? testCases.map((tc) => ({ input: tc.display, expected: tc.expected, got: 'Time Limit Exceeded', pass: false }))
        : [{ input: stdin || '(none)', expected: '', got: 'Time Limit Exceeded', pass: false }],
      error: 'Time Limit Exceeded',
    });
  }

  // Runtime error (no test cases mode)
  if (statusId !== 3 && !testCases) {
    return NextResponse.json({
      status: (STATUS_MAP[statusId] ?? 'runtime_error') as string,
      runtime: runtimeMs, memory: memoryMB,
      cases: [{ input: stdin || '(none)', expected: '', got: stderr || stdout, pass: false }],
      error: stderr || 'Runtime error',
    });
  }

  // Parse test case results from stdout
  if (testCases) {
    const cases = parseExecutionOutput(stdout, testCases);
    const allPassed = cases.every((c) => c.pass);

    return NextResponse.json({
      status: allPassed ? 'accepted' : 'wrong_answer',
      runtime: runtimeMs,
      memory: memoryMB,
      cases,
    });
  }

  // Raw execution mode (no test cases)
  return NextResponse.json({
    status: 'accepted',
    runtime: runtimeMs,
    memory: memoryMB,
    cases: [{ input: stdin || '(none)', expected: stdout, got: stdout, pass: true }],
  });
}

// ─── Local sandbox execution (JavaScript only) ──────────────────────────────

async function executeWithSandbox(
  code: string,
  testCases: StructuredTestCase[] | null
): Promise<NextResponse> {
  const executeJavaScript = await getExecuteJavaScript();
  const result = executeJavaScript(code, 5000);

  if (result.timedOut) {
    return NextResponse.json({
      status: 'time_limit',
      runtime: `${result.timeMs} ms`, memory: '—',
      cases: testCases
        ? testCases.map((tc) => ({ input: tc.display, expected: tc.expected, got: 'Time Limit Exceeded', pass: false }))
        : [{ input: '(none)', expected: '', got: 'Time Limit Exceeded', pass: false }],
      error: 'Time Limit Exceeded',
    });
  }

  if (result.error && !result.stdout) {
    // Distinguish compilation-style errors from runtime errors
    const isSyntax = result.error.includes('SyntaxError') || result.error.includes('Unexpected');
    return NextResponse.json({
      status: isSyntax ? 'compilation_error' : 'runtime_error',
      runtime: `${result.timeMs} ms`, memory: '—',
      cases: testCases
        ? testCases.map((tc) => ({ input: tc.display, expected: tc.expected, got: `Error: ${result.error}`, pass: false }))
        : [{ input: '(none)', expected: '', got: result.error, pass: false }],
      error: result.error,
    });
  }

  // Parse results
  if (testCases) {
    const cases = parseExecutionOutput(result.stdout, testCases);
    const allPassed = cases.every((c) => c.pass);

    return NextResponse.json({
      status: allPassed ? 'accepted' : 'wrong_answer',
      runtime: `${result.timeMs} ms`,
      memory: '—',
      cases,
    });
  }

  // Raw execution (no test cases)
  return NextResponse.json({
    status: 'accepted',
    runtime: `${result.timeMs} ms`,
    memory: '—',
    cases: [{ input: '(none)', expected: result.stdout, got: result.stdout, pass: true }],
  });
}
