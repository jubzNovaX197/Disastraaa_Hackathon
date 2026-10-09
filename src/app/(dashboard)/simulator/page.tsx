import { ResponseSimulatorDashboard } from '@/components/simulation/ResponseSimulatorDashboard';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Response Simulator',
  description: 'Model disaster conditions and assess potential operational impact.',
};

export default async function ResponseSimulatorPage() {
  const initialRole = await resolveActiveRole();

  return <ResponseSimulatorDashboard initialRole={initialRole} />;
}
