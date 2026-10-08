'use client';

/**
 * CycloneRiskPanel
 *
 * Displays the calculated cyclone risk for a selected cyclone risk zone.
 * Mirrors FloodRiskPanel architecture — receives a pre-computed
 * CycloneRiskExplanation, never calls the engine directly.
 *
 * ⚠️  Shows PROTOTYPE / DEMO DATA indicator prominently.
 */

import { useCallback } from 'react';
import type { CycloneRiskExplanation, CycloneFactorScores } from '@/lib/risk/cyclone';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

// ── Severity config ───────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  LOW:      { ring: 'ring-safe/40',       bg: 'bg-safe/10',       text: 'text-safe',       score: 'text-safe'       },
  MODERATE: { ring: 'ring-warning/40',    bg: 'bg-warning/10',    text: 'text-warning',    score: 'text-warning'    },
  HIGH:     { ring: 'ring-orange-400/40', bg: 'bg-orange-400/10', text: 'text-orange-400', score: 'text-orange-400' },
  CRITICAL: { ring: 'ring-critical/40',   bg: 'bg-critical/10',   text: 'text-critical',   score: 'text-critical'   },
} as const;

const FACTOR_ORDER: (keyof CycloneFactorScores)[] = [
  'windSpeed',
  'stormSurge',
  'trackProximity',
  'rainfall',
  'elevation',
  'historicalFrequency',
  'population',
  'infrastructureVulnerability',
];

const FACTOR_ICONS: Record<keyof CycloneFactorScores, string> = {
  windSpeed:                   '💨',
  rainfall:                    '🌧️',
  stormSurge:                  '🌊',
  trackProximity:              '🎯',
  population:                  '👥',
  elevation:                   '⛰️',
  historicalFrequency:         '📅',
  infrastructureVulnerability: '🏗️',
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface FactorBarProps {
  label: string;
  icon: string;
  score: number;
}

function FactorBar({ label, icon, score }: FactorBarProps) {
  const rounded = Math.round(score);
  const barColor =
    rounded >= 75 ? 'bg-critical' :
    rounded >= 50 ? 'bg-orange-400' :
    rounded >= 25 ? 'bg-warning' :
    'bg-safe';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 flex-shrink-0 text-center">{icon}</span>
      <span className="w-32 flex-shrink-0 text-slate-600 dark:text-slate-400 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${rounded}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-slate-800 dark:text-slate-300 flex-shrink-0 font-medium">{rounded}</span>
    </div>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  severity: keyof typeof SEVERITY_STYLES;
}

function ScoreRing({ score, severity }: ScoreRingProps) {
  const styles = SEVERITY_STYLES[severity];
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className={cn(
      'relative w-20 h-20 rounded-full ring-2 flex-shrink-0',
      'flex items-center justify-center',
      styles.ring, styles.bg,
    )}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-slate-200 dark:text-white/5"
        />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          strokeWidth="3"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className={styles.score}
          stroke="currentColor"
        />
      </svg>
      <div className="relative text-center">
        <div className={cn('text-xl font-bold leading-none', styles.score)}>{score}</div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">/ 100</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CycloneRiskPanelProps {
  zoneName: string;
  explanation: CycloneRiskExplanation;
  onClose?: () => void;
  className?: string;
}

export function CycloneRiskPanel({
  zoneName,
  explanation,
  onClose,
  className,
}: CycloneRiskPanelProps) {
  const { result, summary, driverNarrative, factorLabels } = explanation;
  const styles = SEVERITY_STYLES[result.severity];

  const handleClose = useCallback(() => onClose?.(), [onClose]);

  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-xl overflow-hidden',
        'bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/10 shadow-2xl',
        'animate-fade-in',
        className,
      )}
      role="dialog"
      aria-label={`Cyclone risk details for ${zoneName}`}
    >
      {/* Header */}
      <div className={cn('px-4 pt-4 pb-3', styles.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
              🌀 Cyclone Risk Assessment
            </div>
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug truncate">
              {zoneName}
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
          <div>
            <div className={cn('text-lg font-bold leading-tight', styles.text)}>
              {result.severity}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug max-w-[160px]">
              {summary}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">

        {/* Key stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Affected Pop.</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              ~{formatNumber(result.affectedPopulation)}
            </div>
          </div>
          <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-3 py-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {confidencePct}%
            </div>
          </div>
        </div>

        {/* Key drivers narrative */}
        <div className="rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-transparent px-3 py-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Key Drivers</div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{driverNarrative}</p>
        </div>

        {/* Factor bars */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
            Contributing Factors
          </div>
          <div className="space-y-2">
            {FACTOR_ORDER.map((key) => (
              <FactorBar
                key={key}
                icon={FACTOR_ICONS[key]}
                label={factorLabels[key]}
                score={result.factors[key]}
              />
            ))}
          </div>
        </div>

        {/* Demo disclaimer */}
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
          <div className="text-[10px] text-warning/80 leading-relaxed">
            ⚠️ <strong>Demo simulation data only.</strong> Thresholds and weights are
            calibrated for contingency assessment. Do not use for real emergency decisions.
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-[10px] text-slate-600 text-right">
          Calculated: {new Date(result.calculatedAt).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
          })}
          {result.isLive ? ' · LIVE' : ' · DEMO'}
        </div>
      </div>
    </div>
  );
}
