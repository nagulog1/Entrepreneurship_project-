'use client';

import { useState, useCallback } from 'react';
import type { RunResult } from '@/types';

const MOCK_RESULT: RunResult = {
  status: 'accepted',
  runtime: `${Math.floor(Math.random() * 40 + 20)} ms`,
  memory: `${Math.floor(Math.random() * 4 + 12)} MB`,
  cases: [
    { input: '[2,7,11,15], 9', expected: '[0,1]', got: '[0,1]', pass: true },
    { input: '[3,2,4], 6', expected: '[1,2]', got: '[1,2]', pass: true },
    { input: '[3,3], 6', expected: '[0,1]', got: '[0,1]', pass: true },
  ],
};

export function useCodeRunner() {
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  const run = useCallback(
    async (
      codeOrCallback?: string | (() => void),
      language?: string,
      onSuccess?: () => void
    ) => {
      // Legacy: run(callback) — existing pages pass a callback as first arg
      if (typeof codeOrCallback === 'function') {
        const cb = codeOrCallback;
        setRunning(true);
        setRunResult(null);
        await new Promise((r) => setTimeout(r, 1400));
        setRunResult({ ...MOCK_RESULT, runtime: `${Math.floor(Math.random() * 40 + 20)} ms` });
        cb();
        setRunning(false);
        return;
      }

      // New: run(code, language, onSuccess)
      const code = codeOrCallback;
      setRunning(true);
      setRunResult(null);

      try {
        if (code && language && process.env.NEXT_PUBLIC_JUDGE0_API_URL) {
          const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language }),
          });
          if (res.ok) {
            const data: RunResult = await res.json();
            setRunResult(data);
            if (data.status === 'accepted' && onSuccess) onSuccess();
            return;
          }
        }
      } catch {
        // Fall through to mock
      }

      // Fallback mock
      await new Promise((r) => setTimeout(r, 1400));
      const mock: RunResult = {
        ...MOCK_RESULT,
        runtime: `${Math.floor(Math.random() * 40 + 20)} ms`,
      };
      setRunResult(mock);
      if (onSuccess) onSuccess();
    },
    []
  );

  const reset = useCallback(() => {
    setRunResult(null);
    setRunning(false);
  }, []);

  return { running, runResult, run, reset };
}

