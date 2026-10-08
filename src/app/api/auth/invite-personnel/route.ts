import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';
import { findUserById } from '@/lib/auth/users';
import {
  createAuthorityInvitation,
  listAllInvitations,
  type RegistrableAuthorityType,
} from '@/lib/auth/authorityRegistry';
import { canInvite, getScopeConstraint, hasInvitePrivileges } from '@/lib/auth/inviteMatrix';
import { recordAuditEvent } from '@/lib/audit/log';
import { ROLES } from '@/types/roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REGISTRABLE_ROLES = new Set<string>([
  ROLES.NATIONAL_AUTHORITY,
  ROLES.STATE_AUTHORITY,
  ROLES.DISTRICT_AUTHORITY,
  ROLES.FIELD_OPERATOR,
]);

/**
 * Loads the authenticated REAL-account user making this request.
 * Demo Access personas (the `disastraaa-user-role` cookie) are deliberately
 * NOT accepted here — invitation authority is a real-account-only operation,
 * consistent with "Status changes must be authorized server-side" and the
 * principle that nothing about Demo Access should be able to create real
 * authorization records.
 */
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const user = findUserById(payload.uid);
  return user ?? null;
}

/**
 * GET /api/auth/invite-personnel
 *
 * Lists invitations created by the authenticated authority (SUPER_ADMIN
 * sees all). Used by the Personnel Management screen's activity list.
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }
  if (!hasInvitePrivileges(user.role)) {
    return NextResponse.json({ success: false, error: 'You do not have personnel authorization privileges.' }, { status: 403 });
  }

  const all = listAllInvitations();
  const visible = user.role === ROLES.SUPER_ADMIN ? all : all.filter((inv) => inv.invitedBy === user.id);

  return NextResponse.json({ success: true, invitations: visible });
}

/**
 * POST /api/auth/invite-personnel
 *
 * Creates a new PENDING authority invitation. Role and geographic scope are
 * validated entirely server-side against the authenticated inviter's own
 * role/state/district (loaded from the database/session — never from the
 * request body). The invited employee later activates their account via the
 * existing `/register` Authority flow using the generated Authority ID.
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }
  if (!hasInvitePrivileges(user.role)) {
    return NextResponse.json(
      { success: false, error: 'You do not have personnel authorization privileges.' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const officialEmail = typeof b.officialEmail === 'string' ? b.officialEmail.trim() : '';
  const assignedRole = typeof b.assignedRole === 'string' ? b.assignedRole : '';
  const department = typeof b.department === 'string' ? b.department.trim() : '';
  const stateInput = typeof b.state === 'string' ? b.state.trim() : undefined;
  const districtInput = typeof b.district === 'string' ? b.district.trim() : undefined;
  const geographicScopeInput = typeof b.geographicScope === 'string' ? b.geographicScope.trim() : undefined;

  if (!EMAIL_RE.test(officialEmail)) {
    return NextResponse.json({ success: false, error: 'A valid official email is required.' }, { status: 400 });
  }
  if (!department) {
    return NextResponse.json({ success: false, error: 'Department is required.' }, { status: 400 });
  }
  if (!REGISTRABLE_ROLES.has(assignedRole)) {
    return NextResponse.json({ success: false, error: 'Invalid assigned role.' }, { status: 400 });
  }

  // ── Hierarchy check — server-side only, never trusting client role ───────
  if (!canInvite(user.role, assignedRole as RegistrableAuthorityType)) {
    return NextResponse.json(
      { success: false, error: `Your role (${user.role}) is not authorized to create ${assignedRole} accounts.` },
      { status: 403 },
    );
  }

  // ── Geographic scope check — locked to the inviter's own scope where applicable ──
  const constraint = getScopeConstraint(user.role, user.state, user.district);
  let state = stateInput;
  let district = districtInput;

  if (constraint) {
    if (constraint.lockState) {
      state = constraint.lockState;
      if (stateInput && stateInput !== constraint.lockState) {
        return NextResponse.json(
          { success: false, error: `You may only authorize personnel within ${constraint.lockState}.` },
          { status: 403 },
        );
      }
    }
    if (constraint.lockDistrict) {
      district = constraint.lockDistrict;
      if (districtInput && districtInput !== constraint.lockDistrict) {
        return NextResponse.json(
          { success: false, error: `You may only authorize personnel within ${constraint.lockDistrict} district.` },
          { status: 403 },
        );
      }
    }
  }

  const geographicScope =
    geographicScopeInput ||
    [district, state].filter(Boolean).join(', ') ||
    state ||
    'Unspecified';

  const invitation = createAuthorityInvitation({
    officialEmail,
    assignedRole: assignedRole as RegistrableAuthorityType,
    department,
    state,
    district,
    geographicScope,
    invitedBy: user.id,
    invitedByName: user.name,
  });

  recordAuditEvent(
    'AUTHORITY_INVITATION_CREATED',
    user.id,
    `${user.name} (${user.role}) authorized ${assignedRole} account for ${officialEmail}`,
    { authorityId: invitation.authorityId, assignedRole, officialEmail },
  );

  return NextResponse.json({
    success: true,
    invitation,
    message: `Authority ID ${invitation.authorityId} generated. Share it with ${officialEmail} — they can activate their account at /register using this ID and their official email.`,
  });
}
