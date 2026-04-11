import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Dynamic import so the module is only loaded server-side
    const { adminAuth } = await import('@/lib/firebase/firebaseAdmin');

    if (!adminAuth) {
      return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    return NextResponse.json({
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name: decoded.name ?? null,
      picture: decoded.picture ?? null,
    });
  } catch (err) {
    console.error('[/api/auth/session]', err);
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
