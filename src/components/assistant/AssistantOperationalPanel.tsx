'use client';

/**
 * AI Disaster Intelligence Assistant — Operational Context & Grounding Panel
 *
 * Provides live situational telemetry, data grounding status, and instant briefing triggers.
 */

import {
  ShieldAlert,
  Zap,
  Activity,
  Layers,
  Radio,
  FileText,
  Clock,
  Car,
  Home,
  Package,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AssistantOperationalPanelProps {
  onTriggerPrompt: (promptText: string) => void;
  selectedLocation: string;
}

export function AssistantOperationalPanel({
  onTriggerPrompt,
  selectedLocation,
}: AssistantOperationalPanelProps) {
  const { commandCenterData, recentEvents, secondsSinceSync, sourceName, status } =
    useLiveIntelligence();

  const kpis = commandCenterData.kpis;
  const overview = commandCenterData.overview;

  const GROUNDED_SYSTEMS = [
    { name: 'Multi-Hazard Risk Engine', status: 'ACTIVE', type: 'Predictive & Baseline' },
    { name: 'Active Alerts Engine', status: 'ONLINE', type: 'SEOC Warnings' },
    { name: 'Road Transit Intelligence', status: 'ACTIVE', type: 'Obstruction Models' },
    { name: 'Shelter Readiness', status: 'SYNCHRONIZED', type: 'Capacity & Demand' },
    { name: 'Resource Operations', status: 'SYNCHRONIZED', type: 'Stockpiles & Gaps' },
    { name: 'Citizen Field Intelligence', status: 'ACTIVE', type: 'Ground Verification' },
    { name: 'Live Disaster Telemetry', status: 'STREAMING', type: sourceName },
  ];

  const QUICK_QUESTIONS = [
    { label: 'Summarize the current situation', icon: Activity },
    { label: 'Which areas currently have the highest flood risk?', icon: ShieldAlert },
    { label: 'What active alerts affect this region?', icon: Radio },
    { label: 'Which roads are currently blocked?', icon: Car },
    { label: 'What shelters are under pressure?', icon: Home },
    { label: 'Where are the largest resource gaps?', icon: Package },
    { label: 'What changed recently in the live feed?', icon: Zap },
  ];

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Quick Situation Briefing Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-surface-card to-cyan-500/10 border border-purple-500/20 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400 text-xs">
            <Sparkles className="w-4 h-4" />
            Situation Briefing
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {secondsSinceSync === 0 ? 'Synced just now' : `Synced ${secondsSinceSync}s ago`}
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
          Generate an immediate AI synthesis across risks, alerts, access routes, and logistics.
        </p>
        <button
          type="button"
          onClick={() =>
            onTriggerPrompt(
              selectedLocation !== 'All Operational Sectors'
                ? `Provide an operational situation briefing for ${selectedLocation}.`
                : 'Summarize the current disaster situation and primary operational concerns.',
            )
          }
          className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <Activity className="w-3.5 h-3.5" />
          Generate Instant Briefing
        </button>
      </div>

      {/* 2. Active Situation Metrics Snapshot */}
      <div className="p-4 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-500" />
          Active Intelligence State
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.06]">
            <span className="text-[10px] text-slate-400 block truncate">Peak Risk Index</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400">
              {kpis.risk.highestCurrentRisk.score}/100
            </span>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5">
              {overview.highestRiskLocation}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.06]">
            <span className="text-[10px] text-slate-400 block truncate">Active Alerts</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400">
              {kpis.response.activeAlertsCount}
            </span>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5">Civil Warnings</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.06]">
            <span className="text-[10px] text-slate-400 block truncate">Impaired Roads</span>
            <span className="text-base font-black text-orange-600 dark:text-orange-400">
              {commandCenterData.roadOperations.blockedCount +
                commandCenterData.roadOperations.closedCount}
            </span>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5">Highway Links</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.06]">
            <span className="text-[10px] text-slate-400 block truncate">Shelters Over Capacity</span>
            <span className="text-base font-black text-purple-600 dark:text-purple-400">
              {commandCenterData.shelterOperations.highUtilizationShelters}
            </span>
            <span className="text-[9px] text-slate-400 block truncate mt-0.5">Evacuation Pressure</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Suggested Operational Questions */}
      <div className="p-4 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Suggested Operational Inquiries
        </h3>
        <div className="space-y-1.5">
          {QUICK_QUESTIONS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onTriggerPrompt(item.label)}
                className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-between group"
              >
                <span className="flex items-center gap-2 truncate pr-2 text-xs">
                  <Icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Grounded Systems Checklist */}
      <div className="p-4 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Grounded Intelligence Feeds
        </h3>
        <p className="text-[11px] text-slate-500">
          Answers are strictly constrained to Disastraaa verified application databases.
        </p>
        <div className="space-y-1.5 pt-1">
          {GROUNDED_SYSTEMS.map((sys) => (
            <div
              key={sys.name}
              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/[0.04] text-[11px]"
            >
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                {sys.name}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">
                {sys.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
