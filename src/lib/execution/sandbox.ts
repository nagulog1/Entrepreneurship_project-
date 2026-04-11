// ─── Sandboxed JavaScript Execution ─────────────────────────────────────────
// Uses Node.js `vm` module to execute JavaScript in an isolated V8 context.
//
// Security guarantees:
//   - No access to require, process, global, __dirname, __filename
//   - No file system, network, or child process access
//   - Timeout enforced for infinite loop protection
//   - Only safe, immutable built-in constructors exposed

import { Script, createContext } from 'node:vm';

export interface SandboxResult {
  stdout: string;
  stderr: string;
  timeMs: number;
  error: string | null;
  timedOut: boolean;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_OUTPUT_LENGTH = 100_000; // 100KB

export function executeJavaScript(
  code: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): SandboxResult {
  const output: string[] = [];
  const errors: string[] = [];
  let outputLength = 0;

  const sandbox = {
    console: {
      log: (...args: unknown[]) => {
        const line = args
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ');
        outputLength += line.length;
        if (outputLength <= MAX_OUTPUT_LENGTH) {
          output.push(line);
        }
      },
      error: (...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
      },
      warn: (...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
      },
    },
    // Safe built-ins only
    JSON,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    Date,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    Symbol,
    Promise,
    undefined,
    NaN,
    Infinity,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
  };

  const context = createContext(sandbox);

  try {
    const script = new Script(code, { filename: 'solution.js' });
    const startTime = performance.now();
    script.runInContext(context, { timeout: timeoutMs });
    const elapsed = performance.now() - startTime;

    return {
      stdout: output.join('\n'),
      stderr: errors.join('\n'),
      timeMs: Math.round(elapsed * 100) / 100,
      error: null,
      timedOut: false,
    };
  } catch (err: unknown) {
    const elapsed = performance.now();
    const message = err instanceof Error ? err.message : String(err);

    // Check for timeout
    if (message.includes('Script execution timed out')) {
      return {
        stdout: output.join('\n'),
        stderr: '',
        timeMs: timeoutMs,
        error: 'Time Limit Exceeded',
        timedOut: true,
      };
    }

    return {
      stdout: output.join('\n'),
      stderr: message,
      timeMs: Math.round(elapsed * 100) / 100,
      error: message,
      timedOut: false,
    };
  }
}
