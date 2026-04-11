/**
 * Integration tests for API routes.
 * Uses supertest + Next.js test server.
 * Run with: npx jest tests/integration
 */

import { createServer } from "http";
import { NextRequest } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    ip?: string;
  } = {}
): NextRequest {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": options.ip || "127.0.0.1",
      ...(options.headers || {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };
  return new NextRequest(url, init);
}

// ─── Execute API Tests ────────────────────────────────────────────────────────

describe("POST /api/execute", () => {
  let handler: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    jest.resetModules();
    // Mock rate limiter to always allow
    jest.mock("@/lib/ratelimit/rateLimiter", () => ({
      rateLimit: jest.fn().mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000, limit: 10 }),
      rateLimitHeaders: jest.fn().mockReturnValue({}),
      getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
    }));

    // Mock Firebase Admin (auth)
    jest.mock("@/lib/firebase/firebaseAdmin", () => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error("No auth")),
    }));

    const module = await import("@/app/api/execute/route");
    handler = module.POST as unknown as typeof handler;
  });

  it("should reject requests with no code", async () => {
    const req = makeRequest("/api/execute", {
      method: "POST",
      body: { language: "JavaScript", testCases: [{ input: "1", expected: "1" }] },
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("code is required");
  });

  it("should reject code that is too long", async () => {
    const req = makeRequest("/api/execute", {
      method: "POST",
      body: {
        code: "x".repeat(50001),
        language: "JavaScript",
        testCases: [{ input: "1", expected: "1" }],
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("too long");
  });

  it("should reject too many test cases", async () => {
    const req = makeRequest("/api/execute", {
      method: "POST",
      body: {
        code: "console.log(1)",
        language: "JavaScript",
        testCases: Array.from({ length: 21 }, (_, i) => ({
          input: String(i),
          expected: String(i),
        })),
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("Maximum 20");
  });

  it("should reject unsupported language", async () => {
    const req = makeRequest("/api/execute", {
      method: "POST",
      body: {
        code: "puts 'hello'",
        language: "Ruby",
        testCases: [{ input: "", expected: "hello" }],
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("Unsupported language");
  });

  it("should block dangerous code patterns", async () => {
    const req = makeRequest("/api/execute", {
      method: "POST",
      body: {
        code: "const { exec } = require('child_process'); exec('ls');",
        language: "JavaScript",
        testCases: [{ input: "", expected: "" }],
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("disallowed");
  });

  it("should block process.exit", async () => {
    const req = makeRequest("/api/execute", {
      method: "POST",
      body: {
        code: "process.exit(0);",
        language: "JavaScript",
        testCases: [{ input: "", expected: "" }],
      },
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
  });
});

// ─── Rate Limiter Integration ─────────────────────────────────────────────────

describe("Rate Limiting Integration", () => {
  it("should return 429 after exceeding execute limit", async () => {
    jest.resetModules();

    let callCount = 0;
    jest.mock("@/lib/ratelimit/rateLimiter", () => ({
      rateLimit: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount > 10) {
          return Promise.resolve({ success: false, remaining: 0, reset: Date.now() + 60000, limit: 10 });
        }
        return Promise.resolve({ success: true, remaining: 10 - callCount, reset: Date.now() + 60000, limit: 10 });
      }),
      rateLimitHeaders: jest.fn().mockReturnValue({ "Retry-After": "60" }),
      getClientIp: jest.fn().mockReturnValue("10.0.0.100"),
    }));

    jest.mock("@/lib/firebase/firebaseAdmin", () => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error("No auth")),
    }));

    const module = await import("@/app/api/execute/route");
    const handler = module.POST as unknown as (req: NextRequest) => Promise<Response>;

    const req = makeRequest("/api/execute", {
      method: "POST",
      body: {
        code: "console.log(1)",
        language: "JavaScript",
        testCases: [{ input: "", expected: "1" }],
      },
    });

    // Simulate being past the limit
    callCount = 11;
    const res = await handler(req);
    expect(res.status).toBe(429);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("rate limit");
  });
});

// ─── Event Registration Integration ──────────────────────────────────────────

describe("POST /api/events/:id/register", () => {
  it("should return 401 for unauthenticated requests", async () => {
    jest.resetModules();

    jest.mock("@/lib/firebase/firebaseAdmin", () => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error("Unauthorized")),
    }));

    jest.mock("@/lib/ratelimit/rateLimiter", () => ({
      rateLimit: jest.fn().mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 300000, limit: 20 }),
      rateLimitHeaders: jest.fn().mockReturnValue({}),
    }));

    const module = await import("@/app/api/events/[eventId]/register/route");
    const handler = module.POST as unknown as (req: NextRequest, ctx: { params: { eventId: string } }) => Promise<Response>;

    const req = makeRequest("/api/events/evt1/register", { method: "POST", body: {} });
    const res = await handler(req, { params: { eventId: "evt1" } });

    expect(res.status).toBe(401);
  });

  it("should return 409 for duplicate registration", async () => {
    jest.resetModules();

    jest.mock("@/lib/firebase/firebaseAdmin", () => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: "user_123",
        email: "test@test.com",
        name: "Test User",
      }),
    }));

    jest.mock("@/lib/firebase/firestoreService", () => ({
      registerForEvent: jest.fn().mockRejectedValue(new Error("ALREADY_REGISTERED")),
    }));

    jest.mock("@/lib/ratelimit/rateLimiter", () => ({
      rateLimit: jest.fn().mockResolvedValue({ success: true, remaining: 19, reset: Date.now() + 300000, limit: 20 }),
      rateLimitHeaders: jest.fn().mockReturnValue({}),
    }));

    jest.mock("@/lib/email/emailService", () => ({
      sendEventRegistrationEmail: jest.fn().mockResolvedValue(undefined),
    }));

    jest.mock("@/lib/monitoring/monitoring", () => ({
      captureError: jest.fn(),
    }));

    const module = await import("@/app/api/events/[eventId]/register/route");
    const handler = module.POST as unknown as (req: NextRequest, ctx: { params: { eventId: string } }) => Promise<Response>;

    const req = makeRequest("/api/events/evt1/register", {
      method: "POST",
      body: {},
      headers: { Authorization: "Bearer valid_token" },
    });
    const res = await handler(req, { params: { eventId: "evt1" } });

    expect(res.status).toBe(409);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("already registered");
  });
});

// ─── Middleware Tests ─────────────────────────────────────────────────────────

describe("Middleware Security Headers", () => {
  it("should set security headers on all responses", async () => {
    const { middleware } = await import("@/middleware");

    const req = new NextRequest("http://localhost/challenges");
    const res = middleware(req);

    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  it("should block suspicious bots on execute endpoint", async () => {
    const { middleware } = await import("@/middleware");

    const req = new NextRequest("http://localhost/api/execute", {
      headers: { "user-agent": "python-requests/2.28.0" },
    });
    const res = middleware(req);

    expect(res.status).toBe(403);
  });
});