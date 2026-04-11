/**
 * Unit tests for core services.
 * Run with: npx jest tests/unit
 */

// ─── Mock setup ───────────────────────────────────────────────────────────────

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _type: "serverTimestamp" })),
  increment: jest.fn((n) => ({ _type: "increment", value: n })),
  arrayUnion: jest.fn((v) => ({ _type: "arrayUnion", value: v })),
  arrayRemove: jest.fn((v) => ({ _type: "arrayRemove", value: v })),
  runTransaction: jest.fn(),
  Timestamp: { fromDate: jest.fn((d) => ({ toDate: () => d })) },
}));

// Mock Firebase Admin
jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  cert: jest.fn((c) => c),
}));

// Mock SendGrid
jest.mock("@sendgrid/mail", () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

// Mock Razorpay
jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: "order_test123",
        amount: 49900,
        currency: "INR",
        status: "created",
        receipt: "test_receipt",
      }),
      fetch: jest.fn(),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: "sub_test123",
        plan_id: "plan_pro_monthly",
        status: "created",
        paid_count: 0,
        total_count: 12,
      }),
      cancel: jest.fn().mockResolvedValue({}),
      fetch: jest.fn(),
    },
    payments: {
      refund: jest.fn().mockResolvedValue({ id: "rfnd_test", amount: 49900, status: "processed" }),
    },
  }));
});

// ─── Rate Limiter Tests ───────────────────────────────────────────────────────

describe("Rate Limiter", () => {
  let rateLimit: typeof import("@/lib/ratelimit/rateLimiter").rateLimit;
  let getClientIp: typeof import("@/lib/ratelimit/rateLimiter").getClientIp;

  beforeEach(async () => {
    jest.resetModules();
    const module = await import("@/lib/ratelimit/rateLimiter");
    rateLimit = module.rateLimit;
    getClientIp = module.getClientIp;
  });

  function makeRequest(ip = "127.0.0.1"): Request {
    return {
      headers: {
        get: (name: string) => {
          if (name === "x-forwarded-for") return ip;
          return null;
        },
      },
      url: "http://localhost/api/test",
    } as unknown as Request;
  }

  it("should allow requests within limit", async () => {
    const req = makeRequest("10.0.0.1");
    const result = await rateLimit(req as unknown as import("next/server").NextRequest, {
      max: 5,
      window: 60,
    });
    expect(result.success).toBe(true);
    expect(result.remaining).toBeLessThan(5);
  });

  it("should block requests exceeding limit", async () => {
    const req = makeRequest("10.0.0.2");
    const opts = { max: 2, window: 60 };

    await rateLimit(req as unknown as import("next/server").NextRequest, opts);
    await rateLimit(req as unknown as import("next/server").NextRequest, opts);
    const result = await rateLimit(req as unknown as import("next/server").NextRequest, opts);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should use different buckets for different IPs", async () => {
    const req1 = makeRequest("192.168.1.1");
    const req2 = makeRequest("192.168.1.2");
    const opts = { max: 1, window: 60 };

    await rateLimit(req1 as unknown as import("next/server").NextRequest, opts);
    const result = await rateLimit(req2 as unknown as import("next/server").NextRequest, opts);

    expect(result.success).toBe(true);
  });

  it("getClientIp should prefer cf-connecting-ip", () => {
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "cf-connecting-ip") return "1.2.3.4";
          if (name === "x-forwarded-for") return "5.6.7.8";
          return null;
        },
      },
    } as unknown as import("next/server").NextRequest;

    expect(getClientIp(req)).toBe("1.2.3.4");
  });
});

// ─── Payment Service Tests ────────────────────────────────────────────────────

