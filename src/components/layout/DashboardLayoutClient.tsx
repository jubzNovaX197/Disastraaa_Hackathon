'use client';

import { useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { LiveTopBarBanner } from '@/components/realtime/LiveTopBarBanner';
import { DataProvenance } from '@/components/demo/DataProvenance';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
}

export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      <main className="flex-1 min-h-0 overflow-y-auto focus:outline-none flex flex-col">
        <div className="px-4 sm:px-6 pt-3 pb-0 max-w-[1600px] w-full mx-auto flex-shrink-0">
          <LiveTopBarBanner onOpenMenu={() => setMobileSidebarOpen(true)} />
          <DataProvenance detail="Demo personas and operational actions: role simulation. Risk, impact, allocation and forecasts: Model output." />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
