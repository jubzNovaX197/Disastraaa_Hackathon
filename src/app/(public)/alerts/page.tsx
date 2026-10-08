import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { resolveServerEnvironment } from '@/lib/env';
import { demoAlertProvider } from '@/lib/providers';
import { alertStore } from '@/lib/alerts/alertStore';
import { AlertsView } from '@/components/alerts';
import type { FeedStatusRecord } from '@/lib/alerts/types';

export const metadata: Metadata = {
  title: 'Disaster Warnings & Early Warning Broadcasts',
  description:
    'Live authoritative disaster bulletins and CAP v1.2 early warnings issued by India Meteorological Department (IMD) and disaster management authorities.',
};

export default async function AlertsPage() {
  const env = await resolveServerEnvironment();
  const isDemo = env === 'DEMO';

  let initialAlerts = [];
  let initialFeedStatuses: FeedStatusRecord[] = [];

  if (isDemo) {
    initialAlerts = await demoAlertProvider.getAlerts();
    initialFeedStatuses = [
      {
        feedId: 'demo-contingency',
        name: 'Demo Multi-Hazard Simulation Stream',
        authority: 'Contingency Scenario Engine',
        url: 'internal://data/demo/alerts',
        status: 'CONNECTED',
        itemCount: initialAlerts.length,
        lastChecked: new Date().toISOString(),
        notes: 'Pre-calibrated multi-hazard contingency simulation active.',
        isAuthoritative: false,
      },
    ];
  } else {
    const snapshot = await alertStore.getSnapshot();
    initialAlerts = snapshot.alerts;
    initialFeedStatuses = snapshot.feedStatuses;
  }

  return (
    <>
      <main className="pt-20 pb-16 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AlertsView
            initialAlerts={initialAlerts}
            initialFeedStatuses={initialFeedStatuses}
            initialEnvironment={env}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
