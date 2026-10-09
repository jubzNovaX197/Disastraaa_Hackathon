import { SituationAnalyticsDashboard } from '@/components/analytics/SituationAnalyticsDashboard';
import { resolveActiveRole } from '@/lib/auth/resolveRole';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Situation Analytics',
  description: 'Multi-hazard intelligence, impact trends and operational conditions.',
};

export default async function SituationAnalyticsPage() {
  const initialRole = await resolveActiveRole();

  return <SituationAnalyticsDashboard initialRole={initialRole} />;
}
