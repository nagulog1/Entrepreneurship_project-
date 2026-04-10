import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Reset by using unique identifiers per test
  });

  it('allows requests within limit', () => {
    const id = `test-allow-${Date.now()}`;
    const result = checkRateLimit(id, RATE_LIMITS.execute);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('blocks after exhausting tokens', () => {
    const id = `test-block-${Date.now()}`;
    const config = { maxTokens: 3, refillRate: 0.01, tokensPerRequest: 1 };

    checkRateLimit(id, config);
    checkRateLimit(id, config);
    checkRateLimit(id, config);
    const result = checkRateLimit(id, config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks remaining tokens correctly', () => {
    const id = `test-remaining-${Date.now()}`;
    const config = { maxTokens: 5, refillRate: 0.001, tokensPerRequest: 1 };

    const r1 = checkRateLimit(id, config);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit(id, config);
    expect(r2.remaining).toBe(3);
  });

  it('applies custom tokens per request', () => {
    const id = `test-custom-${Date.now()}`;
    const config = { maxTokens: 5, refillRate: 0.001, tokensPerRequest: 3 };

    const r1 = checkRateLimit(id, config);
    expect(r1.allowed).toBe(true);

    const r2 = checkRateLimit(id, config);
    expect(r2.allowed).toBe(false);
  });

  it('uses separate buckets for different identifiers', () => {
    const config = { maxTokens: 1, refillRate: 0.001, tokensPerRequest: 1 };

    const r1 = checkRateLimit(`user-a-${Date.now()}`, config);
    const r2 = checkRateLimit(`user-b-${Date.now()}`, config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });
});
