/**
 * rateLimiter.ts — In-memory sliding window rate limiter.
 * Zero external dependencies. Works perfectly for a single-server
 * Next.js deployment. Swap for Redis later if needed.
 */

import type { NextRequest } from "next/server";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

interface RateLimitOptions {
  max: number;
  window: number; // seconds
}

// ── In-memory store ───────────────────────────────────────────────────────────

interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

function memoryRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.window * 1000 });
    return { success: true, remaining: opts.max - 1, reset: now + opts.window * 1000, limit: opts.max };
  }

  if (entry.count >= opts.max) {
    return { success: false, remaining: 0, reset: entry.resetAt, limit: opts.max };
  }

  entry.count += 1;
  return { success: true, remaining: opts.max - entry.count, reset: entry.resetAt, limit: opts.max };
}

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS: Record<string, RateLimitOptions> = {
  execute:     { max: 10,  window: 60  },
  submit:      { max: 30,  window: 60  },
  register:    { max: 20,  window: 300 },
  auth:        { max: 10,  window: 300 },
  teamRequest: { max: 20,  window: 300 },
  payment:     { max: 5,   window: 60  },
  email:       { max: 5,   window: 300 },
  api:         { max: 100, window: 60  },
  search:      { max: 60,  window: 60  },
};

// ── Public API ────────────────────────────────────────────────────────────────

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function rateLimit(
  request: NextRequest,
  preset: string | RateLimitOptions,
  userId?: string
): Promise<RateLimitResult> {
  const opts = typeof preset === "string" ? (PRESETS[preset] ?? PRESETS.api) : preset;
  const ip = getClientIp(request);
  const presetName = typeof preset === "string" ? preset : "custom";
  const key = `rl:${presetName}:${userId ?? ip}`;
  return memoryRateLimit(key, opts);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit":     String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset":     String(Math.ceil(result.reset / 1000)),
    ...(result.success ? {} : { "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)) }),
  };
}