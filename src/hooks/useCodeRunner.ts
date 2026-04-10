'use client';

import { useState, useCallback } from 'react';
import type { RunResult } from '@/types';

export interface CodeRunnerTestCase {
  input: string;
  expected: string;
}

export function useCodeRunner() {
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  const run = useCallback(
    async (
      code: string,
      language: string,
      options?: {
        testCases?: CodeRunnerTestCase[];
        functionName?: string;
        onSuccess?: () => void;
      }
    ) => {
      setRunning(true);
      setRunResult(null);

      try {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            testCases: options?.testCases,
            functionName: options?.functionName,
          }),
        });

        const data: RunResult = await res.json();
        setRunResult(data);

        if (data.status === 'accepted' && options?.onSuccess) {
          options.onSuccess();
        }
      } catch {
        setRunResult({
          status: 'runtime_error',
          runtime: '—',
          memory: '—',
          cases: [],
          error: 'Network error. Check your connection and try again.',
        });
      } finally {
        setRunning(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setRunResult(null);
    setRunning(false);
  }, []);

  return { running, runResult, run, reset };
}

