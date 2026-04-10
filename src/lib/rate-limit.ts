// ─── In-Memory Rate Limiter ──────────────────────────────────────────────────
// Simple token-bucket rate limiter for Next.js API routes.
// For production at scale, replace with Redis-backed rate limiting.

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now - entry.lastRefill > 600_000) { // 10 min stale
        store.delete(key);
      }
    });
  }, 300_000);
}

interface RateLimitConfig {
  /** Max tokens in bucket */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
  /** Tokens consumed per request */
  tokensPerRequest?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const tokensPerRequest = config.tokensPerRequest ?? 1;

  let entry = store.get(identifier);

  if (!entry) {
    entry = { tokens: config.maxTokens, lastRefill: now };
    store.set(identifier, entry);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000;
  entry.tokens = Math.min(config.maxTokens, entry.tokens + elapsed * config.refillRate);
  entry.lastRefill = now;

  if (entry.tokens >= tokensPerRequest) {
    entry.tokens -= tokensPerRequest;
    return { allowed: true, remaining: Math.floor(entry.tokens) };
  }

  // Calculate when next token will be available
  const deficit = tokensPerRequest - entry.tokens;
  const retryAfterMs = Math.ceil((deficit / config.refillRate) * 1000);

  return { allowed: false, remaining: 0, retryAfterMs };
}

// ─── Preset Configurations ──────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** Code execution: 10 requests per minute per IP */
  execute: { maxTokens: 10, refillRate: 10 / 60, tokensPerRequest: 1 },
  /** Auth session: 20 requests per minute per IP */
  auth: { maxTokens: 20, refillRate: 20 / 60, tokensPerRequest: 1 },
  /** General API: 60 requests per minute per IP */
  general: { maxTokens: 60, refillRate: 1, tokensPerRequest: 1 },
} as const;
