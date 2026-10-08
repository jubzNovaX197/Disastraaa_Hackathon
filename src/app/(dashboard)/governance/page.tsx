import type { Metadata } from 'next';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import { GovernanceDashboard } from '@/components/governance/GovernanceDashboard';

export const metadata: Metadata = {
  title: 'Platform Governance & Security Center',
  description: 'Super Admin platform governance, RBAC directory, and cryptographic audit trail.',
};

export default async function GovernancePage() {
  const initialRole = await resolveActiveRole();

  return <GovernanceDashboard initialRole={initialRole} />;
}
