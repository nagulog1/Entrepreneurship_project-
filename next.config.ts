import { validateEnvOrWarn } from "./src/validation/env";

// Validate env vars at build time (warns, doesn't throw)
if (process.env.NODE_ENV !== "test") {
  validateEnvOrWarn();
}

const nextConfig = {
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google profile pics
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Experimental features
  experimental: {
    serverActions: { allowedOrigins: ["uni-o.in", "www.uni-o.in"] },
    optimizePackageImports: ["@sentry/nextjs", "firebase"],
  },

  // Security headers (also set in middleware, belt-and-suspenders)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Don't cache API responses
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },

  // Webpack config
  webpack: (config, { isServer }) => {
    // Don't bundle server-only modules on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        "firebase-admin": false,
        razorpay: false,
        "@sendgrid/mail": false,
        "@sendgrid/client": false,
        ioredis: false,
      };
    }

    return config;
  },

  // Environment variables exposed to the client bundle
  // Only NEXT_PUBLIC_ vars are exposed; server vars are never bundled
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },

  // Output for Firebase Hosting (server-side rendering)
  // Comment this out if deploying to Vercel
  output: "standalone",

  // Disable x-powered-by header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Generate source maps in production (uploaded to Sentry)
  productionBrowserSourceMaps: false, // Sentry uploads them separately

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

// Wrap with Sentry to capture build-time errors and upload source maps
let finalConfig = nextConfig;

try {
  const { withSentryConfig } = require("@sentry/nextjs");
  finalConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG || "uni-o",
    project: process.env.SENTRY_PROJECT || "uni-o-nextjs",
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Upload source maps only in production CI
    silent: process.env.NODE_ENV !== "production",
    widenClientFileUpload: true,

    // Disable Sentry in development
    disableServerWebpackPlugin: process.env.NODE_ENV !== "production",
    disableClientWebpackPlugin: process.env.NODE_ENV !== "production",

    // Automatically tree-shake Sentry logger statements
    hideSourceMaps: true,
    disableLogger: true,
  });
} catch {
  // @sentry/nextjs not installed yet — that's fine for initial setup
  console.warn("[next.config] @sentry/nextjs not found, skipping Sentry integration.");
}

export default finalConfig;