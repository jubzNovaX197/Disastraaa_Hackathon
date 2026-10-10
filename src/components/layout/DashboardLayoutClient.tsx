'use client';

import { useState, useCallback } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { LiveTopBarBanner } from '@/components/realtime/LiveTopBarBanner';
import { DataProvenance } from '@/components/demo/DataProvenance';
import type { Role } from '@/types/roles';

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  initialRole?: Role;
}

export function DashboardLayoutClient({ children, initialRole }: DashboardLayoutClientProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleOpenMobile = useCallback(() => setMobileSidebarOpen(true), []);
  const handleCloseMobile = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={handleCloseMobile}
        initialRole={initialRole}
      />
      <main className="flex-1 min-h-0 overflow-y-auto focus:outline-none flex flex-col w-full max-w-full">
        {/* Sticky top-bar container on mobile so the menu hamburger is always accessible */}
        <div className="sticky top-0 z-30 bg-surface-base/95 backdrop-blur-md px-3 sm:px-6 pt-2 sm:pt-3 pb-2 max-w-[1600px] w-full mx-auto flex-shrink-0 border-b border-slate-200/50 dark:border-white/[0.04] lg:border-b-0 lg:static lg:bg-transparent lg:backdrop-blur-none">
          <LiveTopBarBanner onOpenMenu={handleOpenMobile} />
          <DataProvenance detail="Demo personas and operational actions: role simulation. Risk, impact, allocation and forecasts: Model output." />
        </div>
        <div className="flex-1 min-h-0 flex flex-col w-full max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
