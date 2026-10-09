import { recordAuditEvent } from '@/lib/audit/log';
import { verifyPendingCitizenAccount, type VerifyCitizenFailureReason } from '@/lib/auth/citizenVerification';
import { ROLE_COOKIE_NAME } from '@/lib/auth/roles';
import { AUTH_MARKER_COOKIE_NAME, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { createVerifiedCitizenUser, findUserByEmail, toSafeUser } from '@/lib/auth/users';
import { NextResponse } from 'next/server';

const FAILURE_MESSAGES: Record<VerifyCitizenFailureReason, string> = {
  NOT_FOUND: 'This verification session has expired or was already used. Please register again.',
  EXPIRED: 'This verification code has expired. Please register again to receive a new one.',
  TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Please register again to receive a new code.',
  INVALID_CODE: 'Incorrect verification code. Please try again.',
};

/**
 * POST /api/auth/verify-citizen-email
 *
 * Step 2 of real citizen registration. Confirms the one-time code sent by
 * POST /api/auth/register-citizen, then creates the real account with the
 * baseline REGISTERED_USER role — never anything else — and signs the user
 * in via the same secure session cookie used by authority login/registration.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const pendingId = typeof b.pendingId === 'string' ? b.pendingId : '';
  const otp = typeof b.otp === 'string' ? b.otp.trim() : '';

  if (!pendingId || !/^\d{6}$/.test(otp)) {
    return NextResponse.json(
      { success: false, error: 'Please enter the 6-digit verification code.' },
      { status: 400 },
    );
  }

  const result = verifyPendingCitizenAccount(pendingId, otp);

  if (!result.ok) {
    const status = result.reason === 'INVALID_CODE' ? 400 : 410;
    return NextResponse.json(
      { success: false, error: FAILURE_MESSAGES[result.reason] },
      { status },
    );
  }

  if (findUserByEmail(result.pending.email)) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    );
  }

  try {
    const user = createVerifiedCitizenUser({
      name: result.pending.name,
      email: result.pending.email,
      passwordHash: result.pending.passwordHash,
      passwordSalt: result.pending.passwordSalt,
      phone: result.pending.phone,
      address: result.pending.address,
      state: result.pending.state,
      district: result.pending.district,
      latitude: result.pending.latitude,
      longitude: result.pending.longitude,
    });

    recordAuditEvent(
      'CITIZEN_ACCOUNT_CREATED',
      user.id,
      `${user.name} created a public/citizen account`,
      { email: user.email },
    );

    const token = await createSessionToken({
      uid: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json({ success: true, user: toSafeUser(user) }, { status: 201 });

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

    // Clear any previous demo persona cookie so real identity is active
    res.cookies.set(ROLE_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (err) {
    console.error('[api/auth/verify-citizen-email] Account creation failed:', err);
    return NextResponse.json(
      { success: false, error: 'Verification succeeded but account creation failed. Please try again.' },
      { status: 500 },
    );
  }
}
