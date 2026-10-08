/**
 * Authority Invitation Hierarchy
 *
 * Server-side-only matrix determining which role may authorize which other
 * roles. Never trust a client-supplied role for this decision — the caller
 * (`/api/auth/invite-personnel`) must always derive the inviter's role from
 * their verified session (`resolveActiveRole` / `verifySessionToken`), never
 * from request body/query/cookie values.
 *
 *   SUPER_ADMIN        → NATIONAL_AUTHORITY, STATE_AUTHORITY, DISTRICT_AUTHORITY, FIELD_OPERATOR
 *   NATIONAL_AUTHORITY → STATE_AUTHORITY, DISTRICT_AUTHORITY, FIELD_OPERATOR
 *   STATE_AUTHORITY    → DISTRICT_AUTHORITY, FIELD_OPERATOR
 *   DISTRICT_AUTHORITY → FIELD_OPERATOR
 *   FIELD_OPERATOR     → (none)
 *
 * A lower-level authority can never create an equal or higher-level account.
 */

import { ROLES, type Role } from '@/types/roles';
import type { RegistrableAuthorityType } from './authorityRegistry';

const INVITE_MATRIX: Partial<Record<Role, RegistrableAuthorityType[]>> = {
  [ROLES.SUPER_ADMIN]: [
    ROLES.NATIONAL_AUTHORITY,
    ROLES.STATE_AUTHORITY,
    ROLES.DISTRICT_AUTHORITY,
    ROLES.FIELD_OPERATOR,
  ],
  [ROLES.NATIONAL_AUTHORITY]: [
    ROLES.NATIONAL_AUTHORITY,
    ROLES.STATE_AUTHORITY,
    ROLES.DISTRICT_AUTHORITY,
    ROLES.FIELD_OPERATOR,
  ],
  [ROLES.STATE_AUTHORITY]: [
    ROLES.DISTRICT_AUTHORITY,
    ROLES.FIELD_OPERATOR,
  ],
  [ROLES.DISTRICT_AUTHORITY]: [
    ROLES.FIELD_OPERATOR,
  ],
};

/** Roles the given inviter role is permitted to create invitations for. */
export function getInvitableRoles(inviterRole: Role): RegistrableAuthorityType[] {
  return INVITE_MATRIX[inviterRole] ?? [];
}

/** True if `inviterRole` is allowed to invite/authorize `targetRole`. */
export function canInvite(inviterRole: Role, targetRole: Role): boolean {
  return getInvitableRoles(inviterRole).includes(targetRole as RegistrableAuthorityType);
}

/** True if the role may access the Personnel / Authority Management screen at all. */
export function hasInvitePrivileges(role: Role): boolean {
  return getInvitableRoles(role).length > 0;
}

/**
 * Geographic-scope constraint for the inviter: what state/district values
 * they're allowed to assign to a new invitation. Returns `null` for
 * unrestricted (SUPER_ADMIN / NATIONAL_AUTHORITY can assign any scope).
 */
export interface ScopeConstraint {
  /** If set, the invitation's state must exactly match this value. */
  lockState?: string;
  /** If set, the invitation's district must exactly match this value (FIELD invites under a DISTRICT authority). */
  lockDistrict?: string;
}

export function getScopeConstraint(
  inviterRole: Role,
  inviterState?: string,
  inviterDistrict?: string,
): ScopeConstraint | null {
  if (inviterRole === ROLES.STATE_AUTHORITY) {
    return { lockState: inviterState };
  }
  if (inviterRole === ROLES.DISTRICT_AUTHORITY) {
    return { lockState: inviterState, lockDistrict: inviterDistrict };
  }
  return null; // SUPER_ADMIN / NATIONAL_AUTHORITY — unrestricted
}
