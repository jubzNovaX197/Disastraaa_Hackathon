import { ROLES, rolePermissions, type Role } from '@/types/roles';

export function isKnownRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

export function canAccessDashboard(role: Role, pathname: string): boolean {
  const permissions = rolePermissions[role];
  if (pathname === '/governance' || pathname.startsWith('/governance/')) return permissions.canViewGovernance;
  if (pathname === '/analytics' || pathname.startsWith('/analytics/')) return permissions.canViewNationalData;
  if (pathname === '/state' || pathname.startsWith('/state/')) return permissions.canViewStateData;
  if (pathname === '/reports/manage' || pathname.startsWith('/reports/manage/')) return permissions.canVerifyReports;
  if (pathname === '/personnel' || pathname.startsWith('/personnel/')) {
    return [ROLES.SUPER_ADMIN, ROLES.NATIONAL_AUTHORITY, ROLES.STATE_AUTHORITY, ROLES.DISTRICT_AUTHORITY].some(allowed => allowed === role);
  }
  return permissions.canViewOperations;
}
