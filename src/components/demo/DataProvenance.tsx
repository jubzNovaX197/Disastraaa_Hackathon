'use client';

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { Activity, Clock, Cpu, Database } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DataProvenance({
  model = false,
  detail,
  source,
}: {
  model?: boolean;
  detail?: string;
  source?: 'Simulated' | 'Live API' | 'User report' | 'Role simulation';
}) {
  const { environment, lastSuccessfulSync } = useLiveIntelligence();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveSource = source ?? (environment === 'DEMO' ? 'Simulated' : 'Live API / cached observations');
  const isSimulation = environment === 'DEMO' || effectiveSource === 'Simulated';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-[11px] bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-300 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[9px] ${
            model
              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
              : isSimulation
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
          }`}
        >
          {model ? <Cpu className="w-2.5 h-2.5" /> : isSimulation ? <Activity className="w-2.5 h-2.5" /> : <Database className="w-2.5 h-2.5" />}
          <span>{model ? 'Model output' : effectiveSource}</span>
        </span>
        {model && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Inputs: <strong className="font-medium text-slate-700 dark:text-slate-300">{effectiveSource}</strong>
          </span>
        )}
        {detail && <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">· {detail}</span>}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300 font-mono ml-auto">
        <Clock className="w-3 h-3 text-slate-600 dark:text-slate-300" />
        <span suppressHydrationWarning>
          Last updated: {mounted && lastSuccessfulSync
            ? new Date(lastSuccessfulSync).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour12: false,
              }) + ' IST'
            : 'Awaiting first update'}
        </span>
      </div>
    </div>
  );
}
