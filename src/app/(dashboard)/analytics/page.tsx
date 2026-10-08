import type { Metadata } from 'next';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import { SituationAnalyticsDashboard } from '@/components/analytics/SituationAnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Situation Analytics',
  description: 'Multi-hazard intelligence, impact trends and operational conditions.',
};

export default async function SituationAnalyticsPage() {
  const initialRole = await resolveActiveRole();

  return <SituationAnalyticsDashboard initialRole={initialRole} />;
}
