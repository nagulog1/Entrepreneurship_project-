/**
 * @jest-environment node
 *
 * Integration tests for the /api/auth/session route.
 */

import { NextRequest } from 'next/server';

// The route uses dynamic import — mock at module level
const mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
  adminDb: {},
  adminStorage: {},
}));

import { POST } from '@/app/api/auth/session/route';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/session', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  it('returns 400 for missing idToken', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing idToken');
  });

  it('returns user data for valid token', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user123',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    });

    const req = makeRequest({ idToken: 'valid-token-123' });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.uid).toBe('user123');
    expect(data.email).toBe('test@example.com');
    expect(data.emailVerified).toBe(true);
    expect(data.name).toBe('Test User');
  });

  it('returns 401 for invalid token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Firebase: token expired'));

    const req = makeRequest({ idToken: 'expired-token' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Invalid or expired');
  });
});
