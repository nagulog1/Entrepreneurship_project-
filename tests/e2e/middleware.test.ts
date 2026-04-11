/**
 * @jest-environment node
 *
 * E2E-style tests for middleware behavior.
 */

import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe('Middleware', () => {
  it('normalizes uppercase paths to lowercase', () => {
    const req = makeRequest('/Challenges');
    const res = middleware(req);
    expect(res.status).toBe(307); // redirect
  });

  it('passes through lowercase paths', () => {
    const req = makeRequest('/challenges');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('blocks wp-admin probes', () => {
    const req = makeRequest('/wp-admin/login.php');
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it('blocks .env access attempts', () => {
    const req = makeRequest('/.env');
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it('blocks phpinfo probes', () => {
    const req = makeRequest('/phpinfo.php');
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it('adds security headers to API routes', () => {
    const req = makeRequest('/api/execute');
    const res = middleware(req);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('does not add API headers to non-API routes', () => {
    const req = makeRequest('/challenges');
    const res = middleware(req);
    // Non-API routes use Firebase-level headers instead
    expect(res.headers.get('Cache-Control')).toBeNull();
  });
});
