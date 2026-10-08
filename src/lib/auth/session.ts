/**
 * Real-User Session Handling
 *
 * Separate from the Demo Access role cookie (`disastraaa-user-role`) —
 * this cookie (`disastraaa-session`) only exists for accounts created via
 * real Register/Login. Demo Access never sets or reads this cookie, and
 * this module never reads the demo role cookie, keeping the two systems
 * fully independent per the "demo users and real users remain separate"
 * requirement.
 *
 * Implemented as a stateless, HMAC-signed token (Web Crypto `crypto.subtle`)
 * rather than a server-side session store, because Next.js Middleware runs
 * on the Edge runtime by default and cannot use Node's `crypto` module.
 * `crypto.subtle` works identically in Middleware, API routes, and Server
 * Components, so one implementation covers all three without extra
 * dependencies or runtime configuration.
 *
 * Prototype-grade secret management: AUTH_SECRET should be set via
 * environment variable in any real deployment. The fallback below is only
 * for local/demo use.
 */

import type { Role } from '@/types/roles';

export const SESSION_COOKIE_NAME = 'disastraaa-session';
export const AUTH_MARKER_COOKIE_NAME = 'disastraaa-logged-in';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const AUTH_SECRET = process.env.AUTH_SECRET || 'disastraaa-dev-secret-change-in-production';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface SessionPayload {
  uid: string;
  name: string;
  email: string;
  role: Role;
  /** Present only for accounts created through authority verification. */
  authorityId?: string;
  department?: string;
  geographicScope?: string;
  /** epoch seconds */
  exp: number;
}

// ── base64url helpers (no Buffer -- Edge-safe) ────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// ── Token create / verify ─────────────────────────────────────────────────────

export async function createSessionToken(
  payload: Omit<SessionPayload, 'exp'>,
): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadStr = toBase64Url(encoder.encode(JSON.stringify(full)));
  const key = await getKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
  const sigStr = toBase64Url(new Uint8Array(signature));
  return `${payloadStr}.${sigStr}`;
}

/**
 * Verifies signature and expiry. Returns null for any malformed, tampered,
 * or expired token -- never throws, safe to call with untrusted cookie input.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadStr, sigStr] = parts;

  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sigStr) as unknown as BufferSource,
      encoder.encode(payloadStr),
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(payloadStr))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
