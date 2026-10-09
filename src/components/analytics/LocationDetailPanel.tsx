'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { RegionalAnalyticsRow } from '@/lib/analytics/types';
import { cn, formatNumber } from '@/lib/utils';
import {
  Bell,
  Building2,
  Car,
  GraduationCap,
  HeartPulse,
  MapPin,
  X
} from 'lucide-react';
import { useState } from 'react';

interface LocationDetailPanelProps {
  location: RegionalAnalyticsRow | null;
  onClose: () => void;
}

type TabKey = 'risk_impact' | 'access_shelter' | 'ground_intel';

export function LocationDetailPanel({ location, onClose }: LocationDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('risk_impact');

  if (!location) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-surface-card border-l border-slate-200 dark:border-white/[0.1] shadow-2xl flex flex-col transition-all duration-300 ease-in-out">
      <DataProvenance model />
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-start justify-between gap-3 bg-slate-50 dark:bg-white/[0.02]">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                location.severity === 'CRITICAL'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : location.severity === 'HIGH'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
              )}
            >
              {location.severity}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Score: {location.riskScore}/100
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {location.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {location.district} · {location.dominantHazard.replace('_', ' ')}
          </p>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-white/[0.08] px-4 bg-slate-100/50 dark:bg-white/[0.01]">
        <button
          type="button"
          onClick={() => setActiveTab('risk_impact')}
          className={cn(
            'py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors',
            activeTab === 'risk_impact'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
          )}
        >
          Risk &amp; Impact
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('access_shelter')}
          className={cn(
            'py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors',
            activeTab === 'access_shelter'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
          )}
        >
          Access &amp; Readiness
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ground_intel')}
          className={cn(
            'py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors',
            activeTab === 'ground_intel'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
          )}
        >
          Alerts &amp; Intel ({location.activeAlertsCount + location.fieldReportsCount})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'risk_impact' && (
          <div className="space-y-4">
            {/* Risk Breakdown */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Multi-Hazard Assessment
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Dominant Threat</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {location.dominantHazard.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Composite Risk Score</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {location.riskScore} / 100
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Exposed Population</span>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {formatNumber(location.populationExposed)} residents
                </span>
              </div>
            </div>

            {/* Estimated Physical Impact */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Modeled Infrastructure Exposure
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Structures</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {location.impactEstimates.buildings.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Car className="w-3.5 h-3.5" />
                    <span>Transit Network</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {location.impactEstimates.roadsKm} km
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Hospitals</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {location.impactEstimates.hospitals} centers
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Schools</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {location.impactEstimates.schools} sites
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'access_shelter' && (
          <div className="space-y-4">
            {/* Road Status */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Transport &amp; Ingress Access
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Accessibility</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                    location.roadAccessStatus === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : location.roadAccessStatus === 'PARTIAL'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                  )}
                >
                  {location.roadAccessStatus}
                </span>
              </div>
            </div>

            {/* Shelter Operations */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Shelter Readiness
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Shelter Capacity Status</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {location.shelterStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Capacity Gap</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {location.shelterGap > 0
                    ? `-${formatNumber(location.shelterGap)} evacuee beds`
                    : 'Surplus available'}
                </span>
              </div>
            </div>

            {/* Resources */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Resource Stockpile Status
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Stockpile Rating</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {location.resourceStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">Categories with Deficit</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {location.resourceShortagesCount} categories
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ground_intel' && (
          <div className="space-y-4">
            {/* Warnings */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Active Warnings ({location.activeAlertsCount})
              </span>
              {location.activeAlertsCount > 0 ? (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                    <Bell className="w-4 h-4" />
                    <span>Active Alert Level: {location.highestAlertSeverity}</span>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    Targeted emergency broadcasts active for {location.name}. Follow evacuation orders and seek authorized storm shelters.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No direct warnings targeting this location.</div>
              )}
            </div>

            {/* Field Reports */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Field Intel Reports ({location.fieldReportsCount})
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px] uppercase">Total Reports</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {location.fieldReportsCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px] uppercase">Verified Ground</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {location.verifiedReportsCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
