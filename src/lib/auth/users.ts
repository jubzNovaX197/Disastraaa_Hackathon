/**
 * Real User Store
 *
 * In-memory, server-process-lifetime persistence for accounts created via
 * real Register/Login — mirrors the existing in-memory store pattern already
 * used elsewhere in this project (see `src/lib/incidents/store.ts` and
 * `src/lib/reports/store.ts`). The project has no database, so this is the
 * established persistence approach: a module-level singleton array behind
 * plain functions. Resets on server restart, which is acceptable for a
 * hackathon/demo deployment and keeps this fully dependency-free.
 *
 * Node-only (imports `./password`, which uses `crypto.scrypt`) — only ever
 * imported from API route handlers, never from `middleware.ts` or
 * `session.ts` (both Edge-safe, Web-Crypto-only).
 *
 * Completely separate from Demo Access (`disastraaa-user-role` cookie,
 * `src/lib/auth/roles.ts`). Demo personas are never written here, and
 * nothing in this file reads or writes the demo role cookie.
 *
 * ONE canonical real-account table: the baseline citizen signup
 * (`createVerifiedCitizenUser`, role REGISTERED_USER) and the
 * authority-verified signup (`createVerifiedAuthorityUser`, role/department/
 * scope copied from an `AuthorityRecord` — see
 * `lib/auth/authorityRegistry.ts`) both write into this same `_users`
 * array. There is no second/duplicate user table.
 *
 * Seed data below provides ONE pre-verified test account per operational
 * RBAC level (SUPER_ADMIN, NATIONAL, STATE, DISTRICT, FIELD) plus one
 * PUBLIC/CITIZEN account, for local hackathon testing. Credentials are
 * documented in `SEED_ACCOUNTS.md` at the project root — never in the UI.
 */

import { ROLES, type Role } from '@/types/roles';
import { randomUUID } from 'crypto';
import { hashPassword } from './password';

