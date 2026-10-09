'use client';

/**
 * HistoricalAnalysisPanel
 *
 * Displays a summary of historical disaster events for a location or
 * the full dataset.  Accepts a pre-computed HistoricalSummary and
 * an array of HistoricalDisasterEvent — never calls the engine itself.
 *
 * Responsive: single-column on mobile, side-by-side on desktop.
 * Dark + light mode via Tailwind semantic tokens.
 *
 * ⚠️  All data shown is DEMO / SIMULATED — labelled clearly in UI.
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import { sortByImpact, sortByRecent } from '@/lib/historical/engine';
import type { HistoricalDisasterEvent, HistoricalSummary } from '@/lib/historical/types';
import { cn, formatNumber } from '@/lib/utils';
import { useState } from 'react';

// ── Shared helpers ────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'text-safe',
  MODERATE: 'text-warning',
  HIGH:     'text-orange-400',
  CRITICAL: 'text-critical',
};

const SEVERITY_BG: Record<string, string> = {
  LOW:      'bg-safe/10 border-safe/20',
  MODERATE: 'bg-warning/10 border-warning/20',
  HIGH:     'bg-orange-400/10 border-orange-400/20',
  CRITICAL: 'bg-critical/10 border-critical/20',
};

const HAZARD_ICON: Record<string, string> = {
  FLOOD:       '🌊',
  CYCLONE:     '🌀',
  HEATWAVE:    '🌡️',
  LIGHTNING:   '⚡',
  LANDSLIDE:   '⛰️',
  DROUGHT:     '🏜️',
  STORM_SURGE: '🌊',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.07] px-3 py-2.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function InfraRow({ icon, label, value }: { icon: string; label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60 dark:border-white/[0.05] last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
        <span>{icon}</span>
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
        {value.toLocaleString('en-IN')}
      </span>
    </div>
  );
}

function TypeBar({
  type,
  count,
  total,
}: {
  type: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs mb-1.5">
      <span className="w-4 text-center flex-shrink-0">{HAZARD_ICON[type] ?? '⚠️'}</span>
      <span className="w-24 flex-shrink-0 text-slate-400 truncate capitalize">
        {type.toLowerCase().replace('_', ' ')}
      </span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-slate-400 flex-shrink-0">{count}</span>
    </div>
  );
}

// ── Event list item ───────────────────────────────────────────────────────────

function EventItem({ ev }: { ev: HistoricalDisasterEvent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      className="w-full text-left"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-2.5 py-2.5 border-b border-white/[0.05] last:border-0">
        <span className="text-base flex-shrink-0 mt-0.5">
          {HAZARD_ICON[ev.type] ?? '⚠️'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                SEVERITY_BG[ev.severity],
                SEVERITY_COLOR[ev.severity],
              )}
            >
              {ev.severity}
            </span>
            <span className="text-xs font-medium text-slate-200 truncate">{ev.name}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {ev.regionName} · {ev.year}
            {ev.affectedPopulation > 0 && (
              <> · ~{formatNumber(ev.affectedPopulation)} affected</>
            )}
          </div>
          {expanded && (
            <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              {ev.description}
              <div className="mt-1 text-slate-600 italic">{ev.sourceLabel}</div>
            </div>
          )}
        </div>
        <span className="text-slate-600 text-xs flex-shrink-0 mt-1">
          {expanded ? '▲' : '▼'}
        </span>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type SortMode = 'recent' | 'impact';

interface HistoricalAnalysisPanelProps {
  summary: HistoricalSummary;
  events: HistoricalDisasterEvent[];
  /** Optional heading — e.g. a location name */
  title?: string;
  /** Optional risk context note from getLocationHistory */
  riskContextNote?: string;
  onClose?: () => void;
  className?: string;
}

