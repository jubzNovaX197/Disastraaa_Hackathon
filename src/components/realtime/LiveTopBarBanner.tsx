'use client';

/**
 * Live Top Bar Banner
 *
 * Compact operational intelligence banner rendering at the top of operational views.
 * Displays live event ticker, feed status, data freshness, and direct controls.
 */

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { cn } from '@/lib/utils';
import { Menu, Zap } from 'lucide-react';
import { LiveStatusIndicator } from './LiveStatusIndicator';

interface LiveTopBarBannerProps {
  className?: string;
  onOpenFeed?: () => void;
  onOpenMenu?: () => void;
}

export function LiveTopBarBanner({ className, onOpenFeed, onOpenMenu }: LiveTopBarBannerProps) {
  const { recentEvents, status } = useLiveIntelligence();
  const latestEvent = recentEvents[0];

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs',
        'bg-slate-100/90 dark:bg-surface-card/90 border border-slate-200/80 dark:border-white/[0.08] shadow-xs backdrop-blur-md',
        className,
      )}
    >
      {/* Left: Latest Event Ticker */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden flex-1 min-w-0">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation sidebar"
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            <Menu className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </button>
        )}
        <span className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 flex-shrink-0 text-[11px] uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Operational Stream:</span>
        </span>

        {latestEvent ? (
          <div className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-300">
            <span className="font-semibold truncate">{latestEvent.title}</span>
            <span className="text-slate-400 hidden md:inline">·</span>
            <span className="text-[11px] text-slate-400 truncate hidden md:inline">
              {latestEvent.locationName}
            </span>
            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
              ({latestEvent.timeFormatted})
            </span>
          </div>
        ) : (
          <span className="text-slate-400 italic">Listening for incoming operational telemetry...</span>
        )}
      </div>

      {/* Right: Live Status Indicator, Controls & Theme Mode */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <LiveStatusIndicator />
        <div className="h-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}