describe("Payment Service", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";
  });

  it("verifyPaymentSignature should return valid=true for correct signature", async () => {
    const crypto = await import("crypto");
    const { verifyPaymentSignature } = await import("@/lib/payments/paymentService");

    const orderId = "order_123";
    const paymentId = "pay_456";
    const secret = "test_secret";
    const body = `${orderId}|${paymentId}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const result = verifyPaymentSignature({ orderId, paymentId, signature });
    expect(result.valid).toBe(true);
  });

  it("verifyPaymentSignature should return valid=false for wrong signature", async () => {
    const { verifyPaymentSignature } = await import("@/lib/payments/paymentService");
    const result = verifyPaymentSignature({
      orderId: "order_123",
      paymentId: "pay_456",
      signature: "wrong_signature",
    });
    expect(result.valid).toBe(false);
  });

  it("verifyWebhookSignature should validate correctly", async () => {
    const crypto = await import("crypto");
    const { verifyWebhookSignature } = await import("@/lib/payments/paymentService");

    const body = Buffer.from(JSON.stringify({ event: "payment.captured" }));
    const secret = "test_webhook_secret";
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyWebhookSignature(body, sig)).toBe(true);
    expect(verifyWebhookSignature(body, "wrong_sig")).toBe(false);
  });

  it("createOrder should return an order object", async () => {
    const { createOrder } = await import("@/lib/payments/paymentService");
    const order = await createOrder({
      amount: 49900,
      receipt: "receipt_001",
    });

    expect(order.id).toBe("order_test123");
    expect(order.amount).toBe(49900);
    expect(order.currency).toBe("INR");
  });

  it("inPaise and inRupees should convert correctly", async () => {
    const { inPaise, inRupees } = await import("@/lib/payments/paymentService");
    expect(inPaise(499)).toBe(49900);
    expect(inRupees(49900)).toBe(499);
  });

  it("PLANS should have valid structure", async () => {
    const { PLANS } = await import("@/lib/payments/paymentService");
    expect(PLANS.pro_monthly.amount).toBeGreaterThan(0);
    expect(PLANS.pro_annual.amount).toBeGreaterThan(0);
    expect(PLANS.pro_annual.amount).toBeLessThan(PLANS.pro_monthly.amount * 12);
    expect(PLANS.pro_monthly.features.length).toBeGreaterThan(0);
  });
});

// ─── Email Service Tests ──────────────────────────────────────────────────────

describe("Email Service", () => {
  beforeEach(() => {
    process.env.SENDGRID_API_KEY = "SG.test_key";
    process.env.SENDGRID_FROM_EMAIL = "test@uni-o.in";
    process.env.NEXTAUTH_URL = "https://uni-o.in";
  });

  it("getWelcomeEmailHtml should contain user name", async () => {
    const { getWelcomeEmailHtml } = await import("@/lib/email/emailService");
    const html = getWelcomeEmailHtml("Aryan");
    expect(html).toContain("Aryan");
    expect(html).toContain("Uni-O");
  });

  it("getEventRegistrationHtml should include event title", async () => {
    const { getEventRegistrationHtml } = await import("@/lib/email/emailService");
    const html = getEventRegistrationHtml({
      userName: "Priya",
      eventTitle: "HackIndia 2025",
      eventDate: "2025-10-01",
    });
    expect(html).toContain("HackIndia 2025");
    expect(html).toContain("Priya");
  });
});

// ─── Environment Validation Tests ─────────────────────────────────────────────

describe("Environment Validation", () => {
  it("getPublicEnv should warn about missing keys in development", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { getPublicEnv } = await import("@/validation/env");

    // Clear all public env vars
    const keys = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    ];
    const originals: Record<string, string | undefined> = {};
    for (const key of keys) {
      originals[key] = process.env[key];
      delete process.env[key];
    }

    getPublicEnv();
    expect(warnSpy).toHaveBeenCalled();

    // Restore
    for (const key of keys) {
      if (originals[key]) process.env[key] = originals[key];
    }
    warnSpy.mockRestore();
  });
});

// ─── Monitoring Tests ─────────────────────────────────────────────────────────

describe("Monitoring / Logger", () => {
  it("createLogger should not throw on info/warn/debug", async () => {
    const { createLogger } = await import("@/lib/monitoring/monitoring");
    const logger = createLogger("test");

    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    expect(() => logger.info("test message", { foo: "bar" })).not.toThrow();
    consoleSpy.mockRestore();
  });

  it("captureError should not throw even if Sentry fails", async () => {
    jest.mock("@sentry/nextjs", () => ({
      withScope: jest.fn().mockImplementation(() => { throw new Error("Sentry not available"); }),
      captureException: jest.fn(),
    }));

    const { captureError } = await import("@/lib/monitoring/monitoring");
    await expect(captureError(new Error("test error"))).resolves.not.toThrow();
  });
});