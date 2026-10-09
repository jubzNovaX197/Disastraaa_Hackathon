import { resolveServerEnvironment } from '@/lib/env';
import { getDatasetProvider } from '@/lib/providers';
import type { Metadata } from 'next';
import { MapPageClient } from './MapPageClient';

export const metadata: Metadata = {
  title: 'Disaster Map',
  description: 'Interactive disaster intelligence map — risk zones, flood areas, shelters, alerts and infrastructure.',
};

/**
 * Map page (RSC shell).
 *
 * Resolves the server-safe data environment (REAL vs DEMO),
 * fetches the corresponding dataset via provider abstraction,
 * and renders the common client map.
 */
export default async function MapPage() {
  const environment = await resolveServerEnvironment();
  const provider = getDatasetProvider(environment);
  const initialDataset = await provider.getDataset();

  return (
    <div className="mt-16 h-[calc(100vh-4rem)] w-full overflow-hidden">
      <MapPageClient initialDataset={initialDataset} environment={environment} />
    </div>
  );
}
