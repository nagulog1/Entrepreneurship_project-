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
];

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "NEXT_PUBLIC_SENTRY_DSN",
];

function validateEnvOrWarn() {
  const missing = [...REQUIRED_SERVER, ...REQUIRED_PUBLIC].filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(
      `[env-validation] The following env vars are not set:\n  ${missing.join("\n  ")}\n  Some features will be disabled.`
    );
  }
}

module.exports = {
  validateEnvOrWarn,
};
