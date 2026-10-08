'use client';

/**
 * TravelRiskCard — Combined Route & Destination Risk Intelligence
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY ROUTING
 *
 * Shows unified Overall Travel Risk calculated from Task 13 Route Risk
 * and Destination Safety Risk, along with factual route option comparisons.
 */

import { AlertTriangle, Compass, Info, Navigation, Shield, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TravelRiskResult, DestinationSafetyStatus } from '@/lib/destination/types';
import type { RouteResult } from '@/lib/routing/types';

interface TravelRiskCardProps {
  travelRisk: TravelRiskResult;
  activeMode?: RouteResult['mode'];
  onSelectMode?: (mode: RouteResult['mode']) => void;
  className?: string;
}

const STATUS_BADGE: Record<
  DestinationSafetyStatus,
  { label: string; text: string; bg: string; border: string }
> = {
  SAFE: {
    label: 'SAFE TRAVEL',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    border: 'border-emerald-500/35 dark:border-emerald-500/40',
  },
  CAUTION: {
    label: 'CAUTION',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-500/35 dark:border-amber-500/40',
  },
  HIGH_RISK: {
    label: 'HIGH RISK',
    text: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    border: 'border-orange-500/35 dark:border-orange-500/40',
  },
  CRITICAL: {
    label: 'CRITICAL HAZARD',
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    border: 'border-rose-500/35 dark:border-rose-500/40',
  },
};

export function TravelRiskCard({
  travelRisk,
  activeMode = 'SAFEST',
  onSelectMode,
  className,
}: TravelRiskCardProps) {
  const badge = STATUS_BADGE[travelRisk.overallTravelStatus];

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card overflow-hidden shadow-xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5',
        className
      )}
    >
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-surface-elevated/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Combined Transit &amp; Destination Intelligence
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25 uppercase tracking-wider">
                Transit Model
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Overall Travel Risk Assessment
            </h3>
          </div>
        </div>

        <div
          className={cn(
            'px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5',
            badge.bg,
            badge.border,
            badge.text
          )}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse-slow" />
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Risk Triplet: Route Risk + Destination Risk -> Overall Travel Risk */}
        <div className="grid grid-cols-1 gap-2.5 items-stretch">
          {/* Route Risk */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-surface-elevated/70 shadow-sm backdrop-blur-md">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Route Corridor Risk</span>
              <span className="text-[10px] font-mono text-accent">55% Weight</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {travelRisk.hasRoute ? travelRisk.routeRiskScore : '—'}
              </span>
              <span className="text-xs text-slate-400 font-semibold">/100</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
              {travelRisk.hasRoute
                ? `Transit severity: ${travelRisk.routeRiskSeverity}`
                : 'Select origin & calculate route'}
            </div>
          </div>

          {/* Destination Risk */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-surface-elevated/70 shadow-sm backdrop-blur-md">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>Destination Risk</span>
              <span className="text-[10px] font-mono text-accent">45% Weight</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {travelRisk.destinationRiskScore}
              </span>
              <span className="text-xs text-slate-400 font-semibold">/100</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
              Safety Score: <strong className="text-slate-900 dark:text-slate-100">{travelRisk.destinationSafetyScore}/100</strong> ({travelRisk.destinationRiskSeverity})
            </div>
          </div>

          {/* Overall Combined Risk */}
          <div
            className={cn(
              'p-4 rounded-xl border flex flex-col justify-between shadow-md backdrop-blur-md ring-1 ring-white/10 dark:ring-white/20',
              badge.bg,
              badge.border
            )}
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Overall Travel Risk</span>
                <span className="text-[10px] font-mono font-bold">Composite</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={cn('text-3xl font-black', badge.text)}>
                  {travelRisk.overallTravelRiskScore}
                </span>
                <span className="text-xs opacity-75 font-semibold">/100</span>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-1">
              Status: <strong className={badge.text}>{travelRisk.overallTravelStatus}</strong>
            </div>
          </div>
        </div>

        {/* Explainable Formula Notice */}
        <div className="p-3.5 rounded-xl bg-slate-100/90 dark:bg-surface-elevated/70 border border-slate-200 dark:border-white/10 text-xs space-y-1 backdrop-blur-md">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Info className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span>Calculation Transparency</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {travelRisk.formulaExplanation}
          </p>
          <p className="text-[11px] text-slate-700 dark:text-slate-200 font-semibold pt-0.5">
            Advisory: {travelRisk.recommendation}
          </p>
        </div>

        {/* Factual Route Comparison Table */}
        {travelRisk.routeComparison && (
          <div className="space-y-2.5 pt-2">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Route Options Comparison (Factual Metrics)
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-surface-elevated border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Route Option</th>
                    <th className="py-2.5 px-3">Distance</th>
                    <th className="py-2.5 px-3">Travel Time</th>
                    <th className="py-2.5 px-3">Route Risk</th>
                    <th className="py-2.5 px-3">Dest. Risk</th>
                    <th className="py-2.5 px-3">Overall Risk</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {(['SAFEST', 'SHORTEST', 'ALTERNATIVE'] as const).map((mode) => {
                    const key = mode.toLowerCase() as keyof typeof travelRisk.routeComparison;
                    const opt = travelRisk.routeComparison?.[key];
                    if (!opt) return null;

                    const isSelected = activeMode === mode;
                    const optBadge = STATUS_BADGE[opt.status];

                    return (
                      <tr
                        key={mode}
                        onClick={() => onSelectMode?.(mode)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-accent/15 dark:bg-accent/25 font-semibold text-slate-900 dark:text-slate-100'
                            : 'hover:bg-slate-50 dark:hover:bg-surface-elevated/60 text-slate-800 dark:text-slate-200'
                        )}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-1.5 font-bold">
                          <span>{mode === 'SAFEST' ? '🛡️' : mode === 'SHORTEST' ? '⚡' : '🔄'}</span>
                          <span>{mode}</span>
                        </td>
                        <td className="py-2.5 px-3">{opt.distanceKm} km</td>
                        <td className="py-2.5 px-3">{opt.totalMinutes} min</td>
                        <td className="py-2.5 px-3 font-mono">{opt.routeRiskScore}/100</td>
                        <td className="py-2.5 px-3 font-mono">{opt.destRiskScore}/100</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-accent">
                          {opt.overallRiskScore}/100
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded border',
                              optBadge.bg,
                              optBadge.border,
                              optBadge.text
                            )}
                          >
                            {opt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
