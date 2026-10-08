/**
 * Authority Registry
 *
 * ⚠️  SIMULATED / DEMO REGISTRY — NOT connected to any real government
 *     identity system. For the hackathon prototype this plays the role
 *     that a verified government HR/personnel directory would play in
 *     production: it is the single source of truth for WHO is allowed
 *     to hold an authority account, WHAT role they get, and WHICH
 *     geographic scope/department they belong to.
 *
 * Real registration never lets a user choose their own role. Instead:
 *
 *   User submits Authority ID + Official Email
 *     → looked up here
 *     → role / department / state / district / geographicScope are
 *       copied FROM this record, never from client input.
 *
 * Persistence note: this project has no database (see `lib/auth/users.ts`
 * for the same in-memory pattern used for real accounts, and
 * `lib/incidents/store.ts` / `lib/reports/store.ts` for the established
 * precedent elsewhere in the codebase). The registry below follows that
 * exact convention: a module-level array behind pure lookup functions.
 * Swapping this for a real `AuthorityRecord` database table later only
 * means changing the implementation of the functions below — nothing
 * that calls `findAuthorityRecordById` needs to change.
 */

import { ROLES } from '@/types/roles';

export type AuthorityStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Role types that are obtainable through the authority registry /
 * self-service registration flow. SUPER_ADMIN is deliberately excluded
 * from this union — it must never be assignable via public registration,
 * registry record or otherwise. See `/api/auth/register` for the
 * additional runtime guard that enforces this even if a record with
 * authorityType SUPER_ADMIN were ever added by mistake.
 */
export type RegistrableAuthorityType =
  | typeof ROLES.NATIONAL_AUTHORITY
  | typeof ROLES.STATE_AUTHORITY
  | typeof ROLES.DISTRICT_AUTHORITY
  | typeof ROLES.FIELD_OPERATOR;

export interface AuthorityRecord {
  /** Unique human-assigned identifier, e.g. "OD-DST-2301". Case-insensitive lookup. */
  authorityId: string;
  authorityType: RegistrableAuthorityType;
  /** Authority/unit display name — used as the account name if none is given. */
  name: string;
  /** Normalized lowercase — the email a registering user must match exactly. */
  officialEmail: string;
  department: string;
  state?: string;
  district?: string;
  geographicScope: string;
  status: AuthorityStatus;
  createdAt: string;
  updatedAt: string;
}

const seededAt = new Date('2026-01-01T00:00:00.000Z').toISOString();

/**
 * DEMO SEED DATA — simulated authority records for the hackathon.
 * Names, emails and departments are illustrative only.
 */
