/**
 * Citizen Email Verification (OTP)
 *
 * Parallel to `lib/auth/emailVerification.ts` (the authority OTP flow) but
 * kept in its own module/store so the proven authority verification code
 * path is never touched by citizen-registration changes.
 *
 * Security properties — same as the authority flow:
 *   - OTP is 6 digits, generated with `crypto.randomInt` (CSPRNG).
 *   - Only a SHA-256 hash of the OTP is ever stored — never the raw code.
 *   - Single-use: the pending record is deleted on success, expiry, or
 *     once the attempt budget is exhausted.
 *   - Expires after OTP_TTL_MINUTES.
 *   - Capped at MAX_ATTEMPTS incorrect guesses.
 *   - Re-registering the same email invalidates any previous pending code
 *     and is rate-limited by RESEND_COOLDOWN_MS.
 *
 * Unlike the authority flow, this module's caller
 * (`sendCitizenVerificationEmail` in `lib/email/sendVerificationEmail.ts`)
 * never logs the raw OTP to the console and never returns it to the
 * browser — if no email provider is configured, sending throws rather than
 * silently "succeeding" with a visible code.
 */

import { randomBytes, randomInt, createHash } from 'crypto';

export interface PendingCitizenAccount {
  id: string;
  /** Normalized lowercase. */
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  phone?: string;
  address?: string;
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  otpHash: string;
  expiresAt: number; // epoch ms
  attempts: number;
  createdAt: number; // epoch ms
}

const OTP_TTL_MS = 15 * 60 * 1000;
export const CITIZEN_OTP_TTL_MINUTES = OTP_TTL_MS / 60_000;

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const globalForCitizenVerification = globalThis as unknown as {
  _disastraaaCitizenPending?: PendingCitizenAccount[];
};

if (!globalForCitizenVerification._disastraaaCitizenPending) {
  globalForCitizenVerification._disastraaaCitizenPending = [];
}

function getStore(): PendingCitizenAccount[] {
  return globalForCitizenVerification._disastraaaCitizenPending ?? [];
}

function setStore(list: PendingCitizenAccount[]): void {
  globalForCitizenVerification._disastraaaCitizenPending = list;
}

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export interface CreatePendingCitizenInput {
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  phone?: string;
  address?: string;
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreatePendingCitizenSuccess {
  pending: PendingCitizenAccount;
  otp: string;
}

export interface CreatePendingCitizenCooldown {
  cooldownMs: number;
}

export function createPendingCitizenAccount(
  input: CreatePendingCitizenInput,
): CreatePendingCitizenSuccess | CreatePendingCitizenCooldown {
  const email = input.email.trim().toLowerCase();
  const now = Date.now();

  const store = getStore();
  const existing = store.find((p) => p.email === email);
  if (existing && now - existing.createdAt < RESEND_COOLDOWN_MS) {
    return { cooldownMs: RESEND_COOLDOWN_MS - (now - existing.createdAt) };
  }

  const filtered = store.filter((p) => p.email !== email);

  const otp = generateOtp();
  const pending: PendingCitizenAccount = {
    id: randomBytes(16).toString('hex'),
    email,
    name: input.name,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    phone: input.phone,
    address: input.address,
    state: input.state,
    district: input.district,
    latitude: input.latitude,
    longitude: input.longitude,
    otpHash: hashOtp(otp),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    createdAt: now,
  };
  setStore([...filtered, pending]);

  return { pending, otp };
}

export type VerifyCitizenFailureReason = 'NOT_FOUND' | 'EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'INVALID_CODE';

export type VerifyCitizenResult =
  | { ok: true; pending: PendingCitizenAccount }
  | { ok: false; reason: VerifyCitizenFailureReason };

export function verifyPendingCitizenAccount(
  pendingId: string,
  submittedOtp: string,
): VerifyCitizenResult {
  const store = getStore();
  const entry = store.find((p) => p.id === pendingId);
  if (!entry) return { ok: false, reason: 'NOT_FOUND' };

  if (Date.now() > entry.expiresAt) {
    setStore(store.filter((p) => p.id !== pendingId));
    return { ok: false, reason: 'EXPIRED' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    setStore(store.filter((p) => p.id !== pendingId));
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  if (hashOtp(submittedOtp.trim()) !== entry.otpHash) {
    entry.attempts += 1;
    return { ok: false, reason: 'INVALID_CODE' };
  }

  setStore(store.filter((p) => p.id !== pendingId));
  return { ok: true, pending: entry };
}
