"use client";

import { useState } from "react";
import type { RunResult } from "@/types";

export function useCodeRunner() {
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  const run = (onSuccess?: () => void) => {
    setRunning(true);
    setRunResult(null);

    setTimeout(() => {
      setRunning(false);
      const result: RunResult = {
        status: "accepted",
        runtime: "48ms",
        memory: "42.1 MB",
        cases: [
          { input: "[2,7,11,15], 9", expected: "[0,1]", got: "[0,1]", pass: true },
          { input: "[3,2,4], 6", expected: "[1,2]", got: "[1,2]", pass: true },
          { input: "[3,3], 6", expected: "[0,1]", got: "[0,1]", pass: true },
        ],
      };
      setRunResult(result);
      onSuccess?.();
    }, 2000);
  };

  const reset = () => setRunResult(null);

  return { running, runResult, run, reset };
}
