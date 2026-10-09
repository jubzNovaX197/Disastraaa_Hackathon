'use client';

/**
 * Live Status Indicator
 *
 * Professional operational status badge displaying real-time connection state,
 * data freshness (seconds since sync), and unread activity count.
 *
 * Fully responsive, accessible, dark/light mode polished.
 */

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { getFeedLabel } from '@/lib/realtime/feedStatus';
import { cn } from '@/lib/utils';
import { Pause, Play, RefreshCw, WifiOff } from 'lucide-react';

interface LiveStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export function LiveStatusIndicator({ className, compact = false }: LiveStatusIndicatorProps) {
  const {
    status,
    environment,
    overrides,
    lastSuccessfulSync,
    sourceName,
    secondsSinceSync,
    isPaused,
    unreadEventCount,
    pauseFeed,
    resumeFeed,
    refreshNow,
    markEventsRead,
    openDrawer,
  } = useLiveIntelligence();

  const handleOpenDrawer = () => {
    markEventsRead();
    openDrawer();
  };

  // Status visual configs
  const statusConfig = {
    connected: {
      dotColor: 'bg-emerald-500',
      ringColor: 'ring-emerald-400/40',
      label: 'SIMULATED LIVE FEED',
      freshness: secondsSinceSync === 0 ? 'SYNCED JUST NOW' : `SYNCED ${secondsSinceSync}s AGO`,
      badgeClass: 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
    updating: {
      dotColor: 'bg-blue-500',
      ringColor: 'ring-blue-400/40',
      label: 'SIMULATED LIVE FEED',
      freshness: 'UPDATING STREAMS...',
      badgeClass: 'text-blue-700 dark:text-blue-400 border-blue-500/30 bg-blue-500/10',
    },
    paused: {
      dotColor: 'bg-amber-500',
      ringColor: 'ring-amber-400/40',
      label: 'SIMULATION FEED',
      freshness: 'FEED PAUSED',
      badgeClass: 'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    delayed: {
      dotColor: 'bg-amber-500',
      ringColor: 'ring-amber-400/40',
      label: 'SIMULATION FEED',
      freshness: `DELAYED (${secondsSinceSync}s)`,
      badgeClass: 'text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    reconnecting: {
      dotColor: 'bg-purple-500',
      ringColor: 'ring-purple-400/40',
      label: 'FEED RECONNECTING',
      freshness: 'RESTORING LINK...',
      badgeClass: 'text-purple-700 dark:text-purple-400 border-purple-500/30 bg-purple-500/10',
    },
    offline: {
      dotColor: 'bg-rose-500',
      ringColor: 'ring-rose-400/40',
      label: 'FEED OFFLINE',
      freshness: 'CACHED DATA ONLY',
      badgeClass: 'text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10',
    },
  }[status];

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
        {/* Main interactive indicator badge */}
        <button
          type="button"
          onClick={handleOpenDrawer}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all select-none',
            'hover:shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer',
            statusConfig.badgeClass,
          )}
          title={`Click to open Live Intelligence Stream & Controls (${sourceName})`}
        >
          {/* Pulsing dot / indicator icon */}
          <span className="relative flex h-2 w-2">
            {status === 'connected' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            {status === 'updating' ? (
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-500" />
            ) : status === 'offline' ? (
              <WifiOff className="w-2.5 h-2.5 text-rose-500" />
            ) : (
              <span className={cn('relative inline-flex rounded-full h-2 w-2', statusConfig.dotColor)} />
            )}
          </span>

          {/* Text Labels */}
          {!compact && (
            <span className="text-[11px] font-bold tracking-wider font-mono">
              {getFeedLabel(environment, status, overrides.alerts.filter(alert => alert.isActive).length)}
            </span>
          )}

          <span className="text-[10px] opacity-80 font-mono hidden sm:inline">
            · Last updated: {lastSuccessfulSync ? new Date(lastSuccessfulSync).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST' : 'Awaiting feed'}
          </span>

          {/* Unread updates pill */}
          {unreadEventCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-purple-600 text-white animate-pulse">
              +{unreadEventCount}
            </span>
          )}
        </button>

        {/* Quick Pause / Resume button */}
        <button
          type="button"
          onClick={isPaused ? resumeFeed : pauseFeed}
          className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] transition-colors"
          title={isPaused ? 'Resume live simulation feed' : 'Pause live simulation feed'}
        >
          {isPaused ? <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" /> : <Pause className="w-3 h-3" />}
        </button>

        {/* Quick Sync Now button */}
        <button
          type="button"
          onClick={refreshNow}
          className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] transition-colors"
          title="Synchronize streams now"
        >
          <RefreshCw className={cn('w-3 h-3', status === 'updating' && 'animate-spin text-blue-500')} />
        </button>
      </div>
  );
}
