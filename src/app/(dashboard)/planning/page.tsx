import type { Metadata } from 'next';
import { Calendar } from 'lucide-react';
import { PlannedFeaturePage } from '@/components/dashboard/PlannedFeaturePage';

import { resolveServerEnvironment } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Disaster Mitigation & Pre-Disaster Planning',
  description: 'Contingency plans, pre-monsoon readiness checklists, and inter-agency mock drill schedules.',
};

export default async function PlanningPage() {
  const env = await resolveServerEnvironment();
  const isDemo = env === 'DEMO';

  return (
    <PlannedFeaturePage
      title="Strategic Disaster Mitigation & Contingency Planning"
      category="Strategic Planning"
      icon={Calendar}
      description="Pre-disaster readiness protocols, pre-monsoon drainage audit checklists, inter-agency mock drill schedules, and automated standard operating procedures (SOP) triggers for district administrations."
      plannedCapabilities={[
        'Interactive Pre-Monsoon Emergency SOP execution checklists',
        'Multi-agency table-top drill simulation record keeping',
        'State Disaster Mitigation Fund (SDMF) project tracking',
        'Pre-emptive resource staging recommendations based on 72h ECMWF cyclone models',
      ]}
      mockDataSummary={
        isDemo
          ? [
              { label: 'Active Contingency Plans', value: '14 Coastal Districts' },
              { label: 'SOP Compliance Score', value: '92.4%' },
              { label: 'Next Joint Drill', value: 'Puri Coastal Drill' },
              { label: 'SDMF Active Projects', value: '28 Schemes' },
            ]
          : [
              { label: 'Operational Status', value: 'Standby / Normal' },
              { label: 'Contingency Protocols', value: 'Awaiting Activation' },
              { label: 'Telemetry Stream', value: 'Operational Standby' },
              { label: 'Active Exercises', value: '0 Active' },
            ]
      }
    />
  );
}
