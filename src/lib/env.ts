// ─── Environment Validation ──────────────────────────────────────────────────
// Import at app start (layout.tsx server-side) to validate required env vars.

interface EnvVar {
  key: string;
  required: boolean;
  isPublic?: boolean;
}

const ENV_SCHEMA: EnvVar[] = [
  // Firebase Client (public)
  { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_FIREBASE_APP_ID', required: true, isPublic: true },
  { key: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', required: false, isPublic: true },

  // Firebase Admin (server)
  { key: 'FIREBASE_PROJECT_ID', required: true },
  { key: 'FIREBASE_CLIENT_EMAIL', required: true },
  { key: 'FIREBASE_PRIVATE_KEY', required: true },

  // Judge0
  { key: 'JUDGE0_API_KEY', required: false },
  { key: 'NEXT_PUBLIC_JUDGE0_API_URL', required: false, isPublic: true },

  // Sentry
  { key: 'NEXT_PUBLIC_SENTRY_DSN', required: false, isPublic: true },

  // Stripe (optional — at least one payment provider)
  { key: 'STRIPE_SECRET_KEY', required: false },
  { key: 'STRIPE_WEBHOOK_SECRET', required: false },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false, isPublic: true },

  // Razorpay (optional — at least one payment provider)
  { key: 'NEXT_PUBLIC_RAZORPAY_KEY_ID', required: false, isPublic: true },

  // SendGrid (optional)
  { key: 'SENDGRID_API_KEY', required: false },

  // App
  { key: 'APP_BASE_URL', required: false },
];

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_SCHEMA) {
    const value = process.env[envVar.key];
    if (!value || value.trim() === '') {
      if (envVar.required) {
        missing.push(envVar.key);
      } else {
        warnings.push(`Optional env var ${envVar.key} is not set`);
      }
    }
  }

  // Check at least one payment provider
  const hasStripe = !!process.env.STRIPE_SECRET_KEY;
  const hasRazorpay = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!hasStripe && !hasRazorpay) {
    warnings.push('No payment provider configured (STRIPE_SECRET_KEY or NEXT_PUBLIC_RAZORPAY_KEY_ID)');
  }

  if (!process.env.SENDGRID_API_KEY) {
    warnings.push('Email (SendGrid) not configured — transactional emails will be skipped');
  }

  const valid = missing.length === 0;

  if (!valid) {
    console.error(
      `[ENV] Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}`
    );
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[ENV] Warnings:\n${warnings.map((w) => `  ⚠ ${w}`).join('\n')}`
    );
  }

  return { valid, missing, warnings };
}

// Run validation on import in development
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  validateEnv();
}
