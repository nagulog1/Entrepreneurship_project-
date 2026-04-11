export const LANGUAGE_IDS: Record<string, number> = {
  JavaScript: 63,
  Python: 71,
  Java: 62,
  'C++': 54,
  C: 50,
  TypeScript: 74,
  Go: 60,
  Rust: 73,
};

export const STATUS_MAP: Record<number, string> = {
  3: 'accepted',
  4: 'wrong_answer',
  5: 'time_limit',
  6: 'compilation_error',
  7: 'runtime_error',
  8: 'runtime_error',
  9: 'runtime_error',
  10: 'runtime_error',
  11: 'runtime_error',
  12: 'runtime_error',
  13: 'runtime_error',
  14: 'runtime_error',
};

export interface Judge0Result {
  status: { id: number; description: string };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
  token: string;
}

export async function submitToJudge0(
  code: string,
  language: string,
  stdin = ''
): Promise<Judge0Result> {
  const apiUrl =
    process.env.NEXT_PUBLIC_JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
  const apiKey = process.env.JUDGE0_API_KEY || '';
  const languageId = LANGUAGE_IDS[language] ?? 63;

  const res = await fetch(`${apiUrl}/submissions?base64_encoded=false&wait=true`, {
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
  });

  if (!res.ok) throw new Error(`Judge0 error: ${res.status}`);
  return res.json();
}

export function mapJudge0Status(
  statusId: number
): 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compilation_error' {
  return (STATUS_MAP[statusId] as ReturnType<typeof mapJudge0Status>) ?? 'runtime_error';
}
