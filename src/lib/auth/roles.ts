/**
 * Authentication & Role Utilities for Authority Access
 *
 * Built on top of src/types/roles.ts.
 * Manages cookie-backed role resolution for server-side and client-side gating.
 */

import { ROLES, rolePermissions, type Role, type UserContext } from '@/types/roles';

export const ROLE_COOKIE_NAME = 'disastraaa-user-role';

/**
 * Returns true if the given role has clearance to access the
 * Emergency Operations Command Center (canViewOperations).
 */
export function isAuthorizedForOperations(role: Role): boolean {
  return Boolean(rolePermissions[role]?.canViewOperations);
}

/**
 * Returns true if the given role has clearance to access
 * Platform Governance & Audit logs.
 */
export function isAuthorizedForGovernance(role: Role): boolean {
  return Boolean(rolePermissions[role]?.canViewGovernance);
}

/**
 * Returns true if the given role has clearance to view national-level analytics.
 */
export function isAuthorizedForNational(role: Role): boolean {
  return Boolean(rolePermissions[role]?.canViewNationalData);
}

/**
 * Returns the active role from a cookie string or header value.
 * Defaults to CITIZEN if not specified (public-first),
 * while honoring any active role cookie.
 */
export function parseRoleFromCookie(cookieHeader?: string | null): Role {
  if (!cookieHeader) return ROLES.CITIZEN;

  const match = cookieHeader.match(new RegExp(`(?:^|; )${ROLE_COOKIE_NAME}=([^;]*)`));
  const rawRole = match ? decodeURIComponent(match[1]) : null;

  if (rawRole && Object.values(ROLES).includes(rawRole as Role)) {
    return rawRole as Role;
  }

  return ROLES.CITIZEN;
}

export interface DemoRoleDefinition {
  role: Role;
  name: string;
  shortDesc: string;
  fullDesc: string;
  clearanceLevel: number;
  clearanceLabel: string;
  icon: string; // Lucide icon name
  defaultDashboard: string;
  assignedOfficer: string;
  officerTitle: string;
  jurisdiction: string;
  badgeVariant: 'critical' | 'warning' | 'info' | 'success' | 'accent';
  primaryCapabilities: string[];
}

export const DEMO_ROLES_CONFIG: DemoRoleDefinition[] = [
  {
    role: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    shortDesc: 'Platform governance, multi-agency RBAC policies & security audit trail',
    fullDesc: 'Complete platform administration, global security policies, user & role provisioning, system diagnostics, and unalterable audit trails across all operational jurisdictions.',
    clearanceLevel: 5,
    clearanceLabel: 'Level 5 · Global Governance',
    icon: 'ShieldAlert',
    defaultDashboard: '/governance',
    assignedOfficer: 'Dr. Amitav Sen',
    officerTitle: 'Chief Platform Security Officer',
    jurisdiction: 'National Disaster Informatics Core (NDIC)',
    badgeVariant: 'critical',
    primaryCapabilities: [
      'Platform governance & RBAC management',
      'Security audit logging & integrity verification',
      'Global incident escalation & policy enforcement',
      'Full cross-jurisdictional system access',
    ],
  },
  {
    role: ROLES.NATIONAL_AUTHORITY,
    name: 'National Authority',
    shortDesc: 'National situation monitoring, cross-state intelligence & central coordination',
    fullDesc: 'NDMA national emergency overview, multi-hazard risk synthesis across states, central strategic resource reserves, and interstate evacuation coordination.',
    clearanceLevel: 4,
    clearanceLabel: 'Level 4 · National Command',
    icon: 'Globe2',
    defaultDashboard: '/analytics',
    assignedOfficer: 'Col. Rajeshwar Singh (Retd.)',
    officerTitle: 'Director of National Operations, NDMA',
    jurisdiction: 'National Disaster Management Authority (HQ New Delhi)',
    badgeVariant: 'warning',
    primaryCapabilities: [
      'Cross-state hazard monitoring & impact projections',
      'National early warning broadcast oversight',
      'Inter-state resource mobilization requests',
      'Multi-agency defense & NDRF coordination',
    ],
  },
  {
    role: ROLES.STATE_AUTHORITY,
    name: 'State Authority',
    shortDesc: 'Statewide command center, district coordination & high-level alerts',
    fullDesc: 'State Emergency Operations Center (SEOC), statewide situational intelligence, multi-district resource allocation, coastal evacuation oversight, and alert authorization.',
    clearanceLevel: 3,
    clearanceLabel: 'Level 3 · State Operations',
    icon: 'Building2',
    defaultDashboard: '/dashboard',
    assignedOfficer: 'Dr. Suresh Mohapatra',
    officerTitle: 'Special Relief Commissioner & MD',
    jurisdiction: 'Odisha State Disaster Management Authority (OSDMA)',
    badgeVariant: 'accent',
    primaryCapabilities: [
      'Statewide incident command & triage',
      'District emergency cell coordination',
      'State cyclone & flood alert authorization',
      'Evacuation corridor & shelter activation',
    ],
  },
  {
    role: ROLES.DISTRICT_AUTHORITY,
    name: 'District Authority',
    shortDesc: 'District command center, incident triage, shelters & ground coordination',
    fullDesc: 'District Emergency Operations Cell (DEOC), localized disaster incident response, field team dispatch, cyclone shelter management, and road clearance coordination.',
    clearanceLevel: 2,
    clearanceLabel: 'Level 2 · District Command',
    icon: 'MapPin',
    defaultDashboard: '/dashboard',
    assignedOfficer: 'Priyadarshini Sahoo (IAS)',
    officerTitle: 'District Collector & Magistrate',
    jurisdiction: 'Puri District Emergency Operations Cell (DEOC)',
    badgeVariant: 'info',
    primaryCapabilities: [
      'District incident triage & priority dispatch',
      'Shelter capacity & relief supply allocation',
      'Field rescue team tasking & tracking',
      'Citizen report verification & road clearance',
    ],
  },
  {
    role: ROLES.FIELD_OPERATOR,
    name: 'Field Operator',
    shortDesc: 'Tactical field response, assigned incidents, evidence & operational updates',
    fullDesc: 'On-scene first responders (NDRF / ODRAF / Fire Services), ground incident status updates, road obstacle clearance reporting, and photo evidence verification.',
    clearanceLevel: 1,
    clearanceLabel: 'Level 1 · Tactical Field',
    icon: 'Truck',
    defaultDashboard: '/operations',
    assignedOfficer: 'Cmdr. R. K. Verma',
    officerTitle: '3rd Battalion NDRF Commander',
    jurisdiction: 'Coastal Sector Tactical Unit (Puri - Konark)',
    badgeVariant: 'success',
    primaryCapabilities: [
      'Live field dispatch & route navigation',
      'Ground truth validation & photo evidence capture',
      'Victim triage & transit point reporting',
      'Operational status telemetry updates',
    ],
  },
];

