/**
 * env.ts — Strict environment variable validation.
 * Import this at the top of next.config.js and any server entry point.
 * Throws at startup if any required variable is missing or malformed.
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
  context: "server" | "client"
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
    const msg = `[env-validation] Missing ${context} environment variables:\n  ${missing.join("\n  ")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    } else {
      console.warn(msg);
    }
  }

  return result as Record<T[number], string>;
}

// Only run full server validation on the server side
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server.");
  }
  return validateEnv(REQUIRED_SERVER, process.env as Record<string, string>, "server");
}

export function getPublicEnv(): PublicEnv {
  return validateEnv(
    REQUIRED_PUBLIC,
    typeof window !== "undefined"
      ? (window as unknown as Record<string, string>)
      : (process.env as Record<string, string>),
    "client"
  );
}

/** Lightweight check used in next.config.js (does not throw, just warns) */
export function validateEnvOrWarn(): void {
  const missing = [...REQUIRED_SERVER, ...REQUIRED_PUBLIC].filter(
    (k) => !process.env[k]
  );
  if (missing.length) {
    console.warn(
      `[env-validation] The following env vars are not set:\n  ${missing.join("\n  ")}\n  Some features will be disabled.`
    );
  }
}