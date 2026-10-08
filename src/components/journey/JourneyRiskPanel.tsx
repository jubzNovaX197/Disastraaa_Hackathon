'use client';

/**
 * Journey Risk Intelligence Panel (Task 15)
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY FORECAST
 *
 * Comprehensive disaster-aware journey assessment combining:
 *   Origin → Route → Destination → Time
 *
 * Provides objective, factual metrics across route risk, destination safety,
 * hazard corridor exposure, road conditions, active alerts, citizen intelligence,
 * and emergency shelter context.
 */

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileText,
  HelpCircle,
  Home,
  Info,
  Layers,
  MapPin,
  Navigation,
  Radio,
  Route as RouteIcon,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Waves,
  Wind,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RouteMode } from '@/lib/routing/types';
import type {
  HazardType,
  JourneyRiskFactor,
  JourneyRiskResult,
  JourneyRiskStatus,
} from '@/lib/risk/journey/types';
import { JOURNEY_STATUS_THRESHOLDS } from '@/lib/risk/journey/types';

interface JourneyRiskPanelProps {
  journeyRisk: JourneyRiskResult;
  activeMode?: RouteMode;
  onSelectMode?: (mode: RouteMode) => void;
  onSelectTimeSlot?: (slotKey: string) => void;
  className?: string;
}

