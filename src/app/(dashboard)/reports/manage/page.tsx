import { PlannedFeaturePage } from '@/components/dashboard/PlannedFeaturePage';
import { FileText } from 'lucide-react';
import type { Metadata } from 'next';

import { resolveServerEnvironment } from '@/lib/env';
import { getAllReports } from '@/lib/reports/store';
import type { CitizenReportItem } from '@/lib/reports/types';

export const metadata: Metadata = {
  title: 'Citizen Report Management & Verification',
  description: 'Authority review, AI deduplication, and photo evidence validation queue.',
};

export default async function ManageReportsPage() {
  const env = await resolveServerEnvironment();
  const isDemo = env === 'DEMO';
  const realReports: CitizenReportItem[] = getAllReports('REAL');
  const pendingCount = realReports.filter((r) => r.status === 'PENDING').length;

  return (
    <PlannedFeaturePage
      title="Citizen Report Verification Queue"
      category="Field Intelligence"
      icon={FileText}
      description="Operational triage queue for reviewing citizen-submitted disaster reports, clustering duplicate sightings with spatial buffering, and verifying photo evidence with automated AI assessment."
      plannedCapabilities={[
        'Automated spatial clustering of citizen hazard reports (200m buffer)',
        'Computer vision verification for flood depth and road blockages',
        'Direct promotion of verified reports to active Incident records',
        'Two-way SMS broadcast confirmation to verified citizen reporters',
      ]}
      mockDataSummary={
        isDemo
          ? [
              { label: 'Active Reports', value: '12 Reports' },
              { label: 'Pending Verification', value: '3 Queue items' },
              { label: 'AI Validation Match', value: '94% Confidence' },
              { label: 'Cluster Reduction', value: '3.4:1 ratio' },
            ]
          : [
              { label: 'Active Reports', value: `${realReports.length} Reports` },
              { label: 'Pending Verification', value: `${pendingCount} Queue items` },
              { label: 'AI Validation Match', value: realReports.length > 0 ? 'Active' : 'Standby' },
              { label: 'Cluster Reduction', value: realReports.length > 0 ? 'Active' : '0 Active Clusters' },
            ]
      }
    />
  );
}

