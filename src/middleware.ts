import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';
import { ROLE_COOKIE_NAME } from '@/lib/auth/roles';

/**
 * Server-side protection for operational/dashboard routes.
 *
 * Runs on the Edge runtime, so it only ever touches `session.ts`
 * (Web-Crypto-only) — never `lib/auth/password.ts` or `lib/auth/users.ts`,
 * which use Node's `crypto.scrypt` and are not Edge-safe.
 *
 * Gate logic (intentionally conservative — see note below):
 *   1. A real signed-in user (valid `disastraaa-session` cookie)  → allowed.
 *   2. An active Demo Access persona (`disastraaa-user-role` cookie present,
 *      set by DemoAccessPortal)                                   → allowed,
 *      completely unchanged from current behavior. Per-page role/permission
 *      checks (e.g. AuthorityAccessGate for CITIZEN-level access) continue
 *      to run exactly as before — this middleware does not evaluate role,
 *      only whether *some* form of sign-in has happened.
 *   3. Neither cookie present (a raw, never-authenticated visitor pasting a
 *      dashboard URL directly)                                    → redirect
 *      to /login.
 *
 * This adds real server-side enforcement for the one case that had none
 * (a cold visitor with no cookies at all) without altering any behavior for
 * existing Demo Access users or touching the demo role/permission system.
 */

const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/analytics',
  '/assistant',
  '/evacuation',
  '/governance',
  '/historical',
  '/incidents',
  '/operations',
  '/planning',
  '/reports/manage',
  '/resources',
  '/settings',
  '/simulator',
  '/state',
  '/personnel',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Demo Access: unchanged — any active demo persona passes through exactly
  // as it does today, with per-page role gating still applying downstream.
  if (req.cookies.get(ROLE_COOKIE_NAME)?.value) {
    return NextResponse.next();
  }

  // Real session: verify signature + expiry.
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const payload = await verifySessionToken(sessionToken);
    if (payload) {
      return NextResponse.next();
    }
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/assistant/:path*',
    '/evacuation/:path*',
    '/governance/:path*',
    '/historical/:path*',
    '/incidents/:path*',
    '/operations/:path*',
    '/planning/:path*',
    '/reports/manage/:path*',
    '/resources/:path*',
    '/settings/:path*',
    '/simulator/:path*',
    '/state/:path*',
    '/personnel/:path*',
  ],
};
