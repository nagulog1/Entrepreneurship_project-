import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.toLowerCase();

  // Redirect uppercase paths to lowercase
  if (pathname !== normalizedPath) {
    const url = request.nextUrl.clone();
    url.pathname = normalizedPath;
    return NextResponse.redirect(url);
  }

  // Block common attack patterns
  const blocked = [
    /\.\.\//,              // Path traversal
    /\/wp-admin/i,         // WordPress probes
    /\/\.env/i,            // Env file access
    /\/phpinfo/i,          // PHP info probes
    /\/xmlrpc\.php/i,      // XML-RPC attacks
    /\/admin\/config/i,    // Admin config access
  ];

  if (blocked.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  const response = NextResponse.next();

  // Security headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
