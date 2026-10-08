import type { Metadata } from 'next';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import { CommandCenterDashboard } from '@/components/commandCenter/CommandCenterDashboard';

export const metadata: Metadata = {
  title: 'Emergency Operations Command Center',
  description: 'Authority-facing decision-support command center for disaster response.',
};

export default async function DashboardPage() {
  const initialRole = await resolveActiveRole();

  return <CommandCenterDashboard initialRole={initialRole} />;
}
