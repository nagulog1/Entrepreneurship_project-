/**
 * monitoring.ts — Sentry error monitoring + structured logging.
 * Sentry is fully optional — all functions degrade gracefully to
 * console.* when @sentry/nextjs is not installed or not configured.
 */

import type { User } from "@/types";

// ── Sentry loader (never throws) ──────────────────────────────────────────────

type SentryModule = typeof import("@sentry/nextjs");

async function getSentry(): Promise<SentryModule | null> {
  try {
    return await import("@sentry/nextjs");
  } catch {
    // Package not installed — silent fallback
    return null;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initSentry(dsn: string, release?: string) {
  getSentry().then((Sentry) => {
    if (!Sentry || !dsn) return;
    Sentry.init({
      dsn,
      release,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      beforeSend(event) {
        if (event.user) delete event.user.ip_address;
        if (event.exception?.values?.[0]?.value?.includes("ResizeObserver loop")) return null;
        return event;
      },
    });
  }).catch(() => {});
}

// ── User context ──────────────────────────────────────────────────────────────

export async function setSentryUser(user: Pick<User, "id" | "name" | "email"> | null) {
  const Sentry = await getSentry();
  if (!Sentry) return;
  if (user) {
    Sentry.setUser({ id: user.id, username: user.name, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

// ── Error capture ─────────────────────────────────────────────────────────────

export async function captureError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  // Always log to console regardless of Sentry
  console.error("[error]", error, context ?? "");

  try {
    const Sentry = await getSentry();
    if (!Sentry) return;
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      }
      Sentry.captureException(error);
    });
  } catch {
    // Never let monitoring crash the app
  }
}

export async function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const Sentry = await getSentry();
    if (!Sentry) return;
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      }
      Sentry.captureMessage(message, level);
    });
  } catch {
    // ignore
  }
}

// ── Structured logger ─────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  constructor(private name: string) {}

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
    const prefix = `[${this.name}]`;
    switch (level) {
      case "debug":
        if (process.env.NODE_ENV !== "production") console.debug(prefix, message, context ?? "");
        break;
      case "info":
        console.info(prefix, message, context ?? "");
        break;
      case "warn":
        console.warn(prefix, message, context ?? "");
        break;
      case "error":
        console.error(prefix, message, error ?? "", context ?? "");
        if (error) void captureError(error, { message, ...context });
        break;
    }
  }

  debug(msg: string, ctx?: Record<string, unknown>) { this.log("debug", msg, ctx); }
  info (msg: string, ctx?: Record<string, unknown>) { this.log("info",  msg, ctx); }
  warn (msg: string, ctx?: Record<string, unknown>) { this.log("warn",  msg, ctx); }
  error(msg: string, err?: unknown, ctx?: Record<string, unknown>) { this.log("error", msg, ctx, err); }
}

export function createLogger(name: string) {
  return new Logger(name);
}

// ── Performance ───────────────────────────────────────────────────────────────

export async function trackPerformance(
  name: string,
  operation: string,
  fn: () => Promise<unknown>
): Promise<unknown> {
  const start = Date.now();
  let span: { end(): void } | null = null;

  try {
    const Sentry = await getSentry();
    if (Sentry) {
      span = Sentry.startInactiveSpan({ name, op: operation }) as typeof span;
    }
  } catch {
    // Sentry span creation failed — continue without it
  }

  try {
    const result = await fn();
    span?.end();
    const duration = Date.now() - start;
    if (duration > 5000) console.warn(`[performance] Slow: ${name} took ${duration}ms`);
    return result;
  } catch (err) {
    span?.end();
    throw err;
  }
}

// ── Health check ──────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, { ok: boolean; latency?: number; error?: string }>;
  timestamp: string;
}

export async function runHealthChecks(): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {};
  let overall: HealthStatus["status"] = "healthy";

  // Firestore
  try {
    const start = Date.now();
    const { getAdminDb } = await import("@/lib/firebase/firebaseAdmin");
    await getAdminDb().collection("_health").limit(1).get();
    checks.firestore = { ok: true, latency: Date.now() - start };
  } catch (err) {
    checks.firestore = { ok: false, error: String(err) };
    overall = "unhealthy";
  }

  // Redis
  checks.redis = { ok: true }; // in-memory fallback always available

  // SendGrid
  checks.sendgrid = { ok: !!process.env.SENDGRID_API_KEY };
  if (!checks.sendgrid.ok && overall === "healthy") overall = "degraded";

  // Sentry
  checks.sentry = { ok: !!(await getSentry()) };

  return { status: overall, checks, timestamp: new Date().toISOString() };
}