/**
 * Authority Email Verification (OTP)
 *
 * In-memory, server-process-lifetime pending-verification store, following
 * the same established pattern as `lib/auth/users.ts`, `lib/incidents/store.ts`
 * and `lib/reports/store.ts` — no database in this project, so a module-level
 * array behind pure functions is the project's consistent persistence approach.
 *
 * Node-only (`crypto.randomInt`, `crypto.createHash`) — only ever imported
 * from API route handlers, never from `middleware.ts` (Edge runtime).
 *
 * Security properties:
 *   - OTP is 6 digits, generated with `crypto.randomInt` (CSPRNG).
 *   - Only a SHA-256 hash of the OTP is ever stored — never the raw code.
 *   - Single-use: the pending record is deleted the moment verification
 *     succeeds, or once it expires / exhausts its attempt budget.
 *   - Expires after OTP_TTL_MINUTES.
 *   - Capped at MAX_ATTEMPTS incorrect guesses before the code is burned.
 *   - Re-registering the same email invalidates any previous pending code
 *     (at most one valid code per email at a time) and is rate-limited by
 *     RESEND_COOLDOWN_MS to discourage mail-bombing an address.
 *   - The pending record also carries the password hash (already hashed by
 *     `lib/auth/password.ts` before this module ever sees it) and the
 *     role/department/scope copied from the matched AuthorityRecord — so the
 *     real account, created only on successful verification, can never be
 *     assembled from anything the client supplied directly.
 */

import { randomBytes, randomInt, createHash } from 'crypto';
import type { Role } from '@/types/roles';

export interface PendingAuthorityAccount {
  id: string;
  authorityId: string;
  /** Normalized lowercase. */
  officialEmail: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: Role;
  department?: string;
  state?: string;
  district?: string;
  geographicScope?: string;
  otpHash: string;
  expiresAt: number; // epoch ms
  attempts: number;
  createdAt: number; // epoch ms
}

const OTP_TTL_MS = 15 * 60 * 1000;
export const OTP_TTL_MINUTES = OTP_TTL_MS / 60_000;

const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const globalForVerification = globalThis as unknown as {
  _disastraaaPending?: PendingAuthorityAccount[];
};

if (!globalForVerification._disastraaaPending) {
  globalForVerification._disastraaaPending = [];
}

function getPendingStore(): PendingAuthorityAccount[] {
  return globalForVerification._disastraaaPending ?? [];
}

function setPendingStore(list: PendingAuthorityAccount[]): void {
  globalForVerification._disastraaaPending = list;
}

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export interface CreatePendingInput {
  authorityId: string;
  officialEmail: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: Role;
  department?: string;
  state?: string;
  district?: string;
  geographicScope?: string;
}

export interface CreatePendingSuccess {
  pending: PendingAuthorityAccount;
  otp: string;
}

export interface CreatePendingCooldown {
  cooldownMs: number;
}

/**
 * Creates (or replaces) the pending verification for this email.
 * Returns `{ cooldownMs }` instead if a code was already sent within the
 * resend cooldown window — the caller should surface this as a friendly
 * "please wait" message rather than silently resending.
 */
export function createPendingAuthorityAccount(
  input: CreatePendingInput,
): CreatePendingSuccess | CreatePendingCooldown {
  const email = input.officialEmail.trim().toLowerCase();
  const now = Date.now();

  const store = getPendingStore();
  const existing = store.find((p) => p.officialEmail === email);
  if (existing && now - existing.createdAt < RESEND_COOLDOWN_MS) {
    return { cooldownMs: RESEND_COOLDOWN_MS - (now - existing.createdAt) };
  }

  // At most one active pending verification per email.
  const filtered = store.filter((p) => p.officialEmail !== email);

  const otp = generateOtp();
  const pending: PendingAuthorityAccount = {
    id: randomBytes(16).toString('hex'),
    authorityId: input.authorityId,
    officialEmail: email,
    name: input.name,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    role: input.role,
    department: input.department,
    state: input.state,
    district: input.district,
    geographicScope: input.geographicScope,
    otpHash: hashOtp(otp),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    createdAt: now,
  };
  setPendingStore([...filtered, pending]);

  return { pending, otp };
}

export type VerifyFailureReason = 'NOT_FOUND' | 'EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'INVALID_CODE';

export type VerifyResult =
  | { ok: true; pending: PendingAuthorityAccount }
  | { ok: false; reason: VerifyFailureReason };

/**
 * Verifies a submitted OTP against the pending record. Always single-use:
 * the record is removed from the store on success, on expiry, and once the
 * attempt budget is exhausted. Only a wrong-but-still-eligible guess leaves
 * the record in place (with `attempts` incremented) so the user can retry.
 */
export function verifyPendingAuthorityAccount(
  pendingId: string,
  submittedOtp: string,
): VerifyResult {
  const store = getPendingStore();
  const entry = store.find((p) => p.id === pendingId);
  if (!entry) return { ok: false, reason: 'NOT_FOUND' };

  if (Date.now() > entry.expiresAt) {
    setPendingStore(store.filter((p) => p.id !== pendingId));
    return { ok: false, reason: 'EXPIRED' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    setPendingStore(store.filter((p) => p.id !== pendingId));
    return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  if (hashOtp(submittedOtp.trim()) !== entry.otpHash) {
    entry.attempts += 1;
    return { ok: false, reason: 'INVALID_CODE' };
  }

  setPendingStore(store.filter((p) => p.id !== pendingId));
  return { ok: true, pending: entry };
}
