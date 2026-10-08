import { NextResponse } from 'next/server';
import { findUserByEmail, toSafeUser } from '@/lib/auth/users';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken, SESSION_COOKIE_NAME, AUTH_MARKER_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { ROLE_COOKIE_NAME } from '@/lib/auth/roles';

/**
 * POST /api/auth/login
 *
 * Real credential login — entirely separate from Demo Access. Verifies
 * email/password against the in-memory user store and issues a signed
 * session cookie. Never reads or writes the demo role cookie.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof (body as any)?.email === 'string' ? (body as any).email.trim() : '';
  const password = typeof (body as any)?.password === 'string' ? (body as any).password : '';

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: 'Email and password are required.' },
      { status: 400 },
    );
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    console.warn(
      `[AUTH-LOGIN] 401 Unauthorized for "${email}": ${!user ? 'user not found in store' : 'password does not match'}`,
    );
    // Deliberately identical message for "no such user" and "wrong password"
    // so the endpoint never reveals which emails are registered.
    return NextResponse.json(
      { success: false, error: 'Invalid email or password.' },
      { status: 401 },
    );
  }

  try {
    const token = await createSessionToken({
      uid: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorityId: user.authorityId,
      department: user.department,
      geographicScope: user.geographicScope,
    });

    const res = NextResponse.json({ success: true, user: toSafeUser(user) });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    res.cookies.set(AUTH_MARKER_COOKIE_NAME, '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // Clear any previous demo persona cookie so real authority identity is active
    res.cookies.set(ROLE_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
    });

    // Ensure environment is set to REAL for authenticated sessions
    res.cookies.set('disastraaa-env', 'REAL', {
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: 'lax',
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 },
    );
  }
}
