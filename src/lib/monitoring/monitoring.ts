/**
 * monitoring.ts
 * Uses require() for Sentry so webpack doesn't statically analyze
 * the import and fail at build time when @sentry/nextjs is not installed.
 */

import type { User } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSentrySync(): any | null {
  try {
    // require() is ignored by webpack's static import analyzer
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@sentry/nextjs");
  } catch {
    return null;
  }
}

export function initSentry(dsn: string, release?: string) {
  try {
    const S = getSentrySync();
    if (!S || !dsn) return;
    S.init({
      dsn,
      release,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      beforeSend(event: Record<string, unknown>) {
        return event;
      },
    });
  } catch { /* ignore */ }
}

export async function setSentryUser(user: Pick<User, "id" | "name" | "email"> | null) {
  try {
    const S = getSentrySync();
    if (!S) return;
    if (user) S.setUser({ id: user.id, username: user.name, email: user.email });
    else S.setUser(null);
  } catch { /* ignore */ }
}

export async function captureError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  console.error("[error]", error, context ?? "");
  try {
    const S = getSentrySync();
    if (!S) return;
    S.withScope((scope: { setExtra: (k: string, v: unknown) => void }) => {
      if (context) Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      S.captureException(error);
    });
  } catch { /* never crash */ }
}

export async function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>
): Promise<void> {
  try {
    const S = getSentrySync();
    if (!S) return;
    S.withScope((scope: { setExtra: (k: string, v: unknown) => void }) => {
      if (context) Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      S.captureMessage(message, level);
    });
  } catch { /* ignore */ }
}

type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  constructor(private name: string) {}

  private log(level: LogLevel, msg: string, ctx?: Record<string, unknown>, err?: unknown) {
    const p = `[${this.name}]`;
    switch (level) {
      case "debug":
        if (process.env.NODE_ENV !== "production") console.debug(p, msg, ctx ?? "");
        break;
      case "info":
        console.info(p, msg, ctx ?? "");
        break;
      case "warn":
        console.warn(p, msg, ctx ?? "");
        break;
      case "error":
        console.error(p, msg, err ?? "", ctx ?? "");
        if (err) void captureError(err, { msg, ...ctx });
        break;
    }
  }

  debug(msg: string, ctx?: Record<string, unknown>) { this.log("debug", msg, ctx); }
  info(msg: string, ctx?: Record<string, unknown>) { this.log("info", msg, ctx); }
  warn(msg: string, ctx?: Record<string, unknown>) { this.log("warn", msg, ctx); }
  error(msg: string, err?: unknown, ctx?: Record<string, unknown>) { this.log("error", msg, ctx, err); }
}

export function createLogger(name: string) {
  return new Logger(name);
}

export async function trackPerformance(
  name: string,
  operation: string,
  fn: () => Promise<unknown>
): Promise<unknown> {
  const start = Date.now();
  let span: { end(): void } | null = null;
  try {
    const S = getSentrySync();
    if (S) span = S.startInactiveSpan({ name, op: operation });
  } catch { /* continue without span */ }

  try {
    const result = await fn();
    span?.end();
    if (Date.now() - start > 5000) {
      console.warn(`[perf] Slow: ${name} took ${Date.now() - start}ms`);
    }
    return result;
  } catch (err) {
    span?.end();
    throw err;
  }
}

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, { ok: boolean; latency?: number; error?: string }>;
  timestamp: string;
}

export async function runHealthChecks(): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {};
  let overall: HealthStatus["status"] = "healthy";

  try {
    const start = Date.now();
    const { getAdminDb } = await import("@/lib/firebase/firebaseAdmin");
    await getAdminDb().collection("_health").limit(1).get();
    checks.firestore = { ok: true, latency: Date.now() - start };
  } catch (err) {
    checks.firestore = { ok: false, error: String(err) };
    overall = "unhealthy";
  }

  checks.redis    = { ok: true };
  checks.sendgrid = { ok: !!process.env.SENDGRID_API_KEY };
  if (!checks.sendgrid.ok && overall === "healthy") overall = "degraded";
  checks.sentry   = { ok: !!getSentrySync() };

  return { status: overall, checks, timestamp: new Date().toISOString() };
}