const _registry: AuthorityRecord[] = [
  // ── Hackathon Demo Authority Seed Records (Simulated) ────────────────────────
  {
    authorityId: 'DIS-NAT-001',
    authorityType: ROLES.NATIONAL_AUTHORITY,
    name: 'National Disaster Management Authority (NDMA)',
    officialEmail: 'ops@ndma.gov.demo',
    department: 'National Operations Command',
    geographicScope: 'Pan-India',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    authorityId: 'DIS-STATE-OD-001',
    authorityType: ROLES.STATE_AUTHORITY,
    name: 'Odisha State Disaster Management Authority (OSDMA)',
    officialEmail: 'commissioner@osdma.gov.demo',
    department: 'State Emergency Operations Center',
    state: 'Odisha',
    geographicScope: 'Odisha',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    authorityId: 'DIS-DIST-BRG-001',
    authorityType: ROLES.DISTRICT_AUTHORITY,
    name: 'Bargarh District Disaster Management Authority',
    officialEmail: 'collector@bargarh.nic.demo',
    department: 'District Emergency Operations Cell',
    state: 'Odisha',
    district: 'Bargarh',
    geographicScope: 'Bargarh District',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    authorityId: 'DIS-FIELD-BRG-001',
    authorityType: ROLES.FIELD_OPERATOR,
    name: 'Odisha Field Response Unit (NDRF Bargarh Sector)',
    officialEmail: 'fieldops@ndrf.gov.demo',
    department: 'Tactical Field Response',
    state: 'Odisha',
    district: 'Bargarh',
    geographicScope: 'Bargarh Sector',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  // Additional simulated registry records for test coverage
  {
    authorityId: 'NDMA-HQ-001',
    authorityType: ROLES.NATIONAL_AUTHORITY,
    name: 'National Disaster Management Authority',
    officialEmail: 'hq@ndma.gov.demo',
    department: 'National Operations',
    geographicScope: 'Pan-India',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    authorityId: 'OD-SEOC-001',
    authorityType: ROLES.STATE_AUTHORITY,
    name: 'Odisha State Disaster Management Authority',
    officialEmail: 'seoc@osdma.gov.demo',
    department: 'State Emergency Operations Center',
    state: 'Odisha',
    geographicScope: 'Odisha',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    authorityId: 'OD-DST-2301',
    authorityType: ROLES.DISTRICT_AUTHORITY,
    name: 'Bargarh District Disaster Management (Secondary)',
    officialEmail: 'deoc@bargarh.nic.demo',
    department: 'District Emergency Operations Cell',
    state: 'Odisha',
    district: 'Bargarh',
    geographicScope: 'Bargarh District',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    authorityId: 'OD-DST-1801',
    authorityType: ROLES.DISTRICT_AUTHORITY,
    name: 'Puri District Disaster Management',
    officialEmail: 'deoc@puri.nic.demo',
    department: 'District Emergency Operations Cell',
    state: 'Odisha',
    district: 'Puri',
    geographicScope: 'Puri District',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    authorityId: 'OD-FLD-3BN',
    authorityType: ROLES.FIELD_OPERATOR,
    name: 'Odisha Field Response Unit (NDRF 3rd Battalion)',
    officialEmail: 'coastal@ndrf.gov.demo',
    department: 'Tactical Field Response',
    state: 'Odisha',
    geographicScope: 'Coastal Sector (Puri – Konark)',
    status: 'ACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  // Deliberately INACTIVE — lets us demonstrate/verify the
  // "authority record exists but is not active" rejection path.
  {
    authorityId: 'OD-DST-9999',
    authorityType: ROLES.DISTRICT_AUTHORITY,
    name: 'Ganjam District Disaster Management (Decommissioned)',
    officialEmail: 'old@ganjam.nic.demo',
    department: 'District Emergency Operations Cell',
    state: 'Odisha',
    district: 'Ganjam',
    geographicScope: 'Ganjam District',
    status: 'INACTIVE',
    createdAt: seededAt,
    updatedAt: seededAt,
  },
];

/**
 * Case-insensitive lookup by Authority ID against the static seed registry
 * ONLY. Most callers should use `findAuthorityRecordById` below instead,
 * which also considers live invitations.
 */
function findSeededRecordById(authorityId: string): AuthorityRecord | undefined {
  const normalized = authorityId.trim().toUpperCase();
  return _registry.find((r) => r.authorityId.toUpperCase() === normalized);
}

// ─────────────────────────────────────────────────────────────────────────────
// Authority Invitations
//
// "Invite / Authorize Personnel" — a logged-in authority (SUPER_ADMIN,
// NATIONAL, STATE or DISTRICT, per the hierarchy in `lib/auth/inviteMatrix.ts`)
// creates an authorization record for a new employee BEFORE that employee has
// any account. This is the authorization to activate an account — not the
// account itself. The employee later completes the existing Authority
// Registration flow (`/register` → Authority ID + official email → OTP) using
// the authorityId generated here, exactly as they would for a seeded record.
//
// Same in-memory persistence convention as the rest of this file/project.
// ─────────────────────────────────────────────────────────────────────────────

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface AuthorityInvitation {
  id: string;
  authorityId: string;
  /** Normalized lowercase. */
  officialEmail: string;
  assignedRole: RegistrableAuthorityType;
  department: string;
  state?: string;
  district?: string;
  geographicScope: string;
  /** uid of the authenticated authority who created this invitation. */
  invitedBy: string;
  invitedByName: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const globalForInvitations = globalThis as unknown as {
  _disastraaaInvitations?: AuthorityInvitation[];
  _disastraaaAuthorityIdSeq?: number;
};

if (!globalForInvitations._disastraaaInvitations) {
  globalForInvitations._disastraaaInvitations = [];
}
if (!globalForInvitations._disastraaaAuthorityIdSeq) {
  globalForInvitations._disastraaaAuthorityIdSeq = 1;
}

function getInvitations(): AuthorityInvitation[] {
  return globalForInvitations._disastraaaInvitations ?? [];
}

function setInvitations(list: AuthorityInvitation[]): void {
  globalForInvitations._disastraaaInvitations = list;
}

function roleCode(role: RegistrableAuthorityType): string {
  switch (role) {
    case ROLES.NATIONAL_AUTHORITY: return 'NAT';
    case ROLES.STATE_AUTHORITY:    return 'STA';
    case ROLES.DISTRICT_AUTHORITY: return 'DST';
    case ROLES.FIELD_OPERATOR:     return 'FLD';
    default:                       return 'AUTH';
  }
}

function stateCode(state?: string): string {
  if (!state) return 'IN';
  const clean = state.trim().toUpperCase().replace(/[^A-Z]/g, '');
  return clean.slice(0, 2) || 'IN';
}

/** Generates a unique, human-readable Authority ID for a new invitation. */
function generateAuthorityId(role: RegistrableAuthorityType, state?: string, district?: string): string {
  const seq = (globalForInvitations._disastraaaAuthorityIdSeq ?? 1);
  globalForInvitations._disastraaaAuthorityIdSeq = seq + 1;

  const parts = [stateCode(state), roleCode(role)];
  if (district) {
    const d = district.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if (d) parts.push(d);
  }
  parts.push(String(seq).padStart(3, '0'));
  return parts.join('-');
}

export interface CreateInvitationInput {
  officialEmail: string;
  assignedRole: RegistrableAuthorityType;
  department: string;
  state?: string;
  district?: string;
  geographicScope: string;
  invitedBy: string;
  invitedByName: string;
}

/**
 * Creates a new PENDING invitation with a freshly generated Authority ID.
 * Caller (the API route) is responsible for all hierarchy/scope authorization
 * checks BEFORE calling this — this function performs no permission logic.
 */
export function createAuthorityInvitation(input: CreateInvitationInput): AuthorityInvitation {
  const now = new Date();
  const invitation: AuthorityInvitation = {
    id: `inv_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    authorityId: generateAuthorityId(input.assignedRole, input.state, input.district),
    officialEmail: input.officialEmail.trim().toLowerCase(),
    assignedRole: input.assignedRole,
    department: input.department,
    state: input.state,
    district: input.district,
    geographicScope: input.geographicScope,
    invitedBy: input.invitedBy,
    invitedByName: input.invitedByName,
    status: 'PENDING',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVITATION_TTL_MS).toISOString(),
  };
  setInvitations([...getInvitations(), invitation]);
  return invitation;
}

/** All invitations, newest first. API route filters by inviter/scope as needed. */
export function listAllInvitations(): AuthorityInvitation[] {
  return [...getInvitations()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function isExpired(inv: AuthorityInvitation): boolean {
  return new Date(inv.expiresAt).getTime() < Date.now();
}

/** Finds a still-valid (PENDING, not expired) invitation by Authority ID. */
function findPendingInvitationById(authorityId: string): AuthorityInvitation | undefined {
  const normalized = authorityId.trim().toUpperCase();
  return getInvitations().find(
    (inv) => inv.authorityId.toUpperCase() === normalized && inv.status === 'PENDING' && !isExpired(inv),
  );
}

/**
 * Marks a PENDING invitation ACCEPTED once the employee has completed OTP
 * verification and their real account has been created. No-op (returns
 * false) if the authorityId does not correspond to a pending invitation —
 * safe to call unconditionally after every successful authority activation,
 * whether or not that activation came from an invitation or a seeded record.
 */
export function markInvitationAccepted(authorityId: string): boolean {
  const normalized = authorityId.trim().toUpperCase();
  const list = getInvitations();
  const idx = list.findIndex((inv) => inv.authorityId.toUpperCase() === normalized && inv.status === 'PENDING');
  if (idx === -1) return false;
  const updated = [...list];
  updated[idx] = { ...updated[idx], status: 'ACCEPTED', acceptedAt: new Date().toISOString() };
  setInvitations(updated);
  return true;
}

/**
 * Case-insensitive lookup by Authority ID — the single entry point used by
 * the real registration flow (`/api/auth/register`). Checks the static
 * seed registry first, then falls back to a still-valid PENDING invitation,
 * which is adapted to the `AuthorityRecord` shape so every downstream
 * consumer (OTP email, account creation) works completely unchanged
 * regardless of which source the record came from.
 */
export function findAuthorityRecordById(authorityId: string): AuthorityRecord | undefined {
  const seeded = findSeededRecordById(authorityId);
  if (seeded) return seeded;

  const invitation = findPendingInvitationById(authorityId);
  if (!invitation) return undefined;

  return {
    authorityId: invitation.authorityId,
    authorityType: invitation.assignedRole,
    name: invitation.officialEmail.split('@')[0],
    officialEmail: invitation.officialEmail,
    department: invitation.department,
    state: invitation.state,
    district: invitation.district,
    geographicScope: invitation.geographicScope,
    status: 'ACTIVE',
    createdAt: invitation.createdAt,
    updatedAt: invitation.createdAt,
  };
}
