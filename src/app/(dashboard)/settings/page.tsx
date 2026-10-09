import { PlannedFeaturePage } from '@/components/dashboard/PlannedFeaturePage';
import { Settings } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform System Settings',
  description: 'API keys, weather radar feeds, map styles, and alert broadcast gateways.',
};

export default function SettingsPage() {
  return (
    <PlannedFeaturePage
      title="Platform Configuration & Integration Gateways"
      category="System Configuration"
      icon={Settings}
      description="Integration endpoints for IMD Doppler Weather Radar feeds, INCOIS coastal oceanographic buoys, Common Alerting Protocol (CAP) SMS gateways, and MapLibre custom vector basemaps."
      plannedCapabilities={[
        'Doppler Weather Radar (DWR) Paradip & Gopalpur feed connectors',
        'INCOIS Tsunami Early Warning & storm surge telemetry keys',
        'National Emergency Alert System (Cell Broadcast Service) sandbox testing',
        'MapLibre high-contrast night ops raster and vector style toggles',
      ]}
      mockDataSummary={[
        { label: 'External Radar Feeds', value: 'IMD Bhubaneswar (Active)' },
        { label: 'Ocean Buoy Latency', value: '42ms' },
        { label: 'Cell Broadcast Gateway', value: 'NDMA CAP Compliant' },
        { label: 'Vector Tile Cache', value: '98.7% Hit Rate' },
      ]}
    />
  );
}
