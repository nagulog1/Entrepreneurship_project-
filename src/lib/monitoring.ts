// ─── Error Monitoring & Logging ──────────────────────────────────────────────
// Lightweight error tracking with optional Sentry integration.
// Works without Sentry when DSN is not configured.

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

let sentryInitialized = false;

// Lazy-load Sentry only when DSN is available AND the package is installed.
// Uses require() inside try/catch so Next.js doesn't fail the build when
// @sentry/nextjs is absent from node_modules.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSentry(): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;

  try {
    // Use indirect require so webpack/Next.js doesn't statically resolve it
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-eval
    const loadModule = new Function('m', 'return require(m)');
    const Sentry = loadModule('@sentry/nextjs');
    if (!sentryInitialized) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
        beforeSend(event: Record<string, unknown>) {
          // Scrub sensitive data
          const req = event.request as { headers?: Record<string, string> } | undefined;
          if (req?.headers) {
            delete req.headers['Authorization'];
            delete req.headers['Cookie'];
          }
          return event;
        },
      });
      sentryInitialized = true;
    }
    return Sentry;
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function captureError(
  error: unknown,
  context?: ErrorContext,
  severity: SeverityLevel = 'error'
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));

  // Always log to console
  const logMethod = severity === 'warning' ? 'warn' : severity === 'info' ? 'info' : 'error';
  console[logMethod](`[${context?.component ?? 'app'}]`, err.message, context?.extra);

  // Send to Sentry if available
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.withScope((scope: { setLevel: (l: string) => void; setTag: (k: string, v: string) => void; setUser: (u: { id: string }) => void; setExtras: (e: Record<string, unknown>) => void }) => {
      scope.setLevel(severity);
      if (context?.component) scope.setTag('component', context.component);
      if (context?.action) scope.setTag('action', context.action);
      if (context?.userId) scope.setUser({ id: context.userId });
      if (context?.extra) scope.setExtras(context.extra);
      Sentry.captureException(err);
    });
  }
}

export async function captureMessage(
  message: string,
  context?: ErrorContext,
  severity: SeverityLevel = 'info'
): Promise<void> {
  const logMethod = severity === 'warning' ? 'warn' : severity === 'error' ? 'error' : 'info';
  console[logMethod](`[${context?.component ?? 'app'}]`, message, context?.extra);

  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.withScope((scope: { setLevel: (l: string) => void; setTag: (k: string, v: string) => void; setExtras: (e: Record<string, unknown>) => void }) => {
      scope.setLevel(severity);
      if (context?.component) scope.setTag('component', context.component);
      if (context?.action) scope.setTag('action', context.action);
      if (context?.extra) scope.setExtras(context.extra);
      Sentry.captureMessage(message);
    });
  }
}

export async function setMonitoringUser(userId: string, email?: string): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.setUser({ id: userId, email });
  }
}

export async function clearMonitoringUser(): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.setUser(null);
  }
}

// ─── Server-Side Logger ─────────────────────────────────────────────────────

export const serverLogger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.info(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: unknown, data?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, error, data ? JSON.stringify(data) : '');
  },
};
