import { NextRequest, NextResponse } from 'next/server';

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
    const { code, language, stdin = '' } = await req.json();

    const apiKey = process.env.JUDGE0_API_KEY;
    const apiUrl =
      process.env.NEXT_PUBLIC_JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
    const languageId = LANGUAGE_IDS[language] ?? 63;

    // ── No API key → return deterministic mock ────────────────────────────────
    if (!apiKey) {
      return NextResponse.json({
        status: 'accepted',
        runtime: `${Math.floor(Math.random() * 40 + 20)} ms`,
        memory: `${Math.floor(Math.random() * 4 + 12)} MB`,
        cases: [
          { input: '[2,7,11,15], 9', expected: '[0,1]', got: '[0,1]', pass: true },
          { input: '[3,2,4], 6',     expected: '[1,2]', got: '[1,2]', pass: true },
          { input: '[3,3], 6',       expected: '[0,1]', got: '[0,1]', pass: true },
        ],
      });
    }

    // ── Call Judge0 ───────────────────────────────────────────────────────────
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

    if (!res.ok) {
      throw new Error(`Judge0 responded with ${res.status}`);
    }

    const data = await res.json();
    const statusId: number = data.status?.id ?? 13;
    const mappedStatus = STATUS_MAP[statusId] ?? 'runtime_error';

    const runtimeMs = data.time
      ? `${Math.round(parseFloat(data.time) * 1000)} ms`
      : '—';
    const memoryMB = data.memory
      ? `${(data.memory / 1024).toFixed(1)} MB`
      : '—';

    return NextResponse.json({
      status: mappedStatus,
      runtime: runtimeMs,
      memory: memoryMB,
      stdout: data.stdout ?? null,
      stderr: data.stderr ?? null,
      compile_output: data.compile_output ?? null,
      // Synthesise test cases from stdout when possible
      cases:
        mappedStatus === 'accepted'
          ? [{ input: stdin || '(custom)', expected: data.stdout ?? '', got: data.stdout ?? '', pass: true }]
          : [{ input: stdin || '(custom)', expected: '', got: data.stdout ?? data.stderr ?? '', pass: false }],
    });
  } catch (err) {
    console.error('[/api/execute]', err);
    return NextResponse.json(
      {
        status: 'runtime_error',
        runtime: '—',
        memory: '—',
        cases: [],
        error: 'Execution service unavailable. Please try again.',
      },
      { status: 500 }
    );
  }
}
