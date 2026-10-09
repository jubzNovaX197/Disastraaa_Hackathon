'use client';

/**
 * ShelterRequirementPanel
 *
 * Displays deterministic prototype future shelter requirements for a selected risk zone.
 * Compares projected evacuation demand against current available shelter capacity to determine
 * capacity gap/surplus, additional shelters needed, and operational recommendations.
 *
 * ⚠️  PROTOTYPE / DEMO MODEL — prominently labelled.
 *
 * Responsive:
 *  - Mobile  : bottom-sheet / stacked layout
 *  - Tablet  : adaptive layout
 *  - Desktop : side panel
 *
 * Dark + light mode via design system tokens.
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { ShelterPlanningResult, ShelterSummaryItem } from '@/lib/planning/shelter/types';
import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';

// ── Status styling ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  SHORTAGE: {
    label:  'Shortage',
    icon:   '⚠️',
    bg:     'bg-critical/10',
    text:   'text-critical',
    border: 'border-critical/30',
    badge:  'bg-critical/15 text-critical border border-critical/30',
    barColor: 'bg-critical',
  },
  NEAR_CAPACITY: {
    label:  'Near Capacity',
    icon:   '⚡',
    bg:     'bg-warning/10',
    text:   'text-warning',
    border: 'border-warning/30',
    badge:  'bg-warning/15 text-warning border border-warning/30',
    barColor: 'bg-warning',
  },
  SUFFICIENT: {
    label:  'Sufficient',
    icon:   '✓',
    bg:     'bg-safe/10',
    text:   'text-safe',
    border: 'border-safe/30',
    badge:  'bg-safe/15 text-safe border border-safe/30',
    barColor: 'bg-safe',
  },
} as const;

const SHELTER_STATUS_BADGES: Record<string, string> = {
  OPEN:      'bg-safe/15 text-safe border-safe/30',
  FULL:      'bg-critical/15 text-critical border-critical/30',
  PREPARING: 'bg-info/15 text-info border-info/30',
  CLOSED:    'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

// ── Per-Shelter Item Card ─────────────────────────────────────────────────────

function ShelterItemRow({ shelter }: { shelter: ShelterSummaryItem }) {
  const badgeStyle = SHELTER_STATUS_BADGES[shelter.status] ?? 'bg-slate-500/15 text-slate-400';
  const capPct = Math.min(100, shelter.utilizationPct);
  const barColor = shelter.utilizationPct >= 100 ? 'bg-critical' : shelter.utilizationPct >= 80 ? 'bg-warning' : 'bg-safe';

  return (
    <div className="rounded-lg bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] p-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={shelter.name}>
            ⛺ {shelter.name}
          </div>
          {shelter.location && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={shelter.location}>
              {shelter.location}
            </div>
          )}
        </div>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase flex-shrink-0', badgeStyle)}>
          {shelter.status}
        </span>
      </div>

      {/* Capacity & occupancy */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">
          Occupancy: <strong className="text-slate-800 dark:text-slate-200 font-mono">{shelter.occupancy.toLocaleString('en-IN')}</strong> / {shelter.capacity.toLocaleString('en-IN')}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono">
          {shelter.availableSlots.toLocaleString('en-IN')} slots free
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${capPct}%` }} />
      </div>

      {/* Amenities */}
      <div className="flex items-center gap-1.5 pt-0.5">
        {shelter.hasMedical && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-safe/10 text-safe border border-safe/20">
            🏥 Medical
          </span>
        )}
        {shelter.hasFood && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20">
            🍽️ Food
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export interface ShelterRequirementPanelProps {
  planning:   ShelterPlanningResult;
  onClose?:   () => void;
  className?: string;
}

export function ShelterRequirementPanel({
  planning,
  onClose,
  className,
}: ShelterRequirementPanelProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const cfg = STATUS_CONFIG[planning.status];

  const handleClose = useCallback(() => onClose?.(), [onClose]);

  // Surplus vs Deficit calculation
  const isShortage = planning.capacityGap > 0;
  const surplus = planning.availableCapacity - planning.projectedDemand;

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-xl overflow-hidden',
        'bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/10 shadow-2xl animate-fade-in',
        className,
      )}
      role="dialog"
      aria-label={`Future Shelter Requirement Prediction for ${planning.zoneName}`}
    >
      <DataProvenance model />
      {/* ── Header ── */}
      <div className={cn('px-4 pt-4 pb-3', cfg.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                ⛺ Shelter Planning
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono">
                SIMULATION MODEL
              </span>
            </div>
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug truncate" title={planning.zoneName}>
              {planning.zoneName}
            </div>
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Close shelter panel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5', cfg.badge)}>
            <span>{cfg.icon}</span>
            <span>{cfg.label.toUpperCase()}</span>
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            Utilization: <strong className="font-mono text-slate-900 dark:text-slate-200">{planning.utilizationPct}%</strong>
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3 space-y-3.5 max-h-[75vh] overflow-y-auto">

        {/* ── Core Planning Output Grid (Requirement 4) ── */}
        <div className="grid grid-cols-2 gap-2">
          {/* Projected Evacuation Demand */}
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.06] p-2.5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">
              Projected Demand
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {planning.projectedDemand.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              people needing shelter
            </div>
          </div>

          {/* Available Capacity */}
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.06] p-2.5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">
              Available Capacity
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
              {planning.availableCapacity.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate" title={`Total: ${planning.totalCapacity.toLocaleString('en-IN')}`}>
              of {planning.totalCapacity.toLocaleString('en-IN')} total
            </div>
          </div>

          {/* Capacity Gap / Surplus */}
          <div className={cn(
            'rounded-lg border p-2.5',
            isShortage
              ? 'bg-critical/10 border-critical/20'
              : 'bg-safe/10 border-safe/20',
          )}>
            <div className="text-[10px] uppercase font-medium text-slate-600 dark:text-slate-400">
              {isShortage ? 'Capacity Gap (Deficit)' : 'Capacity Surplus'}
            </div>
            <div className={cn(
              'text-base font-bold font-mono mt-0.5',
              isShortage ? 'text-critical' : 'text-safe',
            )}>
              {isShortage
                ? `-${planning.capacityGap.toLocaleString('en-IN')}`
                : `+${surplus.toLocaleString('en-IN')}`}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isShortage ? 'people unaccommodated' : 'cushion available'}
            </div>
          </div>

          {/* Additional Shelters Needed */}
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.06] p-2.5">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">
              Additional Shelters
            </div>
            <div className={cn(
              'text-base font-bold font-mono mt-0.5',
              planning.additionalSheltersNeeded > 0 ? 'text-critical' : 'text-slate-900 dark:text-slate-100',
            )}>
              {planning.additionalSheltersNeeded > 0
                ? `${planning.additionalSheltersNeeded} needed`
                : '0 needed'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              @ ~{planning.avgShelterCapacity.toLocaleString('en-IN')} cap/unit
            </div>
          </div>
        </div>

        {/* ── Capacity vs Demand Progress Bar ── */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Capacity Utilization</span>
            <span className={cn('font-mono font-bold', cfg.text)}>
              {planning.utilizationPct}% {isShortage ? '(Exceeded)' : ''}
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', cfg.barColor)}
              style={{ width: `${Math.min(planning.utilizationPct, 100)}%` }}
            />
          </div>
        </div>

        {/* ── Existing Shelters in Zone (Requirement 3 & 6) ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Assigned Shelters ({planning.shelterItems.length})
            </span>
            <span className="text-[10px] text-slate-500">
              {planning.occupiedCapacity.toLocaleString('en-IN')} / {planning.totalCapacity.toLocaleString('en-IN')} occupied
            </span>
          </div>
          <div className="space-y-2">
            {planning.shelterItems.map((sh) => (
              <ShelterItemRow key={sh.id} shelter={sh} />
            ))}
          </div>
        </div>

        {/* ── Planning Recommendations (Requirement 8) ── */}
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Planning Recommendations (Simulation)
          </div>
          <div className="rounded-lg bg-white/5 border border-white/[0.06] p-2.5 space-y-1.5">
            {planning.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300 leading-relaxed">
                <span className="text-slate-500 flex-shrink-0 mt-0.5">▸</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Historical Context Note ── */}
        {planning.historicalNote && (
          <div className="rounded-lg bg-info/5 border border-info/20 p-2.5">
            <div className="text-[10px] font-semibold text-info uppercase tracking-wider mb-0.5">
              Historical Context
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {planning.historicalNote}
            </p>
          </div>
        )}

        {/* ── Key Planning Assumptions (Collapsible, Requirement 2) ── */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAssumptions((prev) => !prev)}
            className="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Key Planning Assumptions ({planning.assumptions.length})</span>
            <span className="text-xs font-mono">{showAssumptions ? '▴ Hide' : '▾ Show'}</span>
          </button>
          {showAssumptions && (
            <div className="px-3 pb-2.5 pt-1 space-y-1 border-t border-white/[0.04]">
              {planning.assumptions.map((assump, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-relaxed">
                  <span className="text-slate-600 flex-shrink-0 mt-0.5">•</span>
                  <span>{assump}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Planning Disclaimer ── */}
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
          <div className="text-[10px] text-warning/90 leading-relaxed">
            ⚠️ <strong>Simulation planning model only.</strong> Deterministic demo
            estimates combining current exposure, risk severity, historical impact,
            and shelter contingency records. Not official government disaster management standards.
          </div>
        </div>

        {/* ── Timestamp ── */}
        <div className="text-[10px] text-slate-500 text-right">
          Calculated: {new Date(planning.calculatedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
          })} · DEMO MODEL
        </div>
      </div>
    </div>
  );
}
