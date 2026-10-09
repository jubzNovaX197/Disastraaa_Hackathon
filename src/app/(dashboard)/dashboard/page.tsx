import { CommandCenterDashboard } from '@/components/commandCenter/CommandCenterDashboard';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Emergency Operations Command Center',
  description: 'Authority-facing decision-support command center for disaster response.',
};

export default async function DashboardPage() {
  const initialRole = await resolveActiveRole();

  return <CommandCenterDashboard initialRole={initialRole} />;
}
