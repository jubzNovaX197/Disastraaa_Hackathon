'use client';

import type { FeedStatusRecord } from '@/lib/alerts/types';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronDown, ChevronUp, Info, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface AlertFeedStatusBannerProps {
  feedStatuses: FeedStatusRecord[];
  isDemo: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefreshed?: string;
}

export function AlertFeedStatusBanner({
  feedStatuses,
  isDemo,
  onRefresh,
  isRefreshing = false,
  lastRefreshed,
}: AlertFeedStatusBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const activeFeedsCount = feedStatuses.filter((f) => f.status === 'CONNECTED').length;
  const restrictedFeedsCount = feedStatuses.filter((f) => f.status === 'RESTRICTED_WAF').length;

  return (
    <div className="rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] shadow-sm overflow-hidden mb-6 transition-all">
      {/* Top compact bar */}
      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Authoritative Early Warning Feeds
              </span>
              {isDemo ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-bold uppercase">
                  Simulation Feed
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-bold uppercase">
                  WMO / CAP v1.2 Protocol
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isDemo
                ? 'Internal contingency simulation broadcasting emergency scenario alerts.'
                : `${activeFeedsCount} feed connected · ${restrictedFeedsCount > 0 ? `${restrictedFeedsCount} feed monitored (WAF protected)` : 'All systems operational'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {lastRefreshed && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline">
              Synced {new Date(lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {onRefresh && (
            <button
              type="button"
              disabled={isRefreshing}
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50"
              title="Query authoritative alert feeds now"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-cyan-500')} />
              <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            aria-expanded={expanded}
          >
            <span>Telemetry</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Feed Status Details */}
      {expanded && (
        <div className="border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] p-3.5 sm:p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Feed Connectivity &amp; Access Diagnostic Log
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {feedStatuses.map((feed) => {
              const isConnected = feed.status === 'CONNECTED';
              const isWaf = feed.status === 'RESTRICTED_WAF';

              return (
                <div
                  key={feed.feedId}
                  className={cn(
                    'p-3 rounded-xl border text-xs space-y-1.5',
                    isConnected
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-700 dark:text-slate-300'
                      : isWaf
                      ? 'bg-amber-500/5 border-amber-500/20 text-slate-700 dark:text-slate-300'
                      : 'bg-rose-500/5 border-rose-500/20 text-slate-700 dark:text-slate-300',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {isConnected ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      {feed.name}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase',
                        isConnected
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : isWaf
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
                      )}
                    >
                      {isConnected ? 'ONLINE' : isWaf ? 'WAF BLOCKED' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Authority: <strong className="text-slate-700 dark:text-slate-300">{feed.authority}</strong>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {feed.notes}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-white/5 font-mono">
                    <span>Items retrieved: {feed.itemCount}</span>
                    {feed.responseTimeMs !== undefined && <span>Ping: {feed.responseTimeMs}ms</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-cyan-500/5 border border-cyan-500/15 p-2.5 rounded-xl">
            <Info className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Zero-Fabrication Guarantee:</strong> When government alerting portals (e.g. NDMA SACHET) require
              interactive Cloudflare challenges or browser cookies, Disastraaa documents the barrier rather than generating synthetic alerts.
              Meteorological advisories are fetched directly from IMD NWFC via the open WMO CAP registry.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
