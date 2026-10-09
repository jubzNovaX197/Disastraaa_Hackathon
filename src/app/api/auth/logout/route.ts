import { ROLE_COOKIE_NAME } from '@/lib/auth/roles';
import { AUTH_MARKER_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 *
 * Clears the real-session cookie and any demo role cookie.
 */
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.cookies.set(AUTH_MARKER_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
  });
  res.cookies.set(ROLE_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
  });
  // Reset environment to REAL
  res.cookies.set('disastraaa-env', 'REAL', {
    path: '/',
    sameSite: 'lax',
  });
  return res;
}
