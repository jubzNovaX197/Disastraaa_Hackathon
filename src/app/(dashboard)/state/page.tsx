import type { Metadata } from 'next';
import { Activity } from 'lucide-react';
import { PlannedFeaturePage } from '@/components/dashboard/PlannedFeaturePage';

import { resolveServerEnvironment } from '@/lib/env';

export const metadata: Metadata = {
  title: 'State & Regional Risk Profiles',
  description: 'Multi-hazard vulnerability assessments, historical flood frequencies, and exposure models.',
};

export default async function StateRiskPage() {
  const env = await resolveServerEnvironment();
  const isDemo = env === 'DEMO';

  return (
    <PlannedFeaturePage
      title="Regional Multi-Hazard Vulnerability Models"
      category="Intelligence & Risk Assessment"
      icon={Activity}
      description="Integrated district and block-level vulnerability matrices incorporating bathymetric flood models, cyclone return frequencies, coastal soil erosion indices, and socio-economic exposure coefficients."
      plannedCapabilities={[
        'Downscaled IPCC climate risk projection overlays for 2026–2030',
        'Block-wise multi-hazard vulnerability scoring across 30 Odisha districts',
        'Automated building vulnerability classification from high-res satellite tiles',
        'Direct export to NDMA National Risk Portal format',
      ]}
      mockDataSummary={
        isDemo
          ? [
              { label: 'Assessed Coastal Blocks', value: '74 Blocks' },
              { label: 'Critical Risk Districts', value: 'Puri, Balasore, Ganjam' },
              { label: 'Vulnerability Index', value: 'High (0.78)' },
              { label: 'Update Cadence', value: 'Weekly sync' },
            ]
          : [
              { label: 'Vulnerability Datasets', value: 'National Portal Standby' },
              { label: 'Risk Matrices', value: 'Awaiting Sensor Ingest' },
              { label: 'Telemetry Stream', value: 'Live Standby' },
              { label: 'Baseline', value: 'Zero Risk Bias' },
            ]
      }
    />
  );
}
