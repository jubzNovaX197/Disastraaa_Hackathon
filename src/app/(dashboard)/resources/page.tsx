import type { Metadata } from 'next';
import { Package } from 'lucide-react';
import { PlannedFeaturePage } from '@/components/dashboard/PlannedFeaturePage';

import { resolveServerEnvironment } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Emergency Resources & Stockpiles',
  description: 'Tactical NDRF equipment, water purification units, inflatable boats, and emergency rations.',
};

export default async function ResourcesPage() {
  const env = await resolveServerEnvironment();
  const isDemo = env === 'DEMO';

  return (
    <PlannedFeaturePage
      title="Strategic Relief Resources & Stockpiles"
      category="Logistics & Supply Chain"
      icon={Package}
      description="Central resource mobilization registry tracking tactical NDRF search-and-rescue boats, water purification trailers, satellite communications packs, and emergency food packets."
      plannedCapabilities={[
        'Automated inter-district resource transfer requisitions',
        'NDRF 3rd Battalion equipment readiness telematics',
        'Consumable medicine & water purification tablet reserve alerts',
        'GIS routing for relief convoy dispatch with live road safety checks',
      ]}
      mockDataSummary={
        isDemo
          ? [
              { label: 'Rescue Boats (IRBs)', value: '62 Units Ready' },
              { label: 'Water Purification Kits', value: '18 Systems' },
              { label: 'Emergency Rations', value: '45,000 Packets' },
              { label: 'Satellite SAT-Comms', value: '12 Deployed' },
            ]
          : [
              { label: 'Resource Registry', value: 'Connected (Standby)' },
              { label: 'Active Requisitions', value: '0 Pending' },
              { label: 'Reserve Deficits', value: 'None Reported' },
              { label: 'Mobilization Status', value: 'Normal Operations' },
            ]
      }
    />
  );
}