export interface StoredUser {
  id: string;
  name: string;
  /** Normalized lowercase — the unique lookup key. */
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: Role;
  /** Present only for accounts created through authority verification. */
  authorityId?: string;
  department?: string;
  state?: string;
  district?: string;
  geographicScope?: string;
  /** Citizen-account-only fields. */
  phone?: string;
  address?: string;
  /** Present only if the citizen explicitly granted browser location access. */
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

/** Public-safe projection — never include passwordHash/passwordSalt in API responses. */
export type SafeUser = Omit<StoredUser, 'passwordHash' | 'passwordSalt'>;

const globalForUsers = globalThis as unknown as {
  _disastraaaUsers?: StoredUser[];
};

function seedAuthority(
  id: string,
  name: string,
  email: string,
  role: Role,
  authorityId: string,
  department: string,
  state: string | undefined,
  district: string | undefined,
  geographicScope: string,
): StoredUser {
  const { hash, salt } = hashPassword('Password123!');
  return {
    id,
    name,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    role,
    authorityId,
    department,
    state,
    district,
    geographicScope,
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  };
}

function initUsers(): StoredUser[] {
  if (globalForUsers._disastraaaUsers) {
    return globalForUsers._disastraaaUsers;
  }

  // Pre-seed ONE verified account per RBAC level, plus one citizen account —
  // for immediate local testing & evaluation. See SEED_ACCOUNTS.md for the
  // full credential list (never exposed in the UI).
  const seeds: StoredUser[] = [
    seedAuthority(
      'seed-usr-super-admin',
      'Dr. Amitav Sen',
      'superadmin@disastraaa.gov.demo',
      ROLES.SUPER_ADMIN,
      'DIS-SUPER-001',
      'Platform Governance',
      undefined,
      undefined,
      'National Disaster Informatics Core (NDIC)',
    ),
    seedAuthority(
      'seed-usr-national',
      'Col. Rajeshwar Singh (Retd.)',
      'ops@ndma.gov.demo',
      ROLES.NATIONAL_AUTHORITY,
      'DIS-NAT-001',
      'National Operations',
      undefined,
      undefined,
      'Pan-India',
    ),
    seedAuthority(
      'seed-usr-state',
      'Dr. Suresh Mohapatra',
      'commissioner@osdma.gov.demo',
      ROLES.STATE_AUTHORITY,
      'DIS-STATE-OD-001',
      'State Emergency Operations Center',
      'Odisha',
      undefined,
      'Odisha',
    ),
    seedAuthority(
      'seed-usr-district',
      'Bargarh District Disaster Management Authority',
      'collector@bargarh.nic.demo',
      ROLES.DISTRICT_AUTHORITY,
      'DIS-DIST-BRG-001',
      'District Emergency Operations Cell',
      'Odisha',
      'Bargarh',
      'Bargarh District',
    ),
    seedAuthority(
      'seed-usr-field',
      'Odisha Field Response Unit (NDRF Bargarh Sector)',
      'fieldops@ndrf.gov.demo',
      ROLES.FIELD_OPERATOR,
      'DIS-FIELD-BRG-001',
      'Tactical Field Response',
      'Odisha',
      'Bargarh',
      'Bargarh Sector',
    ),
  ];

  // One pre-verified public/citizen account.
  const { hash: citizenHash, salt: citizenSalt } = hashPassword('Password123!');
  seeds.push({
    id: 'seed-usr-citizen',
    name: 'Ananya Patnaik',
    email: 'citizen@example.demo',
    passwordHash: citizenHash,
    passwordSalt: citizenSalt,
    role: ROLES.REGISTERED_USER,
    phone: '+91 90000 00000',
    address: 'Link Road, Bhubaneswar',
    state: 'Odisha',
    district: 'Khordha',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  });

  globalForUsers._disastraaaUsers = seeds;
  return globalForUsers._disastraaaUsers;
}

export function getUsersStore(): StoredUser[] {
  if (!globalForUsers._disastraaaUsers) {
    globalForUsers._disastraaaUsers = initUsers();
  }
  return globalForUsers._disastraaaUsers;
}

let _users: StoredUser[] = getUsersStore();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toSafeUser(user: StoredUser): SafeUser {
  const { passwordHash: _hash, passwordSalt: _salt, ...safe } = user;
  return safe;
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const normalized = normalizeEmail(email);
  return getUsersStore().find((u) => u.email === normalized);
}

export function findUserById(id: string): StoredUser | undefined {
  return getUsersStore().find((u) => u.id === id);
}

export interface CreateVerifiedAuthorityUserInput {
  name: string;
  email: string;
  /** Already hashed by `lib/auth/password.ts` — never re-hashed here. */
  passwordHash: string;
  passwordSalt: string;
  /** Copied from the matched AuthorityRecord — never from client input. */
  role: Role;
  authorityId: string;
  department?: string;
  state?: string;
  district?: string;
  geographicScope?: string;
}

/**
 * Creates a real account from an already-verified pending authority
 * registration (see `lib/auth/emailVerification.ts`). Only ever called
 * after `verifyPendingAuthorityAccount` has succeeded, so the password has
 * already been hashed at initial registration time and is never re-hashed
 * or persisted in plaintext at any point in this flow.
 */
export function createVerifiedAuthorityUser(input: CreateVerifiedAuthorityUserInput): StoredUser {
  const user: StoredUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    role: input.role,
    authorityId: input.authorityId,
    department: input.department,
    state: input.state,
    district: input.district,
    geographicScope: input.geographicScope,
    createdAt: new Date().toISOString(),
  };
  const current = getUsersStore();
  const next = [...current, user];
  _users = next;
  globalForUsers._disastraaaUsers = next;
  return user;
}

export interface CreateVerifiedCitizenUserInput {
  name: string;
  email: string;
  /** Already hashed by `lib/auth/password.ts` — never re-hashed here. */
  passwordHash: string;
  passwordSalt: string;
  phone?: string;
  address?: string;
  state?: string;
  district?: string;
  /** Present only if the citizen explicitly granted browser location access. */
  latitude?: number;
  longitude?: number;
}

/**
 * Creates a real public/citizen account from an already-verified pending
 * citizen registration (see `lib/auth/citizenVerification.ts`). Always gets
 * the baseline `REGISTERED_USER` role — a citizen can never self-assign any
 * authority role. Only ever called after OTP verification succeeds.
 */
export function createVerifiedCitizenUser(input: CreateVerifiedCitizenUserInput): StoredUser {
  const user: StoredUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    role: ROLES.REGISTERED_USER,
    phone: input.phone,
    address: input.address,
    state: input.state,
    district: input.district,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: new Date().toISOString(),
  };
  const current = getUsersStore();
  const next = [...current, user];
  _users = next;
  globalForUsers._disastraaaUsers = next;
  return user;
}