const STATUS_BADGE_STYLE: Record<JourneyRiskStatus, { text: string; bg: string; border: string }> = {
  LOW: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  MODERATE: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  HIGH: {
    text: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  VERY_HIGH: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
};

const HAZARD_ICON: Record<HazardType, typeof Waves> = {
  FLOOD: Waves,
  CYCLONE: Wind,
  MULTI_HAZARD: Layers,
  ROAD_BLOCKAGE: AlertTriangle,
  ALERT: Radio,
  INFRASTRUCTURE: Home,
};

export function JourneyRiskPanel({
  journeyRisk,
  activeMode = 'SAFEST',
  onSelectMode,
  onSelectTimeSlot,
  className,
}: JourneyRiskPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    factors: true,
    corridor: true,
    roads: true,
    comparison: true,
    timeline: false,
    alerts: false,
    citizen: false,
    shelter: false,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const {
    origin,
    destination,
    selectedDate,
    selectedTime,
    overallJourneyRisk,
    status,
    contributions,
    destinationSafetyScore,
    destinationRiskScore,
    routeRiskScore,
    destinationVsJourneyExplanation,
    riskFactors,
    supportingExplanation,
    hazardCorridor,
    roadBreakdown,
    alerts,
    groundIntelligence,
    emergencyContext,
    routeComparison,
    timeComparison,
    edgeState,
    travelMinutes,
    distanceKm,
  } = journeyRisk;

  const statusStyle = STATUS_BADGE_STYLE[status];
  const travelHours = Math.floor(travelMinutes / 60);
  const travelMins = travelMinutes % 60;
  const timeStr = travelHours > 0 ? `${travelHours}h ${travelMins}m` : `${travelMins} min`;

  return (
    <div className={cn('space-y-4 font-sans text-slate-900 dark:text-slate-100', className)}>
      {/* ── 1. Operational Advisory Banner ─────────────────────────────────── */}
      <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 backdrop-blur-md">
        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5">
          <div className="font-bold flex items-center gap-2">
            <span>Operational Journey Risk Assessment</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
              Multi-Factor Model
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Multi-factor evaluation combining Route Geometry, Destination Sector Safety, Corridor Hazard Proximity, and Time-Horizon Scenarios. Provides transparent comparative metrics to support emergency transit decisions.
          </p>
        </div>
      </div>

      {/* ── 2. Journey Header ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Planned Journey Corridor
            </div>
            <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex-wrap">
              <span className="flex items-center gap-1 text-accent">
                <MapPin className="w-4 h-4" />
                <span>{origin.name}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Shield className="w-4 h-4" />
                <span>{destination.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-surface-elevated border border-slate-200 dark:border-white/10">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>{selectedDate} · {selectedTime}</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-accent/10 border border-accent/25 text-accent font-bold uppercase tracking-wider">
              Monitored Corridor
            </span>
          </div>
        </div>

        {/* ── 3. Overall Journey Risk Hero Score ─────────────────────────────── */}
        <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-20 h-20 rounded-2xl border flex flex-col items-center justify-center p-2 text-center shadow-inner flex-shrink-0',
              statusStyle.bg,
              statusStyle.border
            )}>
              <span className={cn('text-2xl sm:text-3xl font-black leading-none tracking-tight', statusStyle.text)}>
                {overallJourneyRisk}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                / 100 Risk
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Overall Journey Risk
                </span>
                <span className={cn(
                  'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border',
                  statusStyle.text,
                  statusStyle.bg,
                  statusStyle.border
                )}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed">
                {supportingExplanation}
              </p>
            </div>
          </div>

          {/* Quick distance & travel time metrics */}
          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-white/10 pt-3 sm:pt-0 sm:pl-4 w-full sm:w-auto justify-between sm:justify-end">
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Estimated Time</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{timeStr}</div>
              <div className="text-[9px] text-slate-400">weather-adjusted</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Total Distance</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{distanceKm} km</div>
              <div className="text-[9px] text-slate-400">monitored route</div>
            </div>
          </div>
        </div>

        {/* ── 4. Contribution Breakdown Bars ─────────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Transparent Risk Engine Weighting (5 Factors)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Route Risk */}
            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/10">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Route Risk</span>
                <span className="font-bold text-accent">{contributions.routeRisk.raw}/100</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-surface-overlay h-1.5 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-accent h-full rounded-full"
                  style={{ width: `${contributions.routeRisk.raw}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">
                35% weight · +{contributions.routeRisk.contribution} pts
              </div>
            </div>

            {/* Destination Risk */}
            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/10">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Destination Risk</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{contributions.destinationRisk.raw}/100</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-surface-overlay h-1.5 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${contributions.destinationRisk.raw}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">
                25% weight · +{contributions.destinationRisk.contribution} pts
              </div>
            </div>

            {/* Hazard Exposure */}
            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/10">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Hazard Corridor</span>
                <span className="font-bold text-amber-500">{contributions.hazardExposure.raw}/100</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-surface-overlay h-1.5 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${contributions.hazardExposure.raw}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">
                20% weight · +{contributions.hazardExposure.contribution} pts
              </div>
            </div>

            {/* Alert Exposure */}
            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/10">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Active Alerts</span>
                <span className="font-bold text-orange-500">{contributions.alertExposure.raw}/100</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-surface-overlay h-1.5 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-orange-500 h-full rounded-full"
                  style={{ width: `${contributions.alertExposure.raw}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">
                12% weight · +{contributions.alertExposure.contribution} pts
              </div>
            </div>

            {/* Road Access */}
            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/10">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Roadway Access</span>
                <span className="font-bold text-rose-500">{contributions.roadAccess.raw}/100</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-surface-overlay h-1.5 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${contributions.roadAccess.raw}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">
                8% weight · +{contributions.roadAccess.contribution} pts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Destination Safety vs Journey Risk Disambiguation Card ───────── */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Destination Safety vs. Journey Transit Risk
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                Destination Safety Score
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Arrival Sector Stability
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {destinationSafetyScore}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400"> / 100</span>
              <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                Higher = Safer
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-rose-800 dark:text-rose-300">
                Overall Journey Risk
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Total Transit Vulnerability
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                {overallJourneyRisk}
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400"> / 100</span>
              <div className="text-[9px] font-bold text-rose-700 dark:text-rose-300 uppercase">
                Higher = Riskier
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-surface-elevated/70 p-3 rounded-xl border border-slate-200/60 dark:border-white/10">
          {destinationVsJourneyExplanation}
        </p>
      </div>

      {/* ── 6. Major Journey Risk Factors ──────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
        <button
          onClick={() => toggleSection('factors')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Primary Journey Risk Factors ({riskFactors.length})
            </span>
          </div>
          {expandedSections.factors ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.factors && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-2.5">
            {riskFactors.map((factor) => {
              const isCrit = factor.severity === 'CRITICAL' || factor.score >= 75;
              const isHigh = factor.severity === 'HIGH' || (factor.score >= 50 && factor.score < 75);
              return (
                <div
                  key={factor.id}
                  className={cn(
                    'p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5',
                    isCrit
                      ? 'bg-rose-500/10 border-rose-500/25'
                      : isHigh
                      ? 'bg-amber-500/10 border-amber-500/25'
                      : 'bg-slate-50/80 dark:bg-surface-elevated/60 border-slate-200 dark:border-white/10'
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {factor.name}
                      </span>
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border',
                        isCrit
                          ? 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          : isHigh
                          ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                          : 'border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-surface-overlay'
                      )}>
                        {factor.statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {factor.explanation}
                    </p>
                  </div>

                  {factor.metricValue && (
                    <div className="self-start sm:self-auto text-right flex-shrink-0">
                      <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-white dark:bg-surface-overlay border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
                        {factor.metricValue}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 7. Route Comparison Matrix (Objective Factual Comparison) ──────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
        <button
          onClick={() => toggleSection('comparison')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Route Options Comparison (Shortest vs Safest vs Alternative)
            </span>
          </div>
          {expandedSections.comparison ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.comparison && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Compare objective transit metrics. Routes are evaluated based on physical road distance, travel duration, road blockages, and composite hazard index without subjective ranking.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {routeComparison.map((rc) => {
                const isSelected = activeMode === rc.mode;
                const hrs = Math.floor(rc.travelMinutes / 60);
                const mins = rc.travelMinutes % 60;
                const duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;

                return (
                  <div
                    key={rc.mode}
                    onClick={() => onSelectMode?.(rc.mode)}
                    className={cn(
                      'p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-xs',
                      isSelected
                        ? 'ring-2 ring-accent border-accent bg-accent/5 dark:bg-accent/10'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated/50 hover:bg-slate-50 dark:hover:bg-surface-elevated'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {rc.modeLabel}
                      </span>
                      <span className={cn(
                        'text-[10px] font-extrabold px-2 py-0.5 rounded-full border',
                        STATUS_BADGE_STYLE[rc.status].text,
                        STATUS_BADGE_STYLE[rc.status].bg,
                        STATUS_BADGE_STYLE[rc.status].border
                      )}>
                        Risk: {rc.overallJourneyRisk}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2.5">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Distance</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{rc.distanceKm} km</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Duration</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">{duration}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Route Risk</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{rc.routeRisk}/100</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Blocked Km</div>
                        <div className={cn('font-semibold', rc.blockedRoadExposureKm > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')}>
                          {rc.blockedRoadExposureKm} km
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-surface-overlay/70 p-2 rounded-lg leading-tight">
                      {rc.majorHazardExposure}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 8. Hazard Corridor Analysis (Spatial Intersections) ─────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
        <button
          onClick={() => toggleSection('corridor')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Hazard Corridor Spatial Analysis ({hazardCorridor.length} Segments Identified)
            </span>
          </div>
          {expandedSections.corridor ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.corridor && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-2.5">
            {hazardCorridor.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                No active severe hazard intersections detected directly within 8 km of this corridor.
              </div>
            ) : (
              hazardCorridor.map((item) => {
                const IconComponent = HAZARD_ICON[item.hazardType] || Layers;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-surface-elevated/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-accent/10 text-accent mt-0.5">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.segmentName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-surface-overlay text-slate-700 dark:text-slate-200 font-bold uppercase">
                            {item.hazardType.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {item.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0 text-right">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Exposure</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.exposureKm} km</div>
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                        item.risk === 'CRITICAL'
                          ? 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          : item.risk === 'HIGH'
                          ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                          : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      )}>
                        {item.risk}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── 9. Road Conditions Breakdown ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
        <button
          onClick={() => toggleSection('roads')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Road Conditions &amp; Infrastructure Blockage Breakdown
            </span>
          </div>
          {expandedSections.roads ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.roads && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Open / Clear</div>
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{roadBreakdown.openKm} km</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">Normal transit speed</div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Caution Road</div>
                <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">{roadBreakdown.cautionKm} km</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">Reduced speed advisories</div>
              </div>

              <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25">
                <div className="text-[10px] font-bold text-orange-700 dark:text-orange-300 uppercase">Partially Blocked</div>
                <div className="text-base font-extrabold text-orange-600 dark:text-orange-400">{roadBreakdown.partiallyBlockedKm} km</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">Single-lane bottlenecks</div>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">Completely Blocked</div>
                <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">{roadBreakdown.blockedKm} km</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">Impassable / barricaded</div>
              </div>
            </div>

            {roadBreakdown.blockageNotes.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1">
                <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Specific Road Obstructions Reported</span>
                </div>
                {roadBreakdown.blockageNotes.map((note, idx) => (
                  <div key={idx} className="text-xs text-rose-900 dark:text-rose-200">
                    • {note}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 10. Time-Aware Scenario Matrix ───────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
        <button
          onClick={() => toggleSection('timeline')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Temporal Risk Projections &amp; Departure Windows
            </span>
          </div>
          {expandedSections.timeline ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.timeline && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-surface-elevated/40">
                    <th className="py-2 px-2.5 font-bold uppercase">Time Horizon</th>
                    <th className="py-2 px-2.5 font-bold uppercase">Journey Risk</th>
                    <th className="py-2 px-2.5 font-bold uppercase">Route Risk</th>
                    <th className="py-2 px-2.5 font-bold uppercase">Dest Risk</th>
                    <th className="py-2 px-2.5 font-bold uppercase">Projection Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {timeComparison.map((tc) => {
                    const st = STATUS_BADGE_STYLE[tc.status];
                    return (
                      <tr
                        key={tc.slotKey}
                        onClick={() => onSelectTimeSlot?.(tc.slotKey)}
                        className="hover:bg-slate-50 dark:hover:bg-surface-elevated/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {tc.time} <span className="text-[10px] text-slate-400 font-normal">({tc.date.slice(5)})</span>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <span className={cn('font-mono font-bold px-2 py-0.5 rounded-full border text-[11px]', st.text, st.bg, st.border)}>
                            {tc.journeyRisk}/100 · {tc.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {tc.routeRisk}/100
                        </td>
                        <td className="py-2.5 px-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {tc.destinationRisk}/100
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={tc.summary}>
                          {tc.summary}
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

      {/* ── 11. Active Alerts Impact ─────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
          <button
            onClick={() => toggleSection('alerts')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Active Corridor Alerts ({alerts.length})
              </span>
            </div>
            {expandedSections.alerts ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {expandedSections.alerts && (
            <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-2.5">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-surface-elevated/60 space-y-1"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {alert.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      {alert.severity}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {alert.summary}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                    <span>Region: {alert.affectedArea}</span>
                    <span>•</span>
                    <span>{alert.validPeriod}</span>
                    <span>•</span>
                    <span>Proximity: {alert.distanceToRouteKm} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 12. Citizen Ground Intelligence ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
        <button
          onClick={() => toggleSection('citizen')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Field Telemetry &amp; Citizen Ground Intelligence ({groundIntelligence.totalReports} Near Corridor)
            </span>
          </div>
          {expandedSections.citizen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.citizen && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-surface-elevated/60 border border-slate-200 dark:border-white/10">
                <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{groundIntelligence.totalReports}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Reports</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{groundIntelligence.verifiedCount}</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Verified Reports</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
                <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">{groundIntelligence.blockedRoadCount}</div>
                <div className="text-[10px] text-rose-700 dark:text-rose-300">Blockage Reports</div>
              </div>
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/25">
                <div className="text-base font-extrabold text-accent">{groundIntelligence.evidenceBackedCount}</div>
                <div className="text-[10px] text-accent">Photo Evidence</div>
              </div>
            </div>

            {groundIntelligence.reports.length > 0 && (
              <div className="space-y-2">
                {groundIntelligence.reports.map((rep) => (
                  <div key={rep.id} className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-surface-elevated/60 border border-slate-200/80 dark:border-white/10 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{rep.title}</div>
                      <div className="text-[10px] text-slate-400">{rep.hazardType} · {rep.distanceKm} km from route</div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-surface-overlay text-slate-700 dark:text-slate-300">
                      {rep.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 13. Shelter & Resource Emergency Context ────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card shadow-sm backdrop-blur-md overflow-hidden">
        <button
          onClick={() => toggleSection('shelter')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Emergency Shelter &amp; Tactical Resource Availability
            </span>
          </div>
          {expandedSections.shelter ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {expandedSections.shelter && (
          <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/10 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-surface-elevated/60 border border-slate-200 dark:border-white/10">
                <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{emergencyContext.nearbySheltersCount}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Nearby Shelters</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{emergencyContext.availableCapacity}</div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Available Capacity</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">{emergencyContext.projectedDemand}</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-300">Projected Demand</div>
              </div>
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/25">
                <div className="text-xs font-bold text-accent mt-1">{emergencyContext.capacityStatus}</div>
                <div className="text-[10px] text-accent/80">Status Indicator</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-surface-elevated/60 border border-slate-200/80 dark:border-white/10 text-xs space-y-1">
              {emergencyContext.nearestShelterName && (
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Nearest Facility: {emergencyContext.nearestShelterName} ({emergencyContext.nearestShelterDistanceKm} km)
                </div>
              )}
              <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                {emergencyContext.resourceShortage}
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                * Shelter and supply metrics are operational decision-support estimates and do not guarantee emergency intake.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 14. Edge State Warnings ────────────────────────────────────────── */}
      {edgeState?.noRoute && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold">No Connected Transit Route Found</div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
              {edgeState.missingDataReason || 'No passable road network connects the chosen origin and destination.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
