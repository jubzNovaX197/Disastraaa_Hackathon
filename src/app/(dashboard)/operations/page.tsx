import { ResponseOperationsDashboard } from '@/components/response/ResponseOperationsDashboard';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Response Operations',
  description: 'Multi-agency tactical response coordination, resource readiness, and allocation platform.',
};

export default async function ResponseOperationsPage() {
  const initialRole = await resolveActiveRole();

  return <ResponseOperationsDashboard initialRole={initialRole} />;
}
