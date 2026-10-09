'use client';

import type { OperationsFilters } from '@/lib/commandCenter/types';
import { Filter, RotateCcw } from 'lucide-react';

interface OperationsFiltersBarProps {
  filters: OperationsFilters;
  onFilterChange: (filters: OperationsFilters) => void;
  availableDistricts: string[];
  totalMatches: number;
}

export function OperationsFiltersBar({
  filters,
  onFilterChange,
  availableDistricts,
  totalMatches,
}: OperationsFiltersBarProps) {
  const isFiltered =
    filters.hazard !== 'ALL' ||
    filters.severity !== 'ALL' ||
    filters.district !== 'ALL' ||
    filters.roadStatus !== 'ALL' ||
    filters.reportStatus !== 'ALL';

  const handleReset = () => {
    onFilterChange({
      hazard: 'ALL',
      severity: 'ALL',
      district: 'ALL',
      roadStatus: 'ALL',
      reportStatus: 'ALL',
    });
  };

  return (
    <div className="bg-surface-card/90 border border-white/[0.08] rounded-xl p-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-accent" />
          <span>Operational Filters:</span>
          <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold">
            {totalMatches} Locations
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hazard */}
          <select
            value={filters.hazard}
            onChange={(e) =>
              onFilterChange({ ...filters, hazard: e.target.value as OperationsFilters['hazard'] })
            }
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Hazards</option>
            <option value="MULTI_HAZARD">Multi-Hazard Compound</option>
            <option value="FLOOD">Flood Zones</option>
            <option value="CYCLONE">Cyclone Corridor</option>
          </select>

          {/* Severity */}
          <select
            value={filters.severity}
            onChange={(e) =>
              onFilterChange({ ...filters, severity: e.target.value as OperationsFilters['severity'] })
            }
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High & Above</option>
            <option value="MODERATE">Moderate</option>
          </select>

          {/* District */}
          <select
            value={filters.district}
            onChange={(e) => onFilterChange({ ...filters, district: e.target.value })}
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">
              {availableDistricts.length > 0 ? 'All Regions / Districts' : 'All Regions (0 Active)'}
            </option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Road status */}
          <select
            value={filters.roadStatus}
            onChange={(e) =>
              onFilterChange({ ...filters, roadStatus: e.target.value as OperationsFilters['roadStatus'] })
            }
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">Road Access: All</option>
            <option value="BLOCKED">Blocked Roads Only</option>
            <option value="PARTIALLY_BLOCKED">Partially Blocked</option>
            <option value="OPEN">Open Access</option>
          </select>

          {/* Report status */}
          <select
            value={filters.reportStatus}
            onChange={(e) =>
              onFilterChange({ ...filters, reportStatus: e.target.value as OperationsFilters['reportStatus'] })
            }
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">Ground Reports: All</option>
            <option value="VERIFIED">Verified Ground Reports</option>
            <option value="EVIDENCE_BACKED">Evidence-Backed Only</option>
          </select>

          {/* Reset button */}
          {isFiltered && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
