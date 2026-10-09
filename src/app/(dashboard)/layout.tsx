import { DataProvenance } from '@/components/demo/DataProvenance';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { LiveTopBarBanner } from '@/components/realtime/LiveTopBarBanner';

/**
 * Dashboard layout — fixed sidebar + scrollable main area with live intelligence ticker.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto focus:outline-none flex flex-col">
        <div className="px-4 sm:px-6 pt-3 pb-0 max-w-[1600px] w-full mx-auto flex-shrink-0">
          <LiveTopBarBanner />
          <DataProvenance detail="Demo personas and operational actions: role simulation. Risk, impact, allocation and forecasts: Model output." />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}

