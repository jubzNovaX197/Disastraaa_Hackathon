'use client';

/**
 * MapPageClient — client entry point for the public map page.
 * Powered by common DisasterMap with dynamic data environment switching.
 */

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DisasterMap } from '@/components/map/DisasterMap';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import type { DisasterDataset } from '@/data/types';
import type { AppEnvironment } from '@/lib/env';
import { Sparkles, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapPageClientProps {
  initialDataset: DisasterDataset;
  environment: AppEnvironment;
}

export function MapPageClient({ initialDataset, environment }: MapPageClientProps) {
  const router = useRouter();
  const { overrides } = useLiveIntelligence();
  const [currentEnv, setCurrentEnv] = useState<AppEnvironment>(environment);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setCurrentEnv(environment);
  }, [environment]);

  const handleToggleEnvironment = async (newEnv: AppEnvironment) => {
    if (newEnv === currentEnv || isSwitching) return;
    setIsSwitching(true);
    try {
      await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: newEnv }),
      });
      setCurrentEnv(newEnv);
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  };

  const liveDataset = useMemo(() => {
    if (currentEnv === 'DEMO') {
      return {
        ...initialDataset,
        alerts: overrides.alerts,
        shelters: overrides.shelters,
        citizenReports: overrides.reports,
      };
    }
    // In REAL mode, use real operational data
    return {
      ...initialDataset,
      citizenReports: overrides.reports.length > 0 ? overrides.reports : initialDataset.citizenReports,
    };
  }, [initialDataset, currentEnv, overrides.alerts, overrides.shelters, overrides.reports]);

  return (
    <div className="relative w-full h-full">
      {/* Environment Mode Switcher in top center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center bg-slate-900/90 dark:bg-surface-elevated/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-xl">
        <button
          type="button"
          onClick={() => handleToggleEnvironment('REAL')}
          disabled={isSwitching}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
            currentEnv === 'REAL'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200',
          )}
          title="Switch to Real Operation Mode (Live feed & real observations)"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real Mode</span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleEnvironment('DEMO')}
          disabled={isSwitching}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
            currentEnv === 'DEMO'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200',
          )}
          title="Switch to Demo Simulation Mode (Simulated disaster scenario)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulation</span>
        </button>
      </div>

      <DisasterMap
        dataset={liveDataset}
        environment={currentEnv}
        className="w-full h-full"
        center={[85.8, 20.0]}
        zoom={7.0}
      />
    </div>
  );
}
