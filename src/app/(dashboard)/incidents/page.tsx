import { IncidentManagementDashboard } from '@/components/incidents/IncidentManagementDashboard';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import { resolveServerEnvironment } from '@/lib/env';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Incident Management | Disastraaa',
  description: 'Coordinate active emergencies, response teams and operational actions.',
};

export default async function IncidentsPage() {
  const initialRole = await resolveActiveRole();
  const environment = await resolveServerEnvironment();

  return <IncidentManagementDashboard initialRole={initialRole} environment={environment} />;
}
