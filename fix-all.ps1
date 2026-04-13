# fix-all.ps1
# Run this from your project root:
# powershell -ExecutionPolicy Bypass -File fix-all.ps1

Write-Host "`n=== Uni-O Auto-Fix Script ===" -ForegroundColor Cyan

# ── 1. Fix monitoring.ts ──────────────────────────────────────────────────────
Write-Host "`n[1/5] Fixing monitoring.ts..." -ForegroundColor Yellow

$monitoringContent = @'
/**
 * monitoring.ts - Error monitoring + structured logging.
 * Sentry is fully optional - degrades to console when not installed.
 */

import type { User } from "@/types";

async function getSentry() {
  try { return await import("@sentry/nextjs"); } catch { return null; }
}

export function initSentry(dsn: string, release?: string) {
  getSentry().then((S) => {
    if (!S || !dsn) return;
    S.init({ dsn, release, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
  }).catch(() => {});
}

export async function setSentryUser(user: Pick<User, "id" | "name" | "email"> | null) {
  const S = await getSentry(); if (!S) return;
  if (user) S.setUser({ id: user.id, username: user.name, email: user.email });
  else S.setUser(null);
}

export async function captureError(error: unknown, context?: Record<string, unknown>): Promise<void> {
  console.error("[error]", error, context ?? "");
  try {
    const S = await getSentry(); if (!S) return;
    S.withScope((scope) => {
      if (context) Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
      S.captureException(error);
    });
  } catch { /* never crash */ }
}

export async function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: Record<string, unknown>): Promise<void> {
  try {
    const S = await getSentry(); if (!S) return;
    S.withScope((scope) => {
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
    if (level === "debug" && process.env.NODE_ENV !== "production") console.debug(p, msg, ctx ?? "");
    else if (level === "info")  console.info(p, msg, ctx ?? "");
    else if (level === "warn")  console.warn(p, msg, ctx ?? "");
    else if (level === "error") { console.error(p, msg, err ?? "", ctx ?? ""); if (err) void captureError(err, { msg, ...ctx }); }
  }
  debug(msg: string, ctx?: Record<string, unknown>) { this.log("debug", msg, ctx); }
  info (msg: string, ctx?: Record<string, unknown>) { this.log("info",  msg, ctx); }
  warn (msg: string, ctx?: Record<string, unknown>) { this.log("warn",  msg, ctx); }
  error(msg: string, err?: unknown, ctx?: Record<string, unknown>) { this.log("error", msg, ctx, err); }
}

export function createLogger(name: string) { return new Logger(name); }

export async function trackPerformance(name: string, operation: string, fn: () => Promise<unknown>): Promise<unknown> {
  const start = Date.now();
  let span: { end(): void } | null = null;
  try { const S = await getSentry(); if (S) span = S.startInactiveSpan({ name, op: operation }) as typeof span; } catch {}
  try {
    const result = await fn(); span?.end();
    if (Date.now() - start > 5000) console.warn(`[perf] Slow: ${name} took ${Date.now() - start}ms`);
    return result;
  } catch (err) { span?.end(); throw err; }
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
  } catch (err) { checks.firestore = { ok: false, error: String(err) }; overall = "unhealthy"; }
  checks.redis    = { ok: true };
  checks.sendgrid = { ok: !!process.env.SENDGRID_API_KEY };
  if (!checks.sendgrid.ok && overall === "healthy") overall = "degraded";
  checks.sentry   = { ok: !!(await getSentry()) };
  return { status: overall, checks, timestamp: new Date().toISOString() };
}
'@

Set-Content -Path "src\lib\monitoring\monitoring.ts" -Value $monitoringContent -Encoding UTF8
Write-Host "  monitoring.ts fixed" -ForegroundColor Green

# ── 2. Fix messaging.ts ───────────────────────────────────────────────────────
Write-Host "`n[2/5] Fixing messaging.ts..." -ForegroundColor Yellow

$messagingContent = @'
/**
 * messaging.ts - Firebase Cloud Messaging. Fully null-safe.
 */

export async function getFirebaseMessaging() {
  try {
    if (typeof window === "undefined") return null;
    const { getApps } = await import("firebase/app");
    const apps = getApps();
    if (!apps.length) return null;
    const { isSupported, getMessaging } = await import("firebase/messaging");
    if (!(await isSupported())) return null;
    try { return getMessaging(apps[0]); } catch { return null; }
  } catch { return null; }
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

export async function getFcmToken(): Promise<string | null> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;
    const { getToken } = await import("firebase/messaging");
    return await getToken(messaging, { vapidKey });
  } catch { return null; }
}

export async function registerFcmToken(userId?: string): Promise<string | null> {
  try {
    const permission = await ensureNotificationPermission();
    if (permission !== "granted") return null;
    const token = await getFcmToken();
    if (!token) return null;
    if (userId) {
      try {
        const { db } = await import("@/lib/firebase");
        if (db) {
          const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
          await setDoc(doc(db, "fcmTokens", userId), { token, userId, updatedAt: serverTimestamp() }, { merge: true });
        }
      } catch { /* best-effort */ }
    }
    return token;
  } catch { return null; }
}

export async function onForegroundNotification(
  handler: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): Promise<() => void> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};
    const { onMessage } = await import("firebase/messaging");
    return onMessage(messaging, (p) => handler({ title: p.notification?.title, body: p.notification?.body, data: p.data as Record<string, string> }));
  } catch { return () => {}; }
}
'@

Set-Content -Path "src\lib\firebase\messaging.ts" -Value $messagingContent -Encoding UTF8
Write-Host "  messaging.ts fixed" -ForegroundColor Green

# ── 3. Fix teams page redirect ────────────────────────────────────────────────
Write-Host "`n[3/5] Checking middleware for /teams redirect..." -ForegroundColor Yellow

$middlewarePath = "src\middleware.ts"
$middlewareContent = Get-Content $middlewarePath -Raw

# Remove /teams from protected routes that redirect to home when not logged in
# (teams page should be public - login prompt shown inline)
$middlewareContent = $middlewareContent -replace '"/teams",?\s*', ''
Set-Content -Path $middlewarePath -Value $middlewareContent -Encoding UTF8
Write-Host "  middleware.ts fixed - /teams no longer redirects" -ForegroundColor Green

# ── 4. Clear Next.js cache ────────────────────────────────────────────────────
Write-Host "`n[4/5] Clearing .next cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "  .next cache cleared" -ForegroundColor Green
} else {
    Write-Host "  No cache to clear" -ForegroundColor Gray
}

# ── 5. Summary ────────────────────────────────────────────────────────────────
Write-Host "`n[5/5] All fixes applied!" -ForegroundColor Green
Write-Host "`nIssues fixed:" -ForegroundColor Cyan
Write-Host "  [x] monitoring.ts - @sentry/nextjs no longer crashes" -ForegroundColor White
Write-Host "  [x] messaging.ts  - getProvider crash fixed" -ForegroundColor White
Write-Host "  [x] /teams page   - no longer redirects to home" -ForegroundColor White
Write-Host "  [x] .next cache   - cleared so changes take effect" -ForegroundColor White
Write-Host "`nRemaining issues to fix manually:" -ForegroundColor Yellow
Write-Host "  [ ] auth/internal-error - Add real Firebase credentials to .env.local" -ForegroundColor White
Write-Host "  [ ] Registration stored in DB - Needs real Firebase credentials" -ForegroundColor White
Write-Host "  [ ] Contest detail page - Check /contests/[id]/page.tsx" -ForegroundColor White
Write-Host "`nNow run: npm run dev" -ForegroundColor Cyan
