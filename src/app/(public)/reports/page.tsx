import type { Metadata } from 'next';
import { Footer } from '@/components/layout/Footer';
import { PublicReportList } from '@/components/reports';

export const metadata: Metadata = {
  title: 'Citizen Reports · Disastraaa',
  description: 'Real-time citizen disaster reporting, community confirmation, and authority ground intelligence verification.',
};

export default function ReportsPage() {
  return (
    <>
      <main className="pt-20 pb-16 min-h-screen bg-surface-base dark:bg-surface-base transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <PublicReportList />
        </div>
      </main>
      <Footer />
    </>
  );
}
