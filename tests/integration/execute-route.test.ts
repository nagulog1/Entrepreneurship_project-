/**
 * @jest-environment node
 *
 * Integration tests for the /api/execute route.
 * These test input validation and rate limiting without calling Judge0.
 */

import { NextRequest } from 'next/server';

// Mock the rate limiter to control behavior
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 9 }),
  RATE_LIMITS: {
    execute: { maxTokens: 10, refillRate: 0.167, tokensPerRequest: 1 },
    auth: { maxTokens: 20, refillRate: 0.333, tokensPerRequest: 1 },
    general: { maxTokens: 60, refillRate: 1, tokensPerRequest: 1 },
  },
}));

jest.mock('@/lib/monitoring', () => ({
  serverLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Import after mocks
import { POST } from '@/app/api/execute/route';
import { checkRateLimit } from '@/lib/rate-limit';

const mockedCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/execute', () => {
  beforeEach(() => {
    mockedCheckRateLimit.mockReturnValue({ allowed: true, remaining: 9 });
    delete process.env.JUDGE0_API_KEY;
  });

  it('returns mock result when no Judge0 API key', async () => {
    const req = makeRequest({ code: 'console.log("hi")', language: 'JavaScript' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('accepted');
    expect(data.cases).toHaveLength(3);
  });

  it('rejects empty code', async () => {
    const req = makeRequest({ code: '', language: 'JavaScript' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('rejects code exceeding max length', async () => {
    const req = makeRequest({ code: 'a'.repeat(60000), language: 'JavaScript' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('maximum length');
  });

  it('rejects unsupported language', async () => {
    const req = makeRequest({ code: 'print("hi")', language: 'Brainfuck' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Unsupported');
  });

  it('returns 429 when rate limited', async () => {
    mockedCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0, retryAfterMs: 5000 });

    const req = makeRequest({ code: 'console.log(1)', language: 'JavaScript' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain('Too many requests');
    expect(res.headers.get('Retry-After')).toBe('5');
  });

  it('rejects oversized stdin', async () => {
    const req = makeRequest({ code: 'x', language: 'Python', stdin: 'a'.repeat(20000) });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('stdin');
  });
});
