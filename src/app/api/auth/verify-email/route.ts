import { NextResponse } from 'next/server';
import { verifyPendingAuthorityAccount, type VerifyFailureReason } from '@/lib/auth/emailVerification';
import { createVerifiedAuthorityUser, findUserByEmail, toSafeUser } from '@/lib/auth/users';
import { createSessionToken, SESSION_COOKIE_NAME, AUTH_MARKER_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { ROLE_COOKIE_NAME } from '@/lib/auth/roles';
import { markInvitationAccepted } from '@/lib/auth/authorityRegistry';
import { recordAuditEvent } from '@/lib/audit/log';

const FAILURE_MESSAGES: Record<VerifyFailureReason, string> = {
  NOT_FOUND: 'This verification session has expired or was already used. Please register again.',
  EXPIRED: 'This verification code has expired. Please register again to receive a new one.',
  TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Please register again to receive a new code.',
  INVALID_CODE: 'Incorrect verification code. Please try again.',
};

/**
 * POST /api/auth/verify-email
 *
 * Step 2 of real authority registration. Confirms the one-time code sent
 * by POST /api/auth/register, then — and only then — creates the real
 * account, with role/department/scope taken from the pending record
 * (which itself came from the matched AuthorityRecord, never from the
 * client). Immediately signs the new account in via the same secure
 * session cookie used by /api/auth/login.
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

  const result = verifyPendingAuthorityAccount(pendingId, otp);

  if (!result.ok) {
    const status = result.reason === 'INVALID_CODE' ? 400 : 410;
    return NextResponse.json(
      { success: false, error: FAILURE_MESSAGES[result.reason] },
      { status },
    );
  }

  // Guard against a duplicate account if two verification requests ever
  // raced for the same email.
  if (findUserByEmail(result.pending.officialEmail)) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    );
  }

  try {
    const user = createVerifiedAuthorityUser({
      name: result.pending.name,
      email: result.pending.officialEmail,
      passwordHash: result.pending.passwordHash,
      passwordSalt: result.pending.passwordSalt,
      role: result.pending.role,
      authorityId: result.pending.authorityId,
      department: result.pending.department,
      state: result.pending.state,
      district: result.pending.district,
      geographicScope: result.pending.geographicScope,
    });

    // Best-effort: if this activation came from an invitation (not a static
    // seed record), mark it ACCEPTED. No-op otherwise.
    markInvitationAccepted(result.pending.authorityId);

    recordAuditEvent(
      'AUTHORITY_ACCOUNT_ACTIVATED',
      user.id,
      `${user.name} activated ${user.role} account (${user.authorityId ?? 'n/a'})`,
      { authorityId: user.authorityId, role: user.role, email: user.email },
    );

    const token = await createSessionToken({
      uid: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorityId: user.authorityId,
      department: user.department,
      geographicScope: user.geographicScope,
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

    // Clear any previous demo persona cookie so real authority identity is active
    res.cookies.set(ROLE_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
    });

    // Ensure environment is locked to REAL for verified authority accounts
    res.cookies.set('disastraaa-env', 'REAL', {
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: 'lax',
    });

    return res;
  } catch (err) {
    console.error('[api/auth/verify-email] Account creation failed:', err);
    return NextResponse.json(
      { success: false, error: 'Verification succeeded but account creation failed. Please try again.' },
      { status: 500 },
    );
  }
}
