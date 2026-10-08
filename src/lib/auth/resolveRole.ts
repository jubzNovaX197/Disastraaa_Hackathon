/**
 * resolveActiveRole
 *
 * Server Components call this instead of reading the demo role cookie
 * directly, so dashboard pages reflect either possible sign-in path:
 *
 *   1. Demo Access (`disastraaa-user-role` cookie) — unchanged priority,
 *      resolved exactly as `parseRoleFromCookie` already did. A demo
 *      persona always wins if present, so nothing about the existing
 *      Demo Access experience changes.
 *   2. A real registered/logged-in account (`disastraaa-session` cookie)
 *      — now also resolves to that account's role, so a real user who
 *      registers or logs in (and has no demo cookie active) sees their
 *      own dashboard instead of being treated as CITIZEN.
 *
 * Falls back to CITIZEN when neither is present, exactly as
 * `parseRoleFromCookie` already did on its own.
 */

import { cookies } from 'next/headers';
import { ROLE_COOKIE_NAME, parseRoleFromCookie } from './roles';
import { SESSION_COOKIE_NAME, verifySessionToken } from './session';
import { ROLES, type Role } from '@/types/roles';

export async function resolveActiveRole(): Promise<Role> {
  const cookieStore = await cookies();

  // 1. Real verified authority session takes precedence
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const payload = await verifySessionToken(sessionToken);
    if (payload) return payload.role;
  }

  // 2. Demo Access persona if active
  const rawDemoRole = cookieStore.get(ROLE_COOKIE_NAME)?.value;
  if (rawDemoRole) {
    return parseRoleFromCookie(`${ROLE_COOKIE_NAME}=${rawDemoRole}`);
  }

  return ROLES.CITIZEN;
}
