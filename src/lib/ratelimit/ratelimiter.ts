/**
 * rateLimiter.ts — Sliding-window rate limiter using Upstash Redis (or ioredis).
 * Falls back to in-memory if Redis is unavailable (dev/test).
 *
 * Usage in API route:
 *   const result = await rateLimit(request, 'execute', { max: 10, window: 60 });
 *   if (!result.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
 */

import type { NextRequest } from "next/server";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp when the window resets
  limit: number;
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  max: number;
  /** Window size in seconds */
  window: number;
}

// ─── In-Memory Fallback ───────────────────────────────────────────────────────

interface MemoryEntry {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryEntry>();

function memoryRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + opts.window * 1000 });
    return { success: true, remaining: opts.max - 1, reset: now + opts.window * 1000, limit: opts.max };
  }

  if (entry.count >= opts.max) {
    return { success: false, remaining: 0, reset: entry.resetAt, limit: opts.max };
  }

  entry.count += 1;
  return { success: true, remaining: opts.max - entry.count, reset: entry.resetAt, limit: opts.max };
}

// ─── Redis Backend ─────────────────────────────────────────────────────────────

let redisClient: {
  multi(): { incr(k: string): unknown; expire(k: string, s: number): unknown; exec(): Promise<unknown[]> };
  get(key: string): Promise<string | null>;
  ttl(key: string): Promise<number>;
} | null = null;

async function getRedis() {
  if (redisClient) return redisClient;
  const url = process.env.RATE_LIMIT_REDIS_URL;
  if (!url) return null;

  try {
    // Support both @upstash/redis and ioredis
    if (url.startsWith("https://")) {
      const { Redis } = await import("@upstash/redis");
      redisClient = new Redis({ url, token: process.env.RATE_LIMIT_REDIS_TOKEN ?? "" }) as unknown as typeof redisClient;
    } else {
      const { default: IORedis } = await import("ioredis");
      redisClient = new IORedis(url) as unknown as typeof redisClient;
    }
    return redisClient;
  } catch {
    console.warn("[rateLimiter] Redis unavailable, using in-memory fallback.");
    return null;
  }
}

async function redisRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (!redis) return memoryRateLimit(key, opts);

  try {
    const pipeline = redis.multi();
    pipeline.incr(key);
    pipeline.expire(key, opts.window);
    const results = await pipeline.exec();

    const count = (results?.[0] as number | [null, number] | null);
    const current = typeof count === "number" ? count : Array.isArray(count) ? count[1] : 1;

    const ttl = await redis.ttl(key);
    const reset = Date.now() + ttl * 1000;

    if (current > opts.max) {
      return { success: false, remaining: 0, reset, limit: opts.max };
    }

    return { success: true, remaining: opts.max - current, reset, limit: opts.max };
  } catch (err) {
    console.error("[rateLimiter] Redis error, falling back to memory:", err);
    return memoryRateLimit(key, opts);
  }
}

// ─── Named Limit Presets ───────────────────────────────────────────────────────

const PRESETS: Record<string, RateLimitOptions> = {
  execute:    { max: 10,  window: 60  }, // code execution: 10/min
  submit:     { max: 30,  window: 60  }, // submissions: 30/min
  register:   { max: 20,  window: 300 }, // event registration: 20/5min
  auth:       { max: 10,  window: 300 }, // auth actions: 10/5min
  teamRequest:{ max: 20,  window: 300 }, // team requests: 20/5min
  payment:    { max: 5,   window: 60  }, // payment initiation: 5/min
  email:      { max: 5,   window: 300 }, // transactional email: 5/5min
  api:        { max: 100, window: 60  }, // general API: 100/min
  search:     { max: 60,  window: 60  }, // search: 60/min
};

// ─── Public API ───────────────────────────────────────────────────────────────

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
  preset: keyof typeof PRESETS | RateLimitOptions,
  /** Optional: include userId in the key for per-user limits */
  userId?: string
): Promise<RateLimitResult> {
  const opts = typeof preset === "string" ? PRESETS[preset] : preset;
  const ip = getClientIp(request);
  const presetName = typeof preset === "string" ? preset : "custom";
  const key = `rl:${presetName}:${userId ?? ip}`;

  return redisRateLimit(key, opts);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
    ...(result.success ? {} : { "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)) }),
  };
}