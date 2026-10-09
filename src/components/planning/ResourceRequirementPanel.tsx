'use client';

/**
 * ResourceRequirementPanel
 *
 * Displays deterministic prototype resource requirement predictions for a selected disaster zone.
 * Evaluates required vs available stockpiles across 8 essential categories:
 *  - Emergency Shelter Capacity
 *  - Food / Meal Support
 *  - Drinking Water
 *  - Medical Support
 *  - Rescue Teams (NDRF/SDRF)
 *  - Emergency Vehicles & Transport
 *  - Boats / Water Rescue Units
 *  - Emergency Relief Kits
 *
 * ⚠️  PROTOTYPE / DEMO MODEL — prominently labelled decision support.
 *
 * Responsive:
 *  - Mobile  : bottom-sheet / stacked layout
 *  - Tablet  : adaptive layout
 *  - Desktop : side panel
 *
 * Dark + light mode via design system tokens.
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import type {
  ResourcePlanningResult,
  ResourceRequirementItem,
  ResourceStatus,
} from '@/lib/planning/resources/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// ── Status Configurations ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ResourceStatus,
  {
    label: string;
    icon: string;
    bg: string;
    text: string;
    border: string;
    badge: string;
    barColor: string;
  }
> = {
  CRITICAL_SHORTAGE: {
    label:    'Critical Shortage',
    icon:     '🚨',
    bg:       'bg-critical/10',
    text:     'text-critical',
    border:   'border-critical/30',
    badge:    'bg-critical/15 text-critical border border-critical/30',
    barColor: 'bg-critical',
  },
  SHORTAGE: {
    label:    'Shortage',
    icon:     '⚠️',
    bg:       'bg-warning/10',
    text:     'text-warning',
    border:   'border-warning/30',
    badge:    'bg-warning/15 text-warning border border-warning/30',
    barColor: 'bg-warning',
  },
  NEAR_CAPACITY: {
    label:    'Near Capacity',
    icon:     '⚡',
    bg:       'bg-amber-500/10',
    text:     'text-amber-500 dark:text-amber-400',
    border:   'border-amber-500/30',
    badge:    'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30',
    barColor: 'bg-amber-500',
  },
  SUFFICIENT: {
    label:    'Sufficient',
    icon:     '✓',
    bg:       'bg-safe/10',
    text:     'text-safe',
    border:   'border-safe/30',
    badge:    'bg-safe/15 text-safe border border-safe/30',
    barColor: 'bg-safe',
  },
};

const SEVERITY_BADGES = {
  LOW:      'bg-safe/15 text-safe border-safe/30',
  MODERATE: 'bg-warning/15 text-warning border-warning/30',
  HIGH:     'bg-orange-500/15 text-orange-500 border-orange-500/30',
  CRITICAL: 'bg-critical/15 text-critical border-critical/30',
} as const;

const PRIORITY_BADGES = {
  CRITICAL: 'bg-critical/15 text-critical border-critical/30',
  HIGH:     'bg-orange-500/15 text-orange-500 border-orange-500/30',
  MEDIUM:   'bg-info/15 text-info border-info/30',
  INFO:     'bg-slate-500/15 text-slate-400 border-slate-500/30',
} as const;

// ── Per-Resource Item Card ───────────────────────────────────────────────────

function ResourceItemCard({ item }: { item: ResourceRequirementItem }) {
  const [showFormula, setShowFormula] = useState(false);
  const cfg = STATUS_CONFIG[item.status];
  const isDeficit = item.gap > 0;
  const clampedCoverage = Math.min(100, item.coveragePct);

  return (
    <div className="rounded-lg bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] p-2.5 space-y-2 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
            <span>{item.icon}</span>
            <span className="truncate" title={item.name}>{item.name}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            Unit: {item.unit}
          </div>
        </div>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase flex-shrink-0 flex items-center gap-1', cfg.badge)}>
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 text-center bg-white/40 dark:bg-white/[0.02] rounded p-1.5 border border-slate-200/40 dark:border-white/[0.03]">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Required</div>
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {item.required.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Available</div>
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {item.available.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isDeficit ? 'Deficit' : 'Surplus'}
          </div>
          <div className={cn(
            'text-xs font-bold font-mono mt-0.5',
            isDeficit ? 'text-critical' : 'text-safe',
          )}>
            {isDeficit ? `-${item.gap.toLocaleString('en-IN')}` : `+${item.surplus.toLocaleString('en-IN')}`}
          </div>
        </div>
      </div>

      {/* Progress Bar & Coverage */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>Coverage</span>
          <span className={cn('font-mono font-bold', cfg.text)}>
            {item.coveragePct}% {item.coveragePct < 100 ? `(Shortfall: ${item.shortagePct}%)` : ''}
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', cfg.barColor)}
            style={{ width: `${clampedCoverage}%` }}
          />
        </div>
      </div>

      {/* Transparent Derivation Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowFormula((v) => !v)}
          className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          <span>{showFormula ? '▾ Hide derivation' : '▸ Calculation basis'}</span>
        </button>
        {showFormula && (
          <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-white/5 rounded p-1.5 leading-relaxed font-mono">
            {item.calculationBasis}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ResourceRequirementPanelProps {
  planning:   ResourcePlanningResult;
  onClose?:   () => void;
  className?: string;
}

type FilterTab = 'ALL' | 'CRITICAL' | 'SHORTAGE' | 'SUFFICIENT';

export function ResourceRequirementPanel({
  planning,
  onClose,
  className,
}: ResourceRequirementPanelProps) {
  const [filterTab, setFilterTab]             = useState<FilterTab>('ALL');
  const [showAssumptions, setShowAssumptions] = useState<boolean>(false);

  const overallCfg = STATUS_CONFIG[planning.overallStatus];
  const severityBadge = SEVERITY_BADGES[planning.severity] ?? SEVERITY_BADGES.MODERATE;

  // Filtered resources
  const filteredResources = planning.resources.filter((item) => {
    if (filterTab === 'CRITICAL') return item.status === 'CRITICAL_SHORTAGE';
    if (filterTab === 'SHORTAGE') return item.status === 'SHORTAGE';
    if (filterTab === 'SUFFICIENT') return item.status === 'SUFFICIENT' || item.status === 'NEAR_CAPACITY';
    return true;
  });

  return (
    <div
      className={cn(
        'w-full md:w-96 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col font-sans transition-colors',
        className,
      )}
      role="region"
      aria-label={`Resource Requirement Planning for ${planning.zoneName}`}
    >
      <DataProvenance model />
      {/* ── Header ── */}
      <div className={cn('px-4 pt-3.5 pb-3 transition-colors', overallCfg.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                📦 Resource Planning
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono">
                SIMULATION MODEL
              </span>
              <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase', severityBadge)}>
                {planning.severity}
              </span>
            </div>
            <div
              className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug truncate"
              title={planning.zoneName}
            >
              {planning.zoneName}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              aria-label="Close resource panel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Hazard & Status Strip */}
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span>Dominant:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              <span>{planning.dominantHazard === 'FLOOD' ? '🌊' : planning.dominantHazard === 'CYCLONE' ? '🌀' : '⚠️'}</span>
              <span>{planning.dominantHazard}</span>
            </span>
          </div>
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border', overallCfg.badge)}>
            <span>{overallCfg.icon}</span>
            <span>{overallCfg.label.toUpperCase()}</span>
          </span>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="px-4 py-3 space-y-3.5 max-h-[72vh] overflow-y-auto">

        {/* ── Population Overview Grid ── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.06] p-2">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">
              Affected Population
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {planning.affectedPopulation.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              estimated in zone
            </div>
          </div>

          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.06] p-2">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">
              Requiring Assistance
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {planning.estimatedAssistancePopulation.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              active relief demand
            </div>
          </div>
        </div>

        {/* ── Priority Summary Tabs / Filter ── */}
        <div>
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Resource Situation</span>
            <span className="text-[10px] font-mono text-slate-400">
              {planning.prioritySummary.criticalShortages.length} critical · {planning.prioritySummary.majorShortages.length} major
            </span>
          </div>

          <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 text-[10px] font-semibold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={cn(
                'flex-1 py-1 rounded transition-colors text-center',
                filterTab === 'ALL'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              All ({planning.resources.length})
            </button>
            <button
              onClick={() => setFilterTab('CRITICAL')}
              className={cn(
                'flex-1 py-1 rounded transition-colors text-center',
                filterTab === 'CRITICAL'
                  ? 'bg-critical/20 text-critical font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-critical',
              )}
            >
              Critical ({planning.prioritySummary.criticalShortages.length})
            </button>
            <button
              onClick={() => setFilterTab('SHORTAGE')}
              className={cn(
                'flex-1 py-1 rounded transition-colors text-center',
                filterTab === 'SHORTAGE'
                  ? 'bg-warning/20 text-warning font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-warning',
              )}
            >
              Shortage ({planning.prioritySummary.majorShortages.length})
            </button>
            <button
              onClick={() => setFilterTab('SUFFICIENT')}
              className={cn(
                'flex-1 py-1 rounded transition-colors text-center',
                filterTab === 'SUFFICIENT'
                  ? 'bg-safe/20 text-safe font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-safe',
              )}
            >
              OK ({planning.prioritySummary.sufficient.length + planning.prioritySummary.nearCapacity.length})
            </button>
          </div>
        </div>

        {/* ── Per-Resource List ── */}
        <div className="space-y-2">
          {filteredResources.length > 0 ? (
            filteredResources.map((item) => (
              <ResourceItemCard key={item.id} item={item} />
            ))
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 italic rounded bg-slate-50 dark:bg-white/[0.02]">
              No resources in this filter category.
            </div>
          )}
        </div>

        {/* ── Planning Recommendations (Requirement 7) ── */}
        <div>
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Simulation Planning Recommendations</span>
            <span className="text-[9px] px-1 rounded bg-info/10 text-info">RULES-BASED</span>
          </div>

          <div className="space-y-2">
            {planning.recommendations.map((rec) => {
              const pBadge = PRIORITY_BADGES[rec.priority] ?? PRIORITY_BADGES.INFO;
              return (
                <div
                  key={rec.id}
                  className="rounded-lg bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {rec.title}
                    </span>
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase flex-shrink-0', pBadge)}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">
                    👉 {rec.action}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {rec.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Historical Context Note ── */}
        {planning.historicalNote && (
          <div className="rounded-lg bg-info/10 border border-info/20 p-2.5">
            <div className="text-[10px] font-semibold text-info uppercase tracking-wider mb-0.5">
              Historical Context (Demo Intelligence)
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {planning.historicalNote}
            </p>
          </div>
        )}

        {/* ── Planning Assumptions (Collapsible) ── */}
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAssumptions((prev) => !prev)}
            className="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <span>Key Planning Assumptions ({planning.assumptions.length})</span>
            <span className="text-xs font-mono">{showAssumptions ? '▴ Hide' : '▾ Show'}</span>
          </button>
          {showAssumptions && (
            <div className="px-3 pb-2.5 pt-1 space-y-1 border-t border-slate-200 dark:border-white/[0.04]">
              {planning.assumptions.map((assump, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  <span className="text-slate-400 dark:text-slate-600 flex-shrink-0 mt-0.5">•</span>
                  <span>{assump}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Simulation Disclaimer (Requirement 11) ── */}
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5">
          <div className="text-[10px] text-warning/90 leading-relaxed">
            ⚠️ <strong>Decision-Support Simulation:</strong> All estimates are deterministic calculations combining exposure, risk severity, hazard factors, and demo district inventories. They do not constitute official government relief standards or emergency instructions.
          </div>
        </div>

        {/* ── Timestamp ── */}
        <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right font-mono">
          Computed: {new Date(planning.calculatedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })} · SIMULATION ENGINE
        </div>
      </div>
    </div>
  );
}
