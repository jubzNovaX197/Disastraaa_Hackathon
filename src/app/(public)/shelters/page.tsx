import { brand } from '@/config/brand';
import { resolveServerEnvironment } from '@/lib/env';
import { getShelterProvider } from '@/lib/providers';
import type { Metadata } from 'next';
import { SheltersPageClient } from './SheltersPageClient';

export const metadata: Metadata = {
  title: `Emergency Shelters | ${brand.name}`,
  description: 'Verified disaster relief shelters, real-time occupancy status, and emergency facilities.',
};

export default async function SheltersPage() {
  const environment = await resolveServerEnvironment();
  const provider = getShelterProvider(environment);
  const shelters = await provider.getShelters();

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <SheltersPageClient initialShelters={shelters} environment={environment} />
    </div>
  );
}
