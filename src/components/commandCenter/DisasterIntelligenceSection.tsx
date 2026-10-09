'use client';

/**
 * AI Disaster Intelligence & Decision Support Section (Stage 5B)
 *
 * Grounded AI & Deterministic Decision Support interface for Incident Commanders:
 * - Executive situation summary
 * - Hazard risk cards (Flood, Cyclone, Multi-Hazard)
 * - Grounded supporting evidence with physical metrics
 * - Data freshness and source-quality indicators
 * - Missing-data and key uncertainty section
 * - Prioritized actionable recommendations with direct authority targets
 * - Manual refresh with duplicate-request debouncing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Waves,
  Wind,
  CheckCircle2,
  Clock,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio,
  FileCheck2,
  Info,
} from 'lucide-react';
import { Card, CardTitle, Badge } from '@/components/ui';
import type {
  DisasterIntelligenceSummary,
  DecisionSupportRecommendation,
  RecommendationPriority,
} from '@/lib/intelligence/types';
import { cn } from '@/lib/utils';

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
      } catch (err: any) {
        console.error('Failed to load disaster intelligence:', err);
        setError(err.message || 'Intelligence service temporarily unreachable');
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
      <div className="p-4 sm:p-5 space-y-4">
        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-100">
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
              <p className="text-xs text-slate-400">
                Data-grounded situational executive brief and actionable operational directives
              </p>
            </div>
          </div>

          {/* Controls: Sector selector & Refresh */}
          <div className="flex items-center gap-2">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="Kalahandi">Kalahandi District</option>
              <option value="Khordha">Khordha District</option>
              <option value="Puri">Puri District</option>
              <option value="Cuttack">Cuttack District</option>
            </select>

            <button
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
              Assembling trusted snapshot & synthesizing decision directives...
            </p>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {error && !summaryData && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-300">Intelligence Generation Service Unavailable</p>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                onClick={() => fetchSummary(district, true)}
                className="mt-2 text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Retry connection
              </button>
            </div>
          </div>
        )}

        {/* ── CONTENT BODY ── */}
        {summaryData && (
          <div className="space-y-4">
            {/* 1. Executive Summary Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-slate-900/40 border border-cyan-500/20 relative overflow-hidden">
              <div className="flex items-start gap-3">
                <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Executive Situation Summary
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(summaryData.generatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                    {summaryData.executiveSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Hazard Cards: Flood, Cyclone, Multi-Hazard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Composite Multi-Hazard Card */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Composite Multi-Hazard</span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded border uppercase',
                      getSeverityBadgeClass(summaryData.currentRiskAssessment.severityLevel),
                    )}
                  >
                    {summaryData.currentRiskAssessment.severityLevel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-white">
                    {summaryData.currentRiskAssessment.compositeScore}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ 100</span>
                  <span className="text-xs text-slate-400 ml-auto font-mono">
                    Dominant: {summaryData.currentRiskAssessment.dominantThreat}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {summaryData.currentRiskAssessment.overview}
                </p>
              </div>

              {/* Data Quality & Confidence Card */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <FileCheck2 className="w-4 h-4 text-cyan-400" />
                    <span>Telemetry Integrity</span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded border uppercase',
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
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-mono text-cyan-300">
                    {summaryData.currentRiskAssessment.confidenceLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Calculated deterministically with strict physical constraints.
                </p>
              </div>

              {/* Provider & Governance Card */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span>Operational Scope</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {summaryData.location.district}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-mono text-slate-300 truncate">
                    {summaryData.provider}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Base pop: {summaryData.location.population.toLocaleString()} ({summaryData.location.populationSource})
                </p>
              </div>
            </div>

            {/* 3. Uncertainties and Missing Data Banner (if any) */}
            {summaryData.keyUncertainties.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5" />
                  <span>Telemetry Limitations & Key Uncertainties</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
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
                <span className="text-[11px] text-slate-400">
                  Actionable decision-support recommendations
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                          'text-[10px] font-bold px-2 py-0.5 rounded border uppercase flex-shrink-0',
                          getPriorityBadgeClass(rec.priority),
                        )}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                      {rec.action}
                    </p>
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 font-mono">
                      <span>Target: {rec.targetAuthorityOrAudience}</span>
                      <span className="text-slate-400">Basis: {rec.triggerBasis}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Collapsible Supporting Evidence Section */}
            <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-surface-card/60">
              <button
                onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.03] transition-all"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>
                    Telemetry Evidence & Physical Grounding ({summaryData.supportingEvidence.length} items)
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

                  <div className="pt-2 border-t border-white/[0.04] flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="text-slate-400 font-semibold">Source Feeds:</span>
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
