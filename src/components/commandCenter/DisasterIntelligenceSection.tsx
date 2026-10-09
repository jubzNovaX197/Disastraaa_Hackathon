'use client';

/**
 * AI Disaster Intelligence & Decision Support Section
 *
 * Refocused, grounded decision-support interface for Emergency Incident Commanders:
 * 1. Current hazard intelligence (type, sector, severity, freshness)
 * 2. Calculated physical risk assessment (score, dominant threat, severity)
 * 3. Telemetry integrity & confidence (source attribution, data quality)
 * 4. Actionable operational directives with target authorities
 * 5. Telemetry limitations & missing data transparency
 * 6. Collapsible ground evidence and source references
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import { Card, CardTitle } from '@/components/ui';
import type {
  DisasterIntelligenceSummary,
  RecommendationPriority,
} from '@/lib/intelligence/types';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Info,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DisasterIntelligenceSectionProps {
  selectedDistrict?: string;
  className?: string;
}

export function DisasterIntelligenceSection({
  selectedDistrict = 'Kalahandi',
  className,
}: DisasterIntelligenceSectionProps) {
  const [district, setDistrict] = useState(selectedDistrict);
  const [summaryData, setSummaryData] = useState<DisasterIntelligenceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false);

  // Anti-spam debounce ref
  const lastFetchTimeRef = useRef<number>(0);

  const fetchSummary = useCallback(
    async (targetDist: string, force = false) => {
      const now = Date.now();
      // Debounce: prevent duplicate fetches within 3 seconds unless forced
      if (!force && now - lastFetchTimeRef.current < 3000) {
        return;
      }
      lastFetchTimeRef.current = now;

      if (force) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          district: targetDist,
          forceRefresh: force ? 'true' : 'false',
        });

        const res = await fetch(`/api/intelligence/summary?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error(`Operational intelligence service returned HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data.success || !data.summary) {
          throw new Error(data.error || 'Invalid intelligence payload received');
        }

        setSummaryData(data.summary);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Intelligence service temporarily unreachable';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchSummary(district);
  }, [district, fetchSummary]);

  const handleManualRefresh = () => {
    if (isRefreshing || isLoading) return;
    fetchSummary(district, true);
  };

  const getPriorityBadgeClass = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'LOW':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <Card className={cn('bg-surface-card/95 border-white/[0.08] shadow-xl overflow-hidden', className)}>
      <DataProvenance />
      <div className="p-4 sm:p-5 space-y-4">
        {/* ── HEADER & CONTROLS ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-100">
                  AI Disaster Intelligence & Decision Support
                </CardTitle>
                {summaryData && (
                  <span
                    className={cn(
                      'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                      summaryData.generationMode === 'AI'
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                    )}
                  >
                    {summaryData.generationMode === 'AI' ? 'LLM Synthesized' : 'Rule-Based Engine'}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Physical sensor telemetry & prioritized operational decision directives
              </p>
            </div>
          </div>

          {/* Controls: Sector dropdown + Refresh button */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              aria-label="Select operational district"
              className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="Kalahandi">Kalahandi Sector</option>
              <option value="Khordha">Khordha Sector</option>
              <option value="Puri">Puri Sector</option>
              <option value="Cuttack">Cuttack Sector</option>
            </select>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all disabled:opacity-50"
              title="Refresh intelligence brief"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-cyan-400')} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* ── LOADING STATE ── */}
        {isLoading && !summaryData && (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">
              Loading operational telemetry & decision support directives...
            </p>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {error && !summaryData && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-300">Operational Intelligence Service Unavailable</p>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                type="button"
                onClick={() => fetchSummary(district, true)}
                className="mt-2 text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Retry telemetry connection
              </button>
            </div>
          </div>
        )}

        {/* ── CONTENT BODY ── */}
        {summaryData && (
          <div className="space-y-3.5">
            {/* 1. Executive Situation Brief */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-slate-900/40 border border-cyan-500/20 relative">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                      Situational Decision Brief
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Generated: {new Date(summaryData.generatedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {summaryData.executiveSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Key Triage Triad: Hazard Risk, Telemetry Integrity, Operational Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Card 1: Calculated Hazard Risk */}
              <div className="p-3 rounded-xl bg-surface-card border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <ShieldAlert className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Calculated Risk</span>
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-bold px-2 py-0.5 rounded border uppercase',
                      getSeverityBadgeClass(summaryData.currentRiskAssessment.severityLevel),
                    )}
                  >
                    {summaryData.currentRiskAssessment.severityLevel}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-white">
                    {summaryData.currentRiskAssessment.compositeScore}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ 100</span>
                  <span className="text-[11px] text-slate-400 ml-auto font-mono truncate">
                    {summaryData.currentRiskAssessment.dominantThreat}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {summaryData.currentRiskAssessment.overview}
                </p>
              </div>

              {/* Card 2: Telemetry Integrity & Confidence */}
              <div className="p-3 rounded-xl bg-surface-card border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <FileCheck2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>Telemetry Integrity</span>
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-bold px-2 py-0.5 rounded border uppercase',
                      summaryData.dataQualityBadge === 'HIGH'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : summaryData.dataQualityBadge === 'DEGRADED'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30',
                    )}
                  >
                    {summaryData.dataQualityBadge}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-mono text-cyan-300">
                    Confidence: {summaryData.currentRiskAssessment.confidenceLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {summaryData.generationMode === 'AI' ? summaryData.provider : 'Deterministic Safety Engine'}
                </p>
              </div>

              {/* Card 3: Sector Scope & Population */}
              <div className="p-3 rounded-xl bg-surface-card border border-white/[0.08] space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Sector Scope</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {summaryData.location.district}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-200">
                    {summaryData.location.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  Pop: {summaryData.location.population.toLocaleString('en-US')} ({summaryData.location.populationSource})
                </p>
              </div>
            </div>

            {/* 3. Telemetry Uncertainties / Missing Data (Conditional) */}
            {summaryData.keyUncertainties.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/20 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Telemetry Limitations &amp; Unmonitored Inputs</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">
                  {summaryData.keyUncertainties.map((unc, i) => (
                    <li key={i}>{unc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. Prioritized Actionable Recommendations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Prioritized Operational Directives ({summaryData.recommendedActions.length})
                </span>
                <span className="text-[10px] text-slate-400 hidden xs:inline">
                  Authority Action Targets
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {summaryData.recommendedActions.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-surface-card border border-white/[0.06] hover:border-white/[0.12] transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {rec.title}
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-bold px-2 py-0.5 rounded border uppercase flex-shrink-0',
                          getPriorityBadgeClass(rec.priority),
                        )}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                      {rec.action}
                    </p>
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 font-mono border-t border-white/[0.04]">
                      <span>Target: {rec.targetAuthorityOrAudience}</span>
                      <span className="text-slate-400 truncate">Basis: {rec.triggerBasis}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Collapsible Ground Evidence & Provenance */}
            <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-surface-card/60">
              <button
                type="button"
                onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.03] transition-all"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>
                    Telemetry Evidence &amp; Physical Grounding ({summaryData.supportingEvidence.length} items)
                  </span>
                </div>
                {isEvidenceExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {isEvidenceExpanded && (
                <div className="p-3 pt-0 border-t border-white/[0.04] space-y-2">
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    {summaryData.supportingEvidence.map((ev, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {ev}
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-white/[0.04] flex flex-wrap gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span className="text-slate-400 font-semibold">Verified Feeds:</span>
                    {summaryData.sourceReferences.map((s, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 italic pt-1">
                    {summaryData.provenanceDisclaimer}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
