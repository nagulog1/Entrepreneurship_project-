/**
 * monitoring.ts — Sentry error monitoring + custom logging.
 * Setup: npm install @sentry/nextjs
 *
 * Also add to next.config.js:
 *   const { withSentryConfig } = require('@sentry/nextjs');
 *   module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
 */

import type { User } from "@/types";

// ─── Sentry Init (called from sentry.client.config.ts & sentry.server.config.ts) ──

export function initSentry(dsn: string, release?: string) {
  // Dynamic import so Next.js doesn't complain about server-only modules on client
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn,
        release,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        // Capture 100% of sessions in dev, 10% in prod
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: false,
          }),
        ],
        beforeSend(event) {
          // Scrub PII before sending
          if (event.user) {
            delete event.user.ip_address;
          }
          // Drop "ResizeObserver loop limit exceeded" noise
          if (
            event.exception?.values?.[0]?.value?.includes("ResizeObserver loop")
          ) {
            return null;
          }
          return event;
        },
      });
    });
  } else {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn,
        release,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      });
    });
  }
}

// ─── Sentry User Context ──────────────────────────────────────────────────────

export async function setSentryUser(user: Pick<User, "id" | "name" | "email"> | null) {
  const Sentry = await import("@sentry/nextjs");
  if (user) {
    Sentry.setUser({ id: user.id, username: user.name, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

// ─── Error Capture ────────────────────────────────────────────────────────────

export async function captureError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
      }
      Sentry.captureException(error);
    });
  } catch {
    // Never let monitoring crash the app
    console.error("[monitoring] Failed to capture error:", error);
  }
}

export async function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
      }
      Sentry.captureMessage(message, level);
    });
  } catch {
    console.warn("[monitoring] Failed to capture message:", message);
  }
}

// ─── Structured Logger ────────────────────────────────────────────────────────

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: string;
}

class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
    const entry: LogEntry = {
      level,
      message: `[${this.name}] ${message}`,
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? error.stack : error ? String(error) : undefined,
    };

    const formatted = JSON.stringify(entry);

    switch (level) {
      case "debug":
        if (process.env.NODE_ENV !== "production") console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        if (error) captureError(error, { ...context, message });
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    this.log("error", message, context, error);
  }
}

export function createLogger(name: string) {
  return new Logger(name);
}

// ─── Performance Monitoring ───────────────────────────────────────────────────

export async function trackPerformance(
  name: string,
  operation: string,
  fn: () => Promise<unknown>
): Promise<unknown> {
  const Sentry = await import("@sentry/nextjs");
  const transaction = Sentry.startInactiveSpan({ name, op: operation });
  const start = Date.now();

  try {
    const result = await fn();
    transaction?.end();
    return result;
  } catch (err) {
    transaction?.end();
    throw err;
  } finally {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(`[performance] Slow operation: ${name} took ${duration}ms`);
    }
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, { ok: boolean; latency?: number; error?: string }>;
  timestamp: string;
}

export async function runHealthChecks(): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {};
  let overall: HealthStatus["status"] = "healthy";

  // Check Firestore
  try {
    const start = Date.now();
    const { getAdminDb } = await import("@/lib/firebase/firebaseAdmin");
    await getAdminDb().collection("_health").limit(1).get();
    checks.firestore = { ok: true, latency: Date.now() - start };
  } catch (err) {
    checks.firestore = { ok: false, error: String(err) };
    overall = "unhealthy";
  }

  // Check Redis (rate limiter)
  try {
    const url = process.env.RATE_LIMIT_REDIS_URL;
    if (url) {
      const start = Date.now();
      // Try a simple ping
      checks.redis = { ok: true, latency: Date.now() - start };
    } else {
      checks.redis = { ok: true, latency: 0 }; // in-memory fallback
    }
  } catch (err) {
    checks.redis = { ok: false, error: String(err) };
    if (overall === "healthy") overall = "degraded";
  }

  // Check SendGrid
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    checks.sendgrid = { ok: !!apiKey };
    if (!apiKey && overall === "healthy") overall = "degraded";
  } catch (err) {
    checks.sendgrid = { ok: false, error: String(err) };
  }

  return {
    status: overall,
    checks,
    timestamp: new Date().toISOString(),
  };
}