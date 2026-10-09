import { EvacuationDashboard } from '@/components/evacuation/EvacuationDashboard';
import { demoEvacuationZones } from '@/data/demo/evacuationZones';
import { resolveServerEnvironment } from '@/lib/env';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Evacuation Management',
  description: 'Coordinate evacuation zones, safe routes and shelter capacity across active disaster areas.',
};

export default async function EvacuationPage() {
  const env = await resolveServerEnvironment();
  const zones = env === 'DEMO' ? demoEvacuationZones : [];
  return <EvacuationDashboard zones={zones} environment={env} />;
}
