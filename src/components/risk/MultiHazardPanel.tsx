'use client';

/**
 * MultiHazardPanel
 *
 * Displays the unified multi-hazard risk for a selected location.
 * Shows composite score, dominant hazard, per-hazard contribution bars,
 * driver narrative, and data-quality indicator.
 *
 * ⚠️  PROTOTYPE / DEMO DATA — prominently labelled.
 *
 * Responsive:
 *  - Mobile  : bottom sheet (parent positions it)
 *  - Desktop : side panel   (parent positions it)
 */

import { useCallback } from 'react';
import type {
  MultiHazardRiskExplanation,
  HazardContribution,
  DataQuality,
} from '@/lib/risk/multiHazard';
import { DATA_QUALITY_LABEL } from '@/lib/risk/multiHazard';
import { cn, formatNumber } from '@/lib/utils';
import type { Severity } from '@/types';

// ── Severity styling ──────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Severity, {
  ring: string; bg: string; text: string; score: string; border: string;
}> = {
  LOW:      { ring: 'ring-safe/40',       bg: 'bg-safe/10',       text: 'text-safe',       score: 'text-safe',       border: 'border-safe/30'       },
  MODERATE: { ring: 'ring-warning/40',    bg: 'bg-warning/10',    text: 'text-warning',    score: 'text-warning',    border: 'border-warning/30'    },
  HIGH:     { ring: 'ring-orange-400/40', bg: 'bg-orange-400/10', text: 'text-orange-400', score: 'text-orange-400', border: 'border-orange-400/30' },
  CRITICAL: { ring: 'ring-critical/40',   bg: 'bg-critical/10',   text: 'text-critical',   score: 'text-critical',   border: 'border-critical/30'   },
};

const HAZARD_ICON: Record<string, string> = {
  FLOOD:       '🌊',
  CYCLONE:     '🌀',
  STORM_SURGE: '🌊',
  LANDSLIDE:   '⛰️',
  HEATWAVE:    '🌡️',
  LIGHTNING:   '⚡',
  DROUGHT:     '🏜️',
};

const HAZARD_COLOR: Record<string, string> = {
  FLOOD:       'bg-blue-500',
  CYCLONE:     'bg-violet-500',
  STORM_SURGE: 'bg-cyan-500',
  LANDSLIDE:   'bg-amber-600',
  HEATWAVE:    'bg-orange-500',
  LIGHTNING:   'bg-yellow-400',
  DROUGHT:     'bg-red-700',
};

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, severity }: { score: number; severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className={cn(
      'relative w-20 h-20 rounded-full ring-2 flex-shrink-0 flex items-center justify-center',
      s.ring, s.bg,
    )}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor"
          strokeWidth="3" className="text-slate-200 dark:text-white/5" />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          className={s.score} stroke="currentColor" />
      </svg>
      <div className="relative text-center">
        <div className={cn('text-xl font-bold leading-none', s.score)}>{score}</div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

// ── Contribution bar ──────────────────────────────────────────────────────────

function ContributionBar({ c }: { c: HazardContribution }) {
  const icon   = HAZARD_ICON[c.hazard]  ?? '⚠️';
  const color  = HAZARD_COLOR[c.hazard] ?? 'bg-slate-500';
  const pct    = Math.round(c.weight * 100);
  const score  = Math.round(c.score);
  const sStyle = SEVERITY_STYLES[c.severity];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span>{icon}</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">
            {c.hazard.charAt(0) + c.hazard.slice(1).toLowerCase()}
          </span>
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', sStyle.bg, sStyle.text)}>
            {c.severity}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-500">{pct}% weight</span>
          <span className="font-mono text-slate-800 dark:text-slate-300 w-8 text-right font-medium">{score}</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ── Data quality badge ────────────────────────────────────────────────────────

function DataQualityBadge({ quality }: { quality: DataQuality }) {
  const { label, note } = DATA_QUALITY_LABEL[quality];
  const color =
    quality === 'GOOD'    ? 'border-safe/30 bg-safe/5 text-safe' :
    quality === 'PARTIAL' ? 'border-warning/30 bg-warning/5 text-warning' :
    'border-critical/30 bg-critical/5 text-critical';

  return (
    <div className={cn('rounded-lg border px-3 py-2', color)}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[11px] font-semibold">{label}</span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Data Quality</span>
      </div>
      <p className="text-[10px] leading-relaxed opacity-80">{note}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MultiHazardPanelProps {
  locationName: string;
  explanation: MultiHazardRiskExplanation;
  onClose?: () => void;
  className?: string;
}

export function MultiHazardPanel({
  locationName,
  explanation,
  onClose,
  className,
}: MultiHazardPanelProps) {
  const { result, overallSummary, dominantNarrative, hazardSummaries } = explanation;
  const s = SEVERITY_STYLES[result.severity];
  const domIcon = HAZARD_ICON[result.dominantHazard] ?? '⚠️';

  const handleClose = useCallback(() => onClose?.(), [onClose]);

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-xl overflow-hidden',
        'bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/10 shadow-2xl animate-fade-in',
        className,
      )}
      role="dialog"
      aria-label={`Multi-hazard risk details for ${locationName}`}
    >
      {/* ── Header ── */}
      <div className={cn('px-4 pt-4 pb-3', s.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
              ⚡ Multi-Hazard Risk
            </div>
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug truncate">
              {locationName}
            </div>
          </div>
          {onClose && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Close panel"
            >
              ✕
            </button>
          )}
        </div>

        {/* Score + severity */}
        <div className="flex items-center gap-3 mt-3">
          <ScoreRing score={result.score} severity={result.severity} />
          <div className="min-w-0">
            <div className={cn('text-lg font-bold leading-tight', s.text)}>
              {result.severity}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
              {overallSummary}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] text-slate-500">Dominant:</span>
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                {domIcon} {result.dominantHazard.charAt(0) + result.dominantHazard.slice(1).toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 py-3 space-y-3">

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-2 py-2 text-center">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Hazards</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {result.contributions.length}
            </div>
          </div>
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-2 py-2 text-center">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Pop.</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              ~{formatNumber(result.affectedPopulation)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-2 py-2 text-center">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Score</div>
            <div className={cn('text-sm font-semibold mt-0.5', s.score)}>
              {result.score}/100
            </div>
          </div>
        </div>

        {/* Dominant hazard narrative */}
        <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-3 py-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
            Dominant Driver
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{dominantNarrative}</p>
        </div>

        {/* Per-hazard contribution bars */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            Hazard Contributions
          </div>
          <div className="space-y-3">
            {result.contributions.map((c) => (
              <ContributionBar key={c.hazard} c={c} />
            ))}
          </div>
        </div>

        {/* Per-hazard short summaries */}
        {Object.entries(hazardSummaries).length > 0 && (
          <div className="space-y-1.5">
            {Object.entries(hazardSummaries).map(([hazard, summary]) => (
              <div key={hazard} className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-[11px] text-slate-400 leading-relaxed">{summary}</p>
              </div>
            ))}
          </div>
        )}

        {/* Data quality */}
        <DataQualityBadge quality={result.dataQuality} />

        {/* Demo disclaimer */}
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
          <div className="text-[10px] text-warning/80 leading-relaxed">
            ⚠️ <strong>Demo simulation data only.</strong> Composite weights and thresholds
            are calibrated for contingency assessment. Do not use for real emergency decisions.
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-[10px] text-slate-600 text-right">
          Calculated: {new Date(result.calculatedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
          })} · DEMO
        </div>
      </div>
    </div>
  );
}
