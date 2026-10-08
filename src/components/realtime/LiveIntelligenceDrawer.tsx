'use client';

/**
 * Live Intelligence Drawer
 *
 * Full slide-over / modal interface for:
 *   1. Operational Feed Status & Telemetry Freshness
 *   2. Real-Time Activity Stream / Historical Event Log
 *   3. Feed Controls: Pause, Resume, Synchronize Now, Step Next Event, Reset Baseline, Simulate Disconnect
 *
 * Professional emergency operations decision support.
 */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Radio,
  RefreshCw,
  Pause,
  Play,
  Zap,
  RotateCcw,
  WifiOff,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Waves,
  Car,
  Home,
  Package,
  FileText,
  Shield,
  Activity,
} from 'lucide-react';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { LiveEvent } from '@/lib/realtime/types';

interface LiveIntelligenceDrawerProps {
  onClose: () => void;
}

type EventFilterCategory = 'ALL' | 'ALERT' | 'ROAD' | 'REPORT' | 'SHELTER' | 'RESOURCE' | 'SENSOR';

export function LiveIntelligenceDrawer({ onClose }: LiveIntelligenceDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const {
    status,
    sourceName,
    secondsSinceSync,
    updateIntervalSeconds,
    isPaused,
    recentEvents,
    commandCenterData,
    pauseFeed,
    resumeFeed,
    refreshNow,
    triggerNextEvent,
    resetToBaseline,
    setUpdateInterval,
    simulateConnectionDrop,
  } = useLiveIntelligence();

  const [activeFilter, setActiveFilter] = useState<EventFilterCategory>('ALL');

  // Filtered event log
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'ALL') return recentEvents;
    return recentEvents.filter((e) => e.category === activeFilter);
  }, [recentEvents, activeFilter]);

  const categoryIcons: Record<LiveEvent['category'], React.ElementType> = {
    ALERT: Radio,
    ROAD: Car,
    REPORT: FileText,
    SHELTER: Home,
    RESOURCE: Package,
    SENSOR: Waves,
  };

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center sm:justify-end p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl max-w-2xl w-full h-[94vh] max-h-[900px] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200"
      >
        {/* ── 1. Drawer Header ── */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Intelligence &amp; Operational Stream
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                  {sourceName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Continuous operational awareness without full page reloads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. Telemetry Status & Controls Card ── */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/60 dark:bg-surface-elevated/40 space-y-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {status === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    'relative inline-flex rounded-full h-2.5 w-2.5',
                    status === 'connected'
                      ? 'bg-emerald-500'
                      : status === 'updating'
                        ? 'bg-blue-500'
                        : status === 'paused'
                          ? 'bg-amber-500'
                          : status === 'reconnecting'
                            ? 'bg-purple-500'
                            : 'bg-rose-500',
                  )}
                />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                {status === 'connected'
                  ? 'Active Live Connection'
                  : status === 'updating'
                    ? 'Synchronizing...'
                    : status === 'paused'
                      ? 'Feed Paused by User'
                      : status === 'reconnecting'
                        ? 'Reconnecting Link...'
                        : 'Feed Offline'}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Synced {secondsSinceSync}s ago · Interval: {updateIntervalSeconds}s
            </div>
          </div>

          {/* User Controls Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Pause / Resume */}
            <button
              type="button"
              onClick={isPaused ? resumeFeed : pauseFeed}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs',
                isPaused
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10',
              )}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Stream</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Feed</span>
                </>
              )}
            </button>

            {/* Sync Now */}
            <button
              type="button"
              onClick={refreshNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-colors shadow-xs"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', status === 'updating' && 'animate-spin text-blue-500')} />
              <span>Sync Now</span>
            </button>

            {/* Step Next Event */}
            <button
              type="button"
              onClick={triggerNextEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 border border-purple-400 shadow-sm transition-all"
              title="Immediately advance to the next operational simulation event"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Trigger Next Event</span>
            </button>

            {/* Reset to Baseline */}
            <button
              type="button"
              onClick={resetToBaseline}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              title="Reset data streams back to baseline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            {/* Simulate Disconnect */}
            <button
              type="button"
              onClick={simulateConnectionDrop}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors ml-auto"
              title="Test reconnecting and offline recovery state"
            >
              <WifiOff className="w-3 h-3" />
              <span>Test Reconnect</span>
            </button>
          </div>

          {/* Update Interval Selector */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/[0.05] text-[11px] text-slate-500 dark:text-slate-400">
            <span>Automatic Telemetry Cadence:</span>
            <div className="flex items-center gap-1.5">
              {[15, 25, 60].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setUpdateInterval(sec)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all',
                    updateIntervalSeconds === sec
                      ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                      : 'bg-slate-200/70 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  )}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3. Operational Snapshot Row ── */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-white dark:bg-surface-card border-b border-slate-200 dark:border-white/[0.06] text-center flex-shrink-0">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Active Alerts</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {commandCenterData.kpis.response.activeAlertsCount}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Obstructed Roads</span>
            <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">
              {commandCenterData.roadOperations.blockedCount + commandCenterData.roadOperations.closedCount}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Ground Reports</span>
            <span className="text-base font-extrabold text-cyan-600 dark:text-cyan-400">
              {commandCenterData.citizenIntelligence.totalReports}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Shelter Gap</span>
            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">
              {formatNumber(commandCenterData.shelterOperations.totalCapacityGap)}
            </span>
          </div>
        </div>

        {/* ── 4. Category Filter Tabs ── */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-white/[0.06] flex items-center gap-1.5 overflow-x-auto flex-shrink-0 bg-slate-50/40 dark:bg-surface-base/30">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mr-1" />
          {[
            { id: 'ALL', label: `All Events (${recentEvents.length})` },
            { id: 'ALERT', label: 'Alerts' },
            { id: 'ROAD', label: 'Roads' },
            { id: 'REPORT', label: 'Reports' },
            { id: 'SHELTER', label: 'Shelters' },
            { id: 'RESOURCE', label: 'Resources' },
            { id: 'SENSOR', label: 'Hydromet' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as EventFilterCategory)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                activeFilter === tab.id
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 5. Activity Event Stream ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p>No operational events recorded for this category yet.</p>
              <button
                type="button"
                onClick={triggerNextEvent}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
              >
                Trigger an event now →
              </button>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const Icon = categoryIcons[event.category] || Activity;
              const severityBadge = {
                CRITICAL: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                HIGH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                MODERATE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
              }[event.severity];

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] space-y-1.5 shadow-xs hover:border-slate-300 dark:hover:border-white/15 transition-all"
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <Icon className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span className="truncate">{event.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border', severityBadge)}>
                        {event.severity}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {event.timeFormatted}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {event.summary}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/[0.04] text-[10px] text-slate-400">
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      📍 {event.locationName} {event.district ? `(${event.district})` : ''}
                    </span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 uppercase font-semibold">
                      {event.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── 6. Drawer Footer ── */}
        <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          <span className="text-[11px]">
            Real-time decision support feed · Changes update map &amp; operations
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-white/[0.08] hover:bg-slate-300 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
