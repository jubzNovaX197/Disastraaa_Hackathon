/** Role identifiers — extend this object to add future roles */
export const ROLES = {
  SUPER_ADMIN:        'SUPER_ADMIN',
  NATIONAL_AUTHORITY: 'NATIONAL_AUTHORITY',
  STATE_AUTHORITY:    'STATE_AUTHORITY',
  DISTRICT_AUTHORITY: 'DISTRICT_AUTHORITY',
  FIELD_OPERATOR:     'FIELD_OPERATOR',
  // Backward compatibility aliases
  BLOCK_AUTHORITY:    'BLOCK_AUTHORITY',
  OPERATIONS:         'OPERATIONS',
  CITIZEN:            'CITIZEN',
  // Baseline role granted to self-registered real (non-demo) accounts
  REGISTERED_USER:    'REGISTERED_USER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Authenticated user context — passed through auth layer (future task) */
export interface UserContext {
  id: string;
  name: string;
  role: Role;
  title?: string;
  clearanceLevel?: number; // 1 to 5
  /** State / district / block code this user administers */
  regionCode?: string;
  regionName?: string;
}

export interface RolePermissions {
  canViewGovernance:   boolean;
  canViewNationalData: boolean;
  canViewStateData:    boolean;
  canViewDistrictData: boolean;
  canVerifyReports:    boolean;
  canManageAlerts:     boolean;
  canManageResources:  boolean;
  canViewOperations:   boolean;
}

/**
 * Permission map per role.
 *
 * Used by components and server actions to gate visibility and actions.
 * Extend the record when new permission flags are introduced.
 */
export const rolePermissions: Record<Role, RolePermissions> = {
  [ROLES.SUPER_ADMIN]: {
    canViewGovernance:   true,
    canViewNationalData: true,
    canViewStateData:    true,
    canViewDistrictData: true,
    canVerifyReports:    true,
    canManageAlerts:     true,
    canManageResources:  true,
    canViewOperations:   true,
  },
  [ROLES.NATIONAL_AUTHORITY]: {
    canViewGovernance:   false,
    canViewNationalData: true,
    canViewStateData:    true,
    canViewDistrictData: true,
    canVerifyReports:    true,
    canManageAlerts:     true,
    canManageResources:  false,
    canViewOperations:   true,
  },
  [ROLES.STATE_AUTHORITY]: {
    canViewGovernance:   false,
    canViewNationalData: false,
    canViewStateData:    true,
    canViewDistrictData: true,
    canVerifyReports:    true,
    canManageAlerts:     true,
    canManageResources:  true,
    canViewOperations:   true,
  },
  [ROLES.DISTRICT_AUTHORITY]: {
    canViewGovernance:   false,
    canViewNationalData: false,
    canViewStateData:    false,
    canViewDistrictData: true,
    canVerifyReports:    true,
    canManageAlerts:     true,
    canManageResources:  true,
    canViewOperations:   true,
  },
  [ROLES.FIELD_OPERATOR]: {
    canViewGovernance:   false,
    canViewNationalData: false,
    canViewStateData:    false,
    canViewDistrictData: false,
    canVerifyReports:    true,
    canManageAlerts:     false,
    canManageResources:  true,
    canViewOperations:   true,
  },
  [ROLES.OPERATIONS]: {
    canViewGovernance:   false,
    canViewNationalData: false,
    canViewStateData:    false,
    canViewDistrictData: false,
    canVerifyReports:    true,
    canManageAlerts:     false,
    canManageResources:  true,
    canViewOperations:   true,
  },
  [ROLES.BLOCK_AUTHORITY]: {
    canViewGovernance:   false,
    canViewNationalData: false,
    canViewStateData:    false,
    canViewDistrictData: false,
    canVerifyReports:    true,
    canManageAlerts:     false,
    canManageResources:  false,
    canViewOperations:   true,
  },
  [ROLES.CITIZEN]: {
    canViewGovernance:   false,
    canViewNationalData: false,
    canViewStateData:    false,
    canViewDistrictData: false,
    canVerifyReports:    false,
    canManageAlerts:     false,
    canManageResources:  false,
    canViewOperations:   false,
  },
  [ROLES.REGISTERED_USER]: {
    canViewGovernance:   false,
    canViewNationalData: false,
    canViewStateData:    false,
    canViewDistrictData: true,
    canVerifyReports:    false,
    canManageAlerts:     false,
    canManageResources:  false,
    canViewOperations:   true,
  },
};
