/** @type {import('next').NextConfig} */

try {
  const { validateEnvOrWarn } = require("./src/lib/validation/env");
  if (process.env.NODE_ENV !== "test") validateEnvOrWarn();
} catch (e) {
  if (!String(e).includes("Cannot find module")) throw e;
}

const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  webpack(config, { isServer }) {
    // Tell webpack to ignore @sentry/nextjs when it's not installed
    // This prevents "Module not found" errors at build time
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Add fallback for optional packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        "firebase-admin": false,
        razorpay: false,
        "@sendgrid/mail": false,
        "@sendgrid/client": false,
      };
    }

    // Ignore optional modules that may not be installed
    const { IgnorePlugin } = require("webpack");
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^@sentry\/nextjs$/,
        contextRegExp: /monitoring/,
      })
    );

    return config;
  },

  poweredByHeader: false,
  compress: true,
  output: "standalone",
};

module.exports = nextConfig;