export function HistoricalAnalysisPanel({
  summary,
  events,
  title,
  riskContextNote,
  onClose,
  className,
}: HistoricalAnalysisPanelProps) {
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const sortedEvents =
    sortMode === 'recent' ? sortByRecent(events) : sortByImpact(events);

  return (
    <div
      className={cn(
        'w-full rounded-xl overflow-hidden',
        'bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/10',
        'shadow-2xl animate-fade-in',
        className,
      )}
      role="region"
      aria-label="Historical Disaster Analysis"
    >
      <DataProvenance model />
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/[0.07]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
              🕐 Historical Disaster Analysis
            </div>
            {title && (
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{title}</div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Close panel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Demo banner */}
        <div className="mt-2 text-[10px] text-warning/80 bg-warning/5 border border-warning/20 rounded px-2 py-1">
          ⚠️ <strong>Historical simulation data.</strong> Model records for disaster benchmarking.
        </div>
      </div>

      <div className="px-4 py-3 space-y-4 overflow-y-auto max-h-[60dvh] md:max-h-none">

        {/* Summary stats grid */}
        <div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Events Recorded
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatCard label="Total Events" value={summary.totalEvents} />
            <StatCard
              label="Year Range"
              value={summary.totalEvents > 0
                ? `${summary.yearRange[0]}–${summary.yearRange[1]}`
                : '—'}
            />
            <StatCard
              label="Events / Year"
              value={summary.eventsPerYear > 0
                ? summary.eventsPerYear.toFixed(1)
                : '—'}
              sub="avg (demo data)"
            />
          </div>
        </div>

        {/* By type */}
        {Object.keys(summary.byType).length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Hazard Distribution
            </div>
            {Object.entries(summary.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <TypeBar
                  key={type}
                  type={type}
                  count={count}
                  total={summary.totalEvents}
                />
              ))}
          </div>
        )}

        {/* Highest impact */}
        {summary.mostImpactfulEvent && (
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
              Highest Impact Event
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span>{HAZARD_ICON[summary.mostImpactfulEvent.type] ?? '⚠️'}</span>
              <span className="text-xs font-semibold text-slate-200 truncate">
                {summary.mostImpactfulEvent.name}
              </span>
              <span className={cn('text-[10px] font-bold ml-auto flex-shrink-0', SEVERITY_COLOR[summary.mostImpactfulEvent.severity])}>
                {summary.mostImpactfulEvent.severity}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              ~{formatNumber(summary.mostImpactfulEvent.affectedPopulation)} affected ·{' '}
              {summary.mostImpactfulEvent.year}
            </div>
          </div>
        )}

        {/* Population stats */}
        {summary.totalEvents > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Avg Pop. Affected"
              value={formatNumber(summary.avgAffectedPopulation)}
              sub="per event"
            />
            <StatCard
              label="Max Pop. Affected"
              value={formatNumber(summary.maxAffectedPopulation)}
              sub="single event"
            />
          </div>
        )}

        {/* Infrastructure totals */}
        {summary.totalEvents > 0 && (
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.07] px-3 py-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider pt-2 pb-1.5">
              Cumulative Infrastructure Impact
            </div>
            <InfraRow icon="🏗️" label="Buildings" value={summary.totalBuildingsAffected} />
            <InfraRow icon="🛣️" label="Roads (km)" value={summary.totalRoadsAffectedKm} />
            <InfraRow icon="🏫" label="Schools" value={summary.totalSchoolsAffected} />
            <InfraRow icon="🏥" label="Hospitals" value={summary.totalHospitalsAffected} />
          </div>
        )}

        {/* Pattern note */}
        {summary.patternNote && (
          <div className="rounded-lg bg-accent/5 border border-accent/15 px-3 py-2">
            <div className="text-[10px] text-accent/70 uppercase tracking-wider mb-1">
              Historical Pattern
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {summary.patternNote}
            </p>
          </div>
        )}

        {/* Risk context note */}
        {riskContextNote && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              Risk Context
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{riskContextNote}</p>
          </div>
        )}

        {/* Event list */}
        {events.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Event Records ({events.length})
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setSortMode('recent')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                    sortMode === 'recent'
                      ? 'bg-accent/20 text-accent'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  Recent
                </button>
                <button
                  onClick={() => setSortMode('impact')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                    sortMode === 'impact'
                      ? 'bg-accent/20 text-accent'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  Impact
                </button>
              </div>
            </div>
            <div>
              {sortedEvents.map((ev) => (
                <EventItem key={ev.id} ev={ev} />
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div className="text-center text-sm text-slate-600 py-6">
            No historical events in this demo dataset for the selected area.
          </div>
        )}
      </div>
    </div>
  );
}
