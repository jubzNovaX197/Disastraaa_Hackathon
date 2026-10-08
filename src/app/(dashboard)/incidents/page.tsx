import type { Metadata } from 'next';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import { resolveServerEnvironment } from '@/lib/env';
import { IncidentManagementDashboard } from '@/components/incidents/IncidentManagementDashboard';

export const metadata: Metadata = {
  title: 'Incident Management | Disastraaa',
  description: 'Coordinate active emergencies, response teams and operational actions.',
};

export default async function IncidentsPage() {
  const initialRole = await resolveActiveRole();
  const environment = await resolveServerEnvironment();

  return <IncidentManagementDashboard initialRole={initialRole} environment={environment} />;
}
