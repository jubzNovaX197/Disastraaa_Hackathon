import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/auth/users';
import { hashPassword } from '@/lib/auth/password';
import { findAuthorityRecordById } from '@/lib/auth/authorityRegistry';
import { createPendingAuthorityAccount, OTP_TTL_MINUTES } from '@/lib/auth/emailVerification';
import { sendAuthorityVerificationEmail } from '@/lib/email/sendVerificationEmail';
import { ROLES } from '@/types/roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deliberately identical for "no such Authority ID", "Authority ID exists
 * but is INACTIVE", and "Authority ID exists but email doesn't match" — so
 * the endpoint never reveals which part of the pair was wrong, or whether
 * a given Authority ID exists at all.
 */
const GENERIC_AUTHORITY_ERROR =
  'Unable to verify the authority credentials. Please check your Authority ID and official email or contact your administrator.';

/**
 * POST /api/auth/register
 *
 * Step 1 of real authority registration — entirely separate from Demo
 * Access. Does NOT create an account directly. Validates the submitted
 * Authority ID against the authority registry, confirms the official email
 * matches, then emails a one-time verification code. The account is only
 * created by POST /api/auth/verify-email once that code is confirmed.
 *
 * The caller never supplies a role — role, department, state, district and
 * geographicScope are copied entirely from the matched AuthorityRecord.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const authorityId = typeof b.authorityId === 'string' ? b.authorityId.trim() : '';
  const officialEmail = typeof b.officialEmail === 'string' ? b.officialEmail.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const confirmPassword = typeof b.confirmPassword === 'string' ? b.confirmPassword : '';
  const name = typeof b.name === 'string' ? b.name.trim() : '';

  if (!authorityId || !EMAIL_RE.test(officialEmail)) {
    return NextResponse.json({ success: false, error: GENERIC_AUTHORITY_ERROR }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { success: false, error: 'Password must be at least 8 characters.' },
      { status: 400 },
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ success: false, error: 'Passwords do not match.' }, { status: 400 });
  }

  const record = findAuthorityRecordById(authorityId);

  // Defense in depth: even if a record with authorityType SUPER_ADMIN were
  // ever added to the registry by mistake, it can never be registered here.
  if (!record || (record.authorityType as string) === ROLES.SUPER_ADMIN) {
    return NextResponse.json({ success: false, error: GENERIC_AUTHORITY_ERROR }, { status: 400 });
  }

  if (record.status !== 'ACTIVE') {
    return NextResponse.json({ success: false, error: GENERIC_AUTHORITY_ERROR }, { status: 400 });
  }

  if (record.officialEmail !== officialEmail.toLowerCase()) {
    return NextResponse.json({ success: false, error: GENERIC_AUTHORITY_ERROR }, { status: 400 });
  }

  if (findUserByEmail(officialEmail)) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    );
  }

  const { hash, salt } = hashPassword(password);

  const pendingResult = createPendingAuthorityAccount({
    authorityId: record.authorityId,
    officialEmail: record.officialEmail,
    name: name || record.name,
    passwordHash: hash,
    passwordSalt: salt,
    role: record.authorityType,
    department: record.department,
    state: record.state,
    district: record.district,
    geographicScope: record.geographicScope,
  });

  if ('cooldownMs' in pendingResult) {
    const seconds = Math.max(1, Math.ceil(pendingResult.cooldownMs / 1000));
    return NextResponse.json(
      {
        success: false,
        error: `A verification code was already sent. Please wait ${seconds}s before requesting another.`,
      },
      { status: 429 },
    );
  }

  let emailResult;
  try {
    emailResult = await sendAuthorityVerificationEmail({
      to: record.officialEmail,
      recipientName: name || record.name,
      otp: pendingResult.otp,
      expiresInMinutes: OTP_TTL_MINUTES,
    });
  } catch (err) {
    console.error('[api/auth/register] Failed to send verification email:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to send verification email right now. Please try again shortly.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    pendingId: pendingResult.pending.id,
    email: record.officialEmail,
    message: `A 6-digit verification code was sent to ${record.officialEmail}.`,
    ...(process.env.NODE_ENV !== 'production' ? { devOtp: pendingResult.otp } : {}),
  });
}
