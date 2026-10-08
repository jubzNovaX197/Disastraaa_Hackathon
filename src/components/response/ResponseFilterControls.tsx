'use client';

import { Filter, RotateCcw } from 'lucide-react';
import type { ResourceCategory } from '@/lib/planning/resources/types';
import type {
  ResponseFilters,
  ResourceAvailabilityStatus,
} from '@/lib/response/types';

interface ResponseFilterControlsProps {
  filters: ResponseFilters;
  onFilterChange: (filters: ResponseFilters) => void;
  availableDistricts: string[];
  totalMatches: number;
}

export function ResponseFilterControls({
  filters,
  onFilterChange,
  availableDistricts,
  totalMatches,
}: ResponseFilterControlsProps) {
  const isFiltered =
    filters.resourceType !== 'ALL' ||
    filters.region !== 'ALL' ||
    filters.severity !== 'ALL' ||
    filters.availabilityStatus !== 'ALL' ||
    Boolean(filters.searchQuery);

  const handleReset = () => {
    onFilterChange({
      resourceType: 'ALL',
      region: 'ALL',
      severity: 'ALL',
      availabilityStatus: 'ALL',
      searchQuery: '',
    });
  };

  return (
    <div className="bg-surface-card border border-white/[0.08] rounded-xl p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-accent" />
          <span>Operational Filters:</span>
          <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-bold">
            {totalMatches} Matching Zones
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Resource Type */}
          <select
            value={filters.resourceType}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                resourceType: e.target.value as ResponseFilters['resourceType'],
              })
            }
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Resource Categories</option>
            <option value="WATER">Water Supply</option>
            <option value="FOOD">Food Supplies</option>
            <option value="MEDICAL">Medical Aid</option>
            <option value="RESCUE">Rescue Teams</option>
            <option value="VEHICLES">Emergency Vehicles</option>
            <option value="BOATS">Rescue Boats</option>
            <option value="KITS">Emergency Kits</option>
            <option value="SHELTER">Shelter Supplies</option>
          </select>

          {/* Region / District */}
          <select
            value={filters.region}
            onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}
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

          {/* Severity / Priority */}
          <select
            value={filters.severity}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                severity: e.target.value as ResponseFilters['severity'],
              })
            }
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Priority Levels</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MODERATE">Moderate Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Availability Status */}
          <select
            value={filters.availabilityStatus}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                availabilityStatus: e.target.value as ResponseFilters['availabilityStatus'],
              })
            }
            className="text-xs bg-surface-elevated border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Stockpile Statuses</option>
            <option value="SHORTAGE">Shortage Only</option>
            <option value="LIMITED">Limited Supplies</option>
            <option value="AVAILABLE">Available / Sufficient</option>
          </select>

          {/* Reset */}
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
