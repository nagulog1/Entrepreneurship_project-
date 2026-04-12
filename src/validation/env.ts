/**
 * env.ts — Strict environment variable validation.
 * Import this at the top of next.config.js and any server entry point.
 * Throws at startup if any required variable is missing in production.
 * Warns once in development — does NOT print twice even though Next.js
 * evaluates next.config.js in multiple worker contexts.
 */

const REQUIRED_SERVER = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "SENDGRID_API_KEY",
  "SENDGRID_FROM_EMAIL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RATE_LIMIT_REDIS_URL",
  "SENTRY_DSN",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

export type ServerEnv = Record<(typeof REQUIRED_SERVER)[number], string>;
export type PublicEnv = Record<(typeof REQUIRED_PUBLIC)[number], string>;

function validateEnv<T extends readonly string[]>(
  keys: T,
  source: Record<string, string | undefined>,
): Record<T[number], string> {
  const missing: string[] = [];
  const result: Record<string, string> = {};

  for (const key of keys) {
    const val = source[key];
    if (!val || val.trim() === "") {
      missing.push(key);
    } else {
      result[key] = val;
    }
  }

  if (missing.length > 0) {
    const msg =
      `[env-validation] Missing environment variables:\n` +
      missing.map((k) => `  • ${k}`).join("\n") +
      `\n  → Copy .env.example to .env.local and fill in your values.`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }

  return result as Record<T[number], string>;
}

/** Only call from server-side code (API routes, server actions). */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server.");
  }
  return validateEnv(REQUIRED_SERVER, process.env as Record<string, string>);
}

/** Safe to call anywhere — only reads NEXT_PUBLIC_ vars. */
export function getPublicEnv(): PublicEnv {
  return validateEnv(
    REQUIRED_PUBLIC,
    process.env as Record<string, string>,
  );
}

/**
 * Called from next.config.js once per build/dev start.
 * A global flag prevents the message printing twice — Next.js evaluates
 * next.config.js in two separate worker processes during `next dev`.
 * We write the flag to process.env so it survives across those contexts.
 */
export function validateEnvOrWarn(): void {
  // Use an env flag that persists across Next.js worker re-evaluations
  if (process.env.__UNI_O_ENV_WARNED) return;
  process.env.__UNI_O_ENV_WARNED = "1";

  const missing = [...REQUIRED_SERVER, ...REQUIRED_PUBLIC].filter(
    (k) => !process.env[k]
  );

  if (missing.length === 0) return;

  if (process.env.NODE_ENV !== "production") {
    // Terse single-line summary — doesn't drown out the Next.js startup banner
    console.warn(
      `\n[env-validation] ${missing.length} env var(s) not configured yet.\n` +
      `  Copy .env.example → .env.local and fill in your credentials.\n` +
      `  Missing: ${missing.slice(0, 5).join(", ")}` +
      (missing.length > 5 ? ` … and ${missing.length - 5} more.` : ".") +
      `\n  Firebase, payments & email will run in offline/mock mode.\n`
    );
  } else {
    throw new Error(
      `[env-validation] Cannot start in production with missing env vars:\n` +
      missing.map((k) => `  • ${k}`).join("\n")
    );
  }
}

// ── Feature-flag helpers ───────────────────────────────────────────────────────
// Use these to gate initialisation rather than letting SDKs throw.

/** True when all Firebase client-side config vars are set. */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  );
}

/** True when Razorpay keys are set (server + client). */
export function isPaymentsConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );
}

/** True when SendGrid is configured. */
export function isEmailConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY;
}

/** True when Sentry DSN is present. */
export function isMonitoringConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
}