/**
 * middleware.ts — Next.js edge middleware.
 * - Security headers on all responses
 * - Auth protection for private routes
 * - Basic abuse protection (bot detection)
 */

import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/settings",
  "/teams",
  "/api/events",
  "/api/teams",
  "/api/payments",
];

// Routes that must NOT be cached
const NO_CACHE_ROUTES = ["/api/"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // ── Security Headers ─────────────────────────────────────────────────────────

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://api.razorpay.com https://api.sendgrid.com wss://*.firebaseio.com https://*.sentry.io",
    "frame-src https://checkout.razorpay.com",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // ── No-Cache for API routes ──────────────────────────────────────────────────

  if (NO_CACHE_ROUTES.some((r) => pathname.startsWith(r))) {
    response.headers.set("Cache-Control", "no-store");
  }

  // ── Bot / Abuse Detection ────────────────────────────────────────────────────

  const userAgent = request.headers.get("user-agent") || "";
  const isSuspiciousBot =
    pathname.startsWith("/api/execute") &&
    (!userAgent || userAgent === "" || /python-requests|curl|wget|scrapy|httpx/i.test(userAgent));

  if (isSuspiciousBot) {
    return NextResponse.json(
      { error: "Automated requests are not permitted." },
      { status: 403 }
    );
  }

  // ── Auth Protection (Token-based check via cookie) ───────────────────────────
  // Note: Full token verification happens in the API routes themselves via
  // verifyIdToken(). Middleware only does a lightweight cookie presence check.

  const isProtectedRoute = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isApiRoute = pathname.startsWith("/api/");

  if (isProtectedRoute && !isApiRoute) {
    // Check for Firebase auth cookie (set by the client after sign-in)
    const authCookie = request.cookies.get("__session");
    if (!authCookie?.value) {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── CORS for API routes ──────────────────────────────────────────────────────

  if (isApiRoute) {
    const origin = request.headers.get("origin");
    const allowedOrigins = [
      process.env.NEXTAUTH_URL,
      "https://uni-o.in",
      "https://www.uni-o.in",
    ].filter(Boolean) as string[];

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)).*)",
  ],
};