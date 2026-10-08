import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/auth/users';
import { hashPassword } from '@/lib/auth/password';
import { createPendingCitizenAccount, CITIZEN_OTP_TTL_MINUTES } from '@/lib/auth/citizenVerification';
import { sendCitizenVerificationEmail } from '@/lib/email/sendVerificationEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register-citizen
 *
 * Step 1 of real citizen/public registration — entirely separate from both
 * Demo Access and the Authority registration flow. Does NOT create an
 * account directly; sends a 6-digit email verification code. The account is
 * only created by POST /api/auth/verify-citizen-email once that code is
 * confirmed.
 *
 * The citizen never supplies a role — the created account always gets the
 * baseline REGISTERED_USER role (see lib/auth/users.ts). Location is only
 * ever included if the browser's Geolocation API returned it after explicit
 * user consent on the client — this endpoint treats latitude/longitude as
 * optional and never requires them.
 *
 * Unlike authority registration's dev-mode fallback, this endpoint never
 * logs or returns the raw OTP — if RESEND_API_KEY is not configured,
 * sendCitizenVerificationEmail throws and this returns a clear 502 rather
 * than faking success.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  const phone = typeof b.phone === 'string' ? b.phone.trim() : undefined;
  const address = typeof b.address === 'string' ? b.address.trim() : undefined;
  const state = typeof b.state === 'string' ? b.state.trim() : undefined;
  const district = typeof b.district === 'string' ? b.district.trim() : undefined;
  const latitude = typeof b.latitude === 'number' ? b.latitude : undefined;
  const longitude = typeof b.longitude === 'number' ? b.longitude : undefined;
  const password = typeof b.password === 'string' ? b.password : '';
  const confirmPassword = typeof b.confirmPassword === 'string' ? b.confirmPassword : '';

  if (!name) {
    return NextResponse.json({ success: false, error: 'Please enter your full name.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
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

  if (findUserByEmail(email)) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists. Try signing in instead.' },
      { status: 409 },
    );
  }

  const { hash, salt } = hashPassword(password);

  const pendingResult = createPendingCitizenAccount({
    email,
    name,
    passwordHash: hash,
    passwordSalt: salt,
    phone,
    address,
    state,
    district,
    latitude,
    longitude,
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

  try {
    await sendCitizenVerificationEmail({
      to: email,
      recipientName: name,
      otp: pendingResult.otp,
      expiresInMinutes: CITIZEN_OTP_TTL_MINUTES,
    });
  } catch (err) {
    console.error('[api/auth/register-citizen] Failed to send verification email:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to send verification email right now. Please try again shortly.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    pendingId: pendingResult.pending.id,
    email,
    message: `A 6-digit verification code was sent to ${email}.`,
    ...(process.env.NODE_ENV !== 'production' ? { devOtp: pendingResult.otp } : {}),
  });
}
