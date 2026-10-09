'use client';

/**
 * ImpactPredictionPanel
 *
 * Displays deterministic prototype impact estimates for a selected risk zone.
 * Shows estimated affected population, buildings, roads, schools, hospitals,
 * shelters — with primary driver, risk level, and exposure factors.
 *
 * ⚠️  PROTOTYPE / DEMO DATA — prominently labelled.
 *
 * Responsive:
 *  - Mobile  : bottom sheet (parent positions it)
 *  - Tablet  : adaptive stacked layout
 *  - Desktop : side panel (parent positions it)
 *
 * Dark + light mode via Tailwind dark: utilities.
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { ImpactMetric, ImpactResult } from '@/lib/impact';
import { cn, formatNumber } from '@/lib/utils';
import type { HazardType, Severity } from '@/types';
import { useCallback } from 'react';

// ── Severity styling ──────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Severity, {
  bg: string; text: string; border: string; badge: string;
}> = {
  LOW:      { bg: 'bg-safe/10',       text: 'text-safe',       border: 'border-safe/30',       badge: 'bg-safe/15 text-safe'           },
  MODERATE: { bg: 'bg-warning/10',    text: 'text-warning',    border: 'border-warning/30',    badge: 'bg-warning/15 text-warning'     },
  HIGH:     { bg: 'bg-orange-400/10', text: 'text-orange-400', border: 'border-orange-400/30', badge: 'bg-orange-400/15 text-orange-400' },
  CRITICAL: { bg: 'bg-critical/10',   text: 'text-critical',   border: 'border-critical/30',   badge: 'bg-critical/15 text-critical'   },
};

// ── Hazard icon / label ───────────────────────────────────────────────────────

const HAZARD_ICON: Record<string, string> = {
  FLOOD:       '🌊',
  CYCLONE:     '🌀',
  STORM_SURGE: '🌊',
  LANDSLIDE:   '⛰️',
  HEATWAVE:    '🌡️',
  LIGHTNING:   '⚡',
  DROUGHT:     '🏜️',
};

function hazardLabel(h: HazardType): string {
  return h.charAt(0) + h.slice(1).toLowerCase().replace('_', ' ');
}

// ── Metric row ────────────────────────────────────────────────────────────────

const METRIC_ICON: Record<string, string> = {
  Population: '👥',
  Buildings:  '🏠',
  Roads:      '🛣️',
  Schools:    '🏫',
  Hospitals:  '🏥',
  Shelters:   '⛺',
};

function MetricRow({ metric }: { metric: ImpactMetric }) {
  const icon = METRIC_ICON[metric.label] ?? '📍';
  const confPct = Math.round(metric.confidence * 100);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm flex-shrink-0">{icon}</span>
        <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{metric.label}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100">
          {metric.unit === 'km'
            ? `${formatNumber(metric.value)} km`
            : formatNumber(metric.value)}
        </span>
        <span
          className="text-[9px] text-slate-500 dark:text-slate-400 w-10 text-right"
          title={metric.note}
        >
          ~{confPct}%
        </span>
      </div>
    </div>
  );
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function OverallConfidence({ metrics }: { metrics: ImpactMetric[] }) {
  const avg = metrics.reduce((s, m) => s + m.confidence, 0) / metrics.length;
  const pct = Math.round(avg * 100);
  const color = pct >= 60 ? 'bg-safe' : pct >= 40 ? 'bg-warning' : 'bg-orange-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>Estimate confidence</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ImpactPredictionPanelProps {
  impact:     ImpactResult;
  onClose?:   () => void;
  className?: string;
}

export function ImpactPredictionPanel({
  impact,
  onClose,
  className,
}: ImpactPredictionPanelProps) {
  const s       = SEVERITY_STYLES[impact.riskLevel];
  const domIcon = HAZARD_ICON[impact.primaryDriver] ?? '⚠️';
  const allMetrics: ImpactMetric[] = [
    impact.population,
    impact.buildings,
    impact.roads,
    impact.schools,
    impact.hospitals,
    impact.shelters,
  ];

  const handleClose = useCallback(() => onClose?.(), [onClose]);

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-xl overflow-hidden',
        'bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/10 shadow-2xl animate-fade-in',
        className,
      )}
      role="dialog"
      aria-label={`Impact prediction for ${impact.zoneName}`}
    >
      <DataProvenance model />
      {/* ── Header ── */}
      <div className={cn('px-4 pt-4 pb-3', s.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
              🎯 Impact Prediction
            </div>
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug truncate">
              {impact.zoneName}
            </div>
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Close impact panel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Driver + risk level */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', s.badge)}>
            {impact.riskLevel}
          </span>
          <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
            {domIcon} {hazardLabel(impact.primaryDriver)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-auto font-mono">
            {impact.riskScore}/100
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3 space-y-3">

        {/* Summary */}
        <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-3 py-2">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{impact.summary}</p>
        </div>

        {/* Metrics grid */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Estimated Impact
          </div>
          <div className="divide-y divide-white/[0.05]">
            {allMetrics.map((m) => (
              <MetricRow key={m.label} metric={m} />
            ))}
          </div>
        </div>

        {/* Confidence */}
        <OverallConfidence metrics={allMetrics} />

        {/* Exposure factors */}
        {impact.exposureFactors.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
              Key Exposure Factors
            </div>
            <div className="space-y-1">
              {impact.exposureFactors.map((f) => (
                <div key={f} className="flex items-start gap-1.5">
                  <span className="text-[10px] text-slate-600 mt-0.5">▸</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulation disclaimer */}
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
          <div className="text-[10px] text-warning/80 leading-relaxed">
            ⚠️ <strong>Simulation estimates only.</strong> Values are
            deterministic calculations scaled from zone exposure data.
            Not calibrated to official standards. Do not use for real emergency decisions.
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-[10px] text-slate-600 text-right">
          Estimated: {new Date(impact.calculatedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
          })} · DEMO
        </div>
      </div>
    </div>
  );
}
