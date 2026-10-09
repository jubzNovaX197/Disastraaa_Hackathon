'use client';

/**
 * DestinationSafetyPanel — Comprehensive Destination Safety Intelligence
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY FORECAST
 *
 * Provides a high-fidelity command center panel showing:
 * - Destination Safety Score (0–100, higher = safer)
 * - Status (SAFE, CAUTION, HIGH_RISK, CRITICAL)
 * - 5 Explainable Factors (Weather/Hazards, Alerts, Road Access, Shelters, History)
 * - "Why This Score?" concise factual bullet explanations
 * - Active Emergency Warnings affecting the destination
 * - Time-Aware Scenario Delta ("Current: 74 → Selected: 48 (-26)")
 * - Prototype Scenario Timeline
 * - Supporting environmental and infrastructure metrics
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import { DEMO_SCENARIOS } from '@/lib/destination/scenarios';
import type {
  DestinationSafetyResult,
  DestinationSafetyStatus,
  ScenarioSlotKey,
  TimeRiskScenario,
} from '@/lib/destination/types';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Home,
  Info,
  MapPin,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Waves,
  Wind,
  XCircle
} from 'lucide-react';
import { useState } from 'react';
import { DestinationTimeline } from './DestinationTimeline';
import { TimeScenarioPicker } from './TimeScenarioPicker';

interface DestinationSafetyPanelProps {
  safetyResult: DestinationSafetyResult | null;
  onSelectScenarioSlot?: (slotKey: ScenarioSlotKey) => void;
  onCustomDateTimeChange?: (date: string, time: string) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  DestinationSafetyStatus,
  {
    label: string;
    text: string;
    bg: string;
    border: string;
    badge: string;
    description: string;
    icon: typeof ShieldCheck;
  }
> = {
  SAFE: {
    label: 'SAFE',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    border: 'border-emerald-500/40 dark:border-emerald-400/50',
    badge: 'bg-emerald-500 text-white font-bold',
    description: 'No active critical alerts; standard transit and shelter infrastructure operating normally.',
    icon: ShieldCheck,
  },
  CAUTION: {
    label: 'CAUTION',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-500/40 dark:border-amber-400/50',
    badge: 'bg-amber-500 text-slate-950 font-bold',
    description: 'Elevated weather conditions, localized waterlogging, or advisory warning active.',
    icon: AlertTriangle,
  },
  HIGH_RISK: {
    label: 'HIGH RISK',
    text: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    border: 'border-orange-500/40 dark:border-orange-400/50',
    badge: 'bg-orange-500 text-white font-bold',
    description: 'Hazardous weather, high warning active, or arterial road transit delays expected.',
    icon: ShieldAlert,
  },
  CRITICAL: {
    label: 'CRITICAL HAZARD',
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    border: 'border-rose-500/40 dark:border-rose-400/50',
    badge: 'bg-rose-500 text-white font-bold',
    description: 'Severe cyclone landfall, flash flooding, road closures, or mandatory evacuation active.',
    icon: XCircle,
  },
};

export function DestinationSafetyPanel({
  safetyResult,
  onSelectScenarioSlot,
  onCustomDateTimeChange,
  className,
}: DestinationSafetyPanelProps) {
  const [showFactorWeights, setShowFactorWeights] = useState(false);

  // Edge state: No destination selected
  if (!safetyResult) {
    return (
      <div
        className={cn(
          'p-8 text-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card space-y-3',
          className
        )}
      >
      <DataProvenance model />
        <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          No Destination Selected
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Choose a destination location from the map or route selector to inspect localized safety scores, active warnings, and time-aware scenario projections.
        </p>
      </div>
    );
  }

  const status = STATUS_CONFIG[safetyResult.status];
  const StatusIcon = status.icon;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-xl backdrop-blur-xl overflow-hidden space-y-6 ring-1 ring-black/5 dark:ring-white/5',
        className
      )}
    >
      <DataProvenance model />
      {/* ── Top Header & Professional Notice ─────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-surface-elevated/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest mb-0.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Destination Safety Intelligence</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-slate-500 dark:text-slate-400">Operational Assessment Model</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{safetyResult.destinationName}</span>
            <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
              [{safetyResult.coordinates[0].toFixed(4)}, {safetyResult.coordinates[1].toFixed(4)}]
            </span>
          </h2>
        </div>

        {/* Operational Advisory Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Decision Support · Sector Status Assessment</span>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* ── Section 2: Time Scenario Horizon Picker ──────────────── */}
        {onSelectScenarioSlot && (
          <TimeScenarioPicker
            activeScenario={safetyResult.scenario}
            onSelectScenarioSlot={onSelectScenarioSlot}
            onCustomDateTimeChange={onCustomDateTimeChange}
          />
        )}

        {/* ── Section 1 & 5: Main Score Hero Display ───────────────── */}
        <div
          className={cn(
            'p-4 sm:p-5 rounded-2xl border-2 flex flex-col gap-4 transition-all backdrop-blur-xl shadow-lg ring-1 ring-white/10 dark:ring-white/15',
            status.bg,
            status.border
          )}
        >
          {/* Big Score */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-16 h-16 sm:w-18 sm:h-18 rounded-2xl flex flex-col items-center justify-center border-2 shadow-md flex-shrink-0',
                'bg-white dark:bg-surface-elevated border-slate-200 dark:border-white/15'
              )}
            >
              <span className={cn('text-2xl sm:text-3xl font-black tracking-tight leading-none', status.text)}>
                {safetyResult.safetyScore}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                / 100
              </span>
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', status.bg, status.border, status.text)}>
                  {status.label}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Higher score = Safer
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <StatusIcon className={cn('w-4 h-4 flex-shrink-0', status.text)} />
                <span className="truncate">Safety Index: {safetyResult.safetyScore}/100</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                {status.description}
              </p>
            </div>
          </div>

          {/* Time Delta Comparison if user selected future/modified time */}
          {safetyResult.deltaFromCurrent && (
            <div className="w-full p-3.5 rounded-xl bg-white/95 dark:bg-surface-elevated/90 border border-slate-200 dark:border-white/10 shadow-md backdrop-blur-md">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent" />
                <span>Time-Aware Risk Shift</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Now: <strong className="text-slate-900 dark:text-slate-100">{safetyResult.deltaFromCurrent.baselineScore}</strong>
                </span>
                <span className="text-slate-400">→</span>
                <span className={cn('text-base font-black', status.text)}>
                  {safetyResult.safetyScore}
                </span>
                <span
                  className={cn(
                    'text-xs font-bold flex items-center',
                    safetyResult.deltaFromCurrent.scoreDelta >= 0
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                  )}
                >
                  {safetyResult.deltaFromCurrent.scoreDelta > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {safetyResult.deltaFromCurrent.scoreDelta > 0 ? '+' : ''}
                  {safetyResult.deltaFromCurrent.scoreDelta}
                </span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                {safetyResult.deltaFromCurrent.summary}
              </p>
            </div>
          )}
        </div>

        {/* ── Section 5: Main Explainable Factors ───────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              5 Weighted Safety Factors (Deterministic Model)
            </h3>
            <button
              type="button"
              onClick={() => setShowFactorWeights(!showFactorWeights)}
              className="text-[10px] text-accent hover:underline flex items-center gap-1 font-semibold"
            >
              <Info className="w-3 h-3" />
              <span>{showFactorWeights ? 'Hide Weights' : 'Show Weights'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {safetyResult.factors.map((factor) => {
              const fStatus = STATUS_CONFIG[scoreToStatus(factor.score)];

              return (
                <div
                  key={factor.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated/70 backdrop-blur-md shadow-sm hover:border-accent/50 transition-all flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate pr-2">
                        {factor.name}
                      </span>
                      {showFactorWeights && (
                        <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                          {Math.round(factor.weight * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className={cn('text-lg font-black', fStatus.text)}>
                        {factor.score}
                      </span>
                      <span className="text-[10px] text-slate-400">/100</span>
                      <span
                        className={cn(
                          'ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border',
                          fStatus.bg,
                          fStatus.border,
                          fStatus.text
                        )}
                      >
                        {factor.statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-surface-overlay rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', fStatus.text.replace('text-', 'bg-'))}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-snug">
                      {factor.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 5: Why This Score? (3–5 concise bullets) ──────── */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-surface-elevated/70 backdrop-blur-md space-y-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <FileText className="w-3.5 h-3.5 text-accent" />
            <span>Why This Score? (Explainable Reasoning)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {safetyResult.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Section 6: Active Warnings at Destination ─────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-rose-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Active Emergency Warnings in Sector ({safetyResult.warnings.length})
              </h3>
            </div>
            {safetyResult.warnings.length === 0 && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ✓ No Active Sector Warnings
              </span>
            )}
          </div>

          {safetyResult.warnings.length === 0 ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>
                No active storm, flood, or cyclone alerts currently intersect this destination buffer zone.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {safetyResult.warnings.map((warn) => (
                <div
                  key={warn.id}
                  className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 dark:bg-rose-500/20 backdrop-blur-md shadow-md space-y-1.5 text-xs ring-1 ring-rose-500/20"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white font-mono uppercase">
                        {warn.severity}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {warn.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {warn.affectedArea} • {warn.validPeriod}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
                    {warn.message}
                  </p>
                  <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                    <span>Action: {warn.recommendedAction}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 8: Safety Timeline Visualization ─────────────── */}
        <DestinationTimeline
          timeline={safetyResult.timeline}
          activeTime={safetyResult.selectedTime}
          onSelectTime={(time) => {
            if (onSelectScenarioSlot) {
              // Find matching slot or switch
              const slot = (Object.values(DEMO_SCENARIOS) as TimeRiskScenario[]).find(
                (s) => s.targetTime === time
              );
              if (slot) onSelectScenarioSlot(slot.slotKey);
            }
          }}
        />

        {/* ── Supporting Data Metrics Row ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Rainfall */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated/70 backdrop-blur-md shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Waves className="w-3.5 h-3.5 text-blue-500" />
              <span>Rainfall Rate</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {safetyResult.supportingData.rainfallMmH} mm/h
            </div>
            <span className="text-[10px] text-slate-400">Scenario Intensity</span>
          </div>

          {/* Wind */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated/70 backdrop-blur-md shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-cyan-500" />
              <span>Sustained Wind</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {safetyResult.supportingData.windKmh} km/h
            </div>
            <span className="text-[10px] text-slate-400">Coastal Gale Index</span>
          </div>

          {/* River Stage */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated/70 backdrop-blur-md shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>River Stage</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              +{safetyResult.supportingData.riverLevelMeters}m
            </div>
            <span className="text-[10px] text-slate-400 truncate block">
              {safetyResult.supportingData.riverStageStatus}
            </span>
          </div>

          {/* Nearest Shelter */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated/70 backdrop-blur-md shadow-sm">
            <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-emerald-500" />
              <span>Nearest Shelter</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
              {safetyResult.supportingData.nearestShelter
                ? `${safetyResult.supportingData.nearestShelter.distanceKm} km`
                : 'N/A'}
            </div>
            <span className="text-[10px] text-slate-400 truncate block">
              {safetyResult.supportingData.nearestShelter
                ? `${safetyResult.supportingData.nearestShelter.occupancyPct}% Occupied`
                : 'No registered shelter'}
            </span>
          </div>
        </div>

      </div>

      {/* Footer Notice */}
      <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-surface-elevated/80 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>⚠️ Operational Decision Support — Provides predictive sector stability estimates. Follow official state disaster directives.</span>
        <span className="font-mono">Engine: Destination Safety · v1.0</span>
      </div>
    </div>
  );
}

function scoreToStatus(score: number): DestinationSafetyStatus {
  if (score >= 75) return 'SAFE';
  if (score >= 50) return 'CAUTION';
  if (score >= 25) return 'HIGH_RISK';
  return 'CRITICAL';
}