/**
 * Helper to build standard UserContext for the demo session.
 */
export function getDemoUserContext(role: Role = ROLES.STATE_AUTHORITY): UserContext {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return {
        id: 'usr-super-admin-01',
        name: 'Dr. Amitav Sen',
        role: ROLES.SUPER_ADMIN,
        title: 'Chief Platform Security Officer',
        clearanceLevel: 5,
        regionCode: 'NDIC-GLOBAL',
        regionName: 'National Disaster Informatics Core (NDIC)',
      };
    case ROLES.NATIONAL_AUTHORITY:
      return {
        id: 'usr-ndma-hq-01',
        name: 'Col. Rajeshwar Singh (Retd.)',
        role: ROLES.NATIONAL_AUTHORITY,
        title: 'Director of National Operations, NDMA',
        clearanceLevel: 4,
        regionCode: 'IN-NDMA',
        regionName: 'National Disaster Management Authority (HQ New Delhi)',
      };
    case ROLES.STATE_AUTHORITY:
      return {
        id: 'usr-seoc-dir-01',
        name: 'Dr. Suresh Mohapatra',
        role: ROLES.STATE_AUTHORITY,
        title: 'Special Relief Commissioner & MD',
        clearanceLevel: 3,
        regionCode: 'OD-SEOC',
        regionName: 'Odisha State Disaster Management Authority (OSDMA)',
      };
    case ROLES.DISTRICT_AUTHORITY:
      return {
        id: 'usr-deoc-puri-01',
        name: 'Priyadarshini Sahoo (IAS)',
        role: ROLES.DISTRICT_AUTHORITY,
        title: 'District Collector & Magistrate',
        clearanceLevel: 2,
        regionCode: 'OD-PURI',
        regionName: 'Puri District Emergency Operations Cell (DEOC)',
      };
    case ROLES.FIELD_OPERATOR:
    case ROLES.OPERATIONS:
      return {
        id: 'usr-ndrf-03-cmd',
        name: 'Cmdr. R. K. Verma',
        role: ROLES.FIELD_OPERATOR,
        title: '3rd Battalion NDRF Commander',
        clearanceLevel: 1,
        regionCode: 'NDRF-3BN',
        regionName: '3rd Battalion NDRF Tactical Unit',
      };
    case ROLES.BLOCK_AUTHORITY:
      return {
        id: 'usr-beoc-konark-01',
        name: 'B. K. Pradhan (BDO)',
        role: ROLES.BLOCK_AUTHORITY,
        title: 'Block Development Officer',
        clearanceLevel: 1,
        regionCode: 'OD-PURI-KONARK',
        regionName: 'Konark Coastal Block Administration',
      };
    case ROLES.CITIZEN:
    default:
      return {
        id: 'usr-citizen-demo',
        name: 'Public Citizen Access',
        role: ROLES.CITIZEN,
        title: 'Public Portal User',
        clearanceLevel: 0,
        regionCode: 'PUBLIC',
        regionName: 'Disastraaa Public Portal',
      };
  }
}

