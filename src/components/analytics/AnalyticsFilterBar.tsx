'use client';

import { Search, Filter, RotateCcw } from 'lucide-react';
import type { HazardType, Severity } from '@/types';
import type { AnalyticsFilterState } from '@/lib/analytics/types';

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilterState;
  onFilterChange: (filters: AnalyticsFilterState) => void;
  availableDistricts: string[];
}

export function AnalyticsFilterBar({
  filters,
  onFilterChange,
  availableDistricts,
}: AnalyticsFilterBarProps) {
  const handleHazardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      hazard: e.target.value as 'ALL' | HazardType | 'MULTI_HAZARD',
    });
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      region: e.target.value,
    });
  };

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      severity: e.target.value as 'ALL' | Severity,
    });
  };

  const handleTimePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      timePeriod: e.target.value as AnalyticsFilterState['timePeriod'],
    });
  };

  const handleAlertStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filters,
      alertStatus: e.target.value as AnalyticsFilterState['alertStatus'],
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchQuery: e.target.value,
    });
  };

  const handleReset = () => {
    onFilterChange({
      hazard: 'ALL',
      region: 'ALL',
      severity: 'ALL',
      timePeriod: 'CURRENT_CYCLE',
      alertStatus: 'ALL',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.hazard !== 'ALL' ||
    filters.region !== 'ALL' ||
    filters.severity !== 'ALL' ||
    filters.timePeriod !== 'CURRENT_CYCLE' ||
    filters.alertStatus !== 'ALL' ||
    filters.searchQuery.trim() !== '';

  return (
    <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-2.5">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search locations, hazard zones, or road corridors..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hazard */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hazard:</span>
            <select
              value={filters.hazard}
              onChange={handleHazardChange}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">All Hazards</option>
              <option value="MULTI_HAZARD">Multi-Hazard</option>
              <option value="FLOOD">Flood</option>
              <option value="CYCLONE">Cyclone</option>
            </select>
          </div>

          {/* Region */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Region:</span>
            <select
              value={filters.region}
              onChange={handleRegionChange}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">
                {availableDistricts.length > 0 ? 'All Regions' : 'All Regions (0 Active)'}
              </option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Severity:</span>
            <select
              value={filters.severity}
              onChange={handleSeverityChange}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Time Window */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Window:</span>
            <select
              value={filters.timePeriod}
              onChange={handleTimePeriodChange}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="CURRENT_CYCLE">Current Cycle</option>
              <option value="LAST_24H">Last 24 Hours</option>
              <option value="LAST_48H">Last 48 Hours</option>
              <option value="LAST_7D">7-Day Window</option>
            </select>
          </div>

          {/* Alert Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Alerts:</span>
            <select
              value={filters.alertStatus}
              onChange={handleAlertStatusChange}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">All Alerts</option>
              <option value="ACTIVE">Active Only</option>
              <option value="EXPIRED">Expired Only</option>
            </select>
          </div>

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              type="button"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
