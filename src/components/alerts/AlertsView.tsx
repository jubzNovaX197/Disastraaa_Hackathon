'use client';

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import type { DemoAlert } from '@/data/types';
import type { FeedStatusRecord, RealAlert } from '@/lib/alerts/types';
import { cn } from '@/lib/utils';
import type { HazardType, Severity } from '@/types';
import {
  AlertTriangle,
  Filter,
  History,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck
} from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { AlertCard } from './AlertCard';
import { AlertFeedStatusBanner } from './AlertFeedStatusBanner';

interface AlertsViewProps {
  initialAlerts: (RealAlert | DemoAlert)[];
  initialFeedStatuses: FeedStatusRecord[];
  initialEnvironment: 'REAL' | 'DEMO';
}

export function AlertsView({
  initialAlerts,
  initialFeedStatuses,
  initialEnvironment,
}: AlertsViewProps) {
  const { environment: contextEnv, switchEnvironment } = useLiveIntelligence();
  const environment = contextEnv || initialEnvironment;
  const isDemo = environment === 'DEMO';

  const [alerts, setAlerts] = useState<(RealAlert | DemoAlert)[]>(initialAlerts);
  const [feedStatuses, setFeedStatuses] = useState<FeedStatusRecord[]>(initialFeedStatuses);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toISOString());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ACTIVE' | 'ALL' | 'STALE'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'ALL'>('ALL');
  const [selectedHazard, setSelectedHazard] = useState<HazardType | 'ALL'>('ALL');

  const [isPending, startTransition] = useTransition();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Live refresh handler via API
  const handleRefresh = async () => {
    setRefreshError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/alerts?env=${environment}&refresh=true`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setAlerts(data.alerts);
          if (Array.isArray(data.feedStatuses)) {
            setFeedStatuses(data.feedStatuses);
          }
          setLastRefreshed(data.lastRefreshed || new Date().toISOString());
        } else {
          setRefreshError(data.error || 'Failed to refresh feeds.');
        }
      } catch (err) {
        setRefreshError(err instanceof Error ? err.message : 'Network error refreshing feeds.');
      }
    });
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const real = alert as RealAlert;
      const isStale = !alert.isActive || real.freshnessStatus === 'STALE';

      // Tab filter
      if (selectedTab === 'ACTIVE' && isStale) return false;
      if (selectedTab === 'STALE' && !isStale) return false;

      // Severity filter
      if (selectedSeverity !== 'ALL' && alert.severity !== selectedSeverity) return false;

      // Hazard filter
      if (selectedHazard !== 'ALL' && alert.type !== selectedHazard) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = alert.title.toLowerCase().includes(query);
        const matchDesc = alert.message.toLowerCase().includes(query);
        const matchRegion = alert.regionName.toLowerCase().includes(query);
        return matchTitle || matchDesc || matchRegion;
      }

      return true;
    });
  }, [alerts, selectedTab, selectedSeverity, selectedHazard, searchQuery]);

  const activeCount = useMemo(() => {
    return alerts.filter((a) => a.isActive && (a as RealAlert).freshnessStatus !== 'STALE').length;
  }, [alerts]);

  const staleCount = useMemo(() => {
    return alerts.filter((a) => !a.isActive || (a as RealAlert).freshnessStatus === 'STALE').length;
  }, [alerts]);

  const criticalCount = useMemo(() => {
    return alerts.filter((a) => a.severity === 'CRITICAL').length;
  }, [alerts]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Disaster Early Warning Bulletins
            </h1>
            {isDemo ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                SIMULATION SCENARIO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                LIVE OPERATIONAL FEEDS
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isDemo
              ? 'Multi-hazard contingency simulation broadcasting pre-calibrated meteorological advisories.'
              : 'Direct ingestion of OASIS CAP v1.2 emergency warnings issued by India Meteorological Department (IMD) and verified state early warning networks.'}
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-slate-100 dark:bg-surface-elevated border border-slate-200 dark:border-white/10 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-slate-100">{activeCount}</span>
              <span>Active</span>
            </div>
            <span className="text-slate-300 dark:text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-slate-100">{staleCount}</span>
              <span>Archived</span>
            </div>
            {criticalCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-white/20">|</span>
                <span className="font-bold text-rose-500">{criticalCount} Critical</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => switchEnvironment(isDemo ? 'REAL' : 'DEMO')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-colors shadow-sm"
          >
            Switch to {isDemo ? 'Live Operational' : 'Demo Simulation'}
          </button>
        </div>
      </div>

      {/* Feed Status & Diagnostics Banner */}
      <AlertFeedStatusBanner
        feedStatuses={feedStatuses}
        isDemo={isDemo}
        onRefresh={handleRefresh}
        isRefreshing={isPending}
        lastRefreshed={lastRefreshed}
      />

      {refreshError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{refreshError}</span>
        </div>
      )}

      {/* Interactive Controls & Filters */}
      <div className="rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] p-4 shadow-sm space-y-4">
        {/* Search Bar + Tabs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by state, district, or hazard keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-surface-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          {/* Scope Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-surface-elevated border border-slate-200 dark:border-white/10 text-xs self-start md:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedTab('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap',
                selectedTab === 'ALL'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              All Bulletins ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('ACTIVE')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap',
                selectedTab === 'ACTIVE'
                  ? 'bg-white dark:bg-white/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              Active Broadcasts ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('STALE')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap',
                selectedTab === 'STALE'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              Archived ({staleCount})
            </button>
          </div>
        </div>

        {/* Filter Chips: Severity & Hazard */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/5 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>Severity:</span>
          </span>

          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSelectedSeverity(sev)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                selectedSeverity === sev
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10',
              )}
            >
              {sev === 'ALL' ? 'All Severities' : sev}
            </button>
          ))}

          <span className="text-slate-300 dark:text-white/10 mx-1 hidden sm:inline">|</span>

          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1 mr-1 hidden sm:inline">
            Hazard:
          </span>

          {(['ALL', 'FLOOD', 'CYCLONE', 'HEATWAVE', 'LIGHTNING', 'LANDSLIDE'] as const).map((haz) => (
            <button
              key={haz}
              type="button"
              onClick={() => setSelectedHazard(haz)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                selectedHazard === haz
                  ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10',
              )}
            >
              {haz === 'ALL' ? 'All Hazards' : haz}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards Grid or States */}
      {!isDemo && feedStatuses.length > 0 && feedStatuses.every((f) => f.status !== 'CONNECTED') && alerts.length === 0 ? (
        <div className="rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 p-8 sm:p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Authoritative Alert Sources Temporarily Unavailable
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Public warning feeds (e.g. NDMA SACHET) are currently restricted by web application firewall (WAF) challenges or network rate limits. In accordance with zero-fabrication standards, synthetic alerts are not generated in live operational mode.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isPending && 'animate-spin')} />
              <span>Retry Upstream Feeds</span>
            </button>
            <button
              type="button"
              onClick={() => switchEnvironment('DEMO')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors"
            >
              <span>Switch to Demo Simulation Mode</span>
            </button>
          </div>
        </div>
      ) : isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-5/6 bg-slate-200 dark:bg-white/10 rounded" />
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between">
                <div className="h-3 w-28 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] p-8 sm:p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {selectedTab === 'ACTIVE'
                ? 'All Clear — No Active Emergency Broadcasts'
                : 'No Bulletins Match Your Selected Filters'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {selectedTab === 'ACTIVE'
                ? isDemo
                  ? 'No active simulation scenario alerts are running currently.'
                  : 'Regional meteorological feeds and Doppler radar networks report calm baseline conditions across monitored sectors. Official emergency bulletins will broadcast automatically when early warning triggers occur.'
                : 'Try adjusting your search terms or clearing your severity filters to view past archived advisories.'}
            </p>
          </div>

          {selectedTab === 'ACTIVE' && staleCount > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedTab('ALL')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>View {staleCount} Archived Meteorological Bulletins</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {selectedTab === 'STALE' && (
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
              <History className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                <strong>Archived Meteorological Advisories:</strong> The bulletins displayed below have passed their
                official validity periods and are maintained for situational review and historical analysis.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} isDemo={isDemo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
