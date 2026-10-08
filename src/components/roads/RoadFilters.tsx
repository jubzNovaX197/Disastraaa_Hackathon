'use client';

/**
 * RoadFilters
 *
 * Filter tabs and search controls for Road Intelligence and Travel Safety.
 */

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RoadFiltersState {
  statusFilter: string;
  searchQuery: string;
}

interface RoadFiltersProps {
  currentFilter: string;
  onChangeFilter: (filter: string) => void;
  searchQuery: string;
  onChangeSearch: (query: string) => void;
  counts: {
    ALL: number;
    OPEN: number;
    CAUTION: number;
    PARTIALLY_BLOCKED: number;
    BLOCKED: number;
    CLOSED: number;
    HIGH_RISK: number;
  };
  className?: string;
}

export function RoadFilters({
  currentFilter,
  onChangeFilter,
  searchQuery,
  onChangeSearch,
  counts,
  className,
}: RoadFiltersProps) {
  const filterTabs = [
    { id: 'ALL',               label: 'All Roads',       count: counts.ALL },
    { id: 'OPEN',              label: 'Open',            count: counts.OPEN,              color: 'text-emerald-500' },
    { id: 'CAUTION',           label: 'Caution',         count: counts.CAUTION,           color: 'text-amber-500' },
    { id: 'PARTIALLY_BLOCKED', label: 'Partial Block',   count: counts.PARTIALLY_BLOCKED, color: 'text-orange-500' },
    { id: 'BLOCKED',           label: 'Blocked',         count: counts.BLOCKED,           color: 'text-rose-500' },
    { id: 'CLOSED',            label: 'Closed',          count: counts.CLOSED,            color: 'text-red-600' },
    { id: 'HIGH_RISK',         label: 'High Danger',     count: counts.HIGH_RISK,         color: 'text-purple-500' },
  ];

  return (
    <div className={cn('space-y-3 font-sans', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeSearch(e.target.value)}
          placeholder="Search roads by name, route (NH-16, SH-39), or district..."
          className="w-full pl-10 pr-9 py-2 text-xs rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-accent shadow-xs transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onChangeSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => {
          const isActive = currentFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeFilter(tab.id)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border',
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900 dark:border-white shadow-xs font-semibold'
                  : 'bg-white/80 dark:bg-surface-card/80 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[10px] font-mono px-1.5 py-0.2 rounded-full',
                  isActive
                    ? 'bg-white/20 text-white dark:bg-black/15 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400',
                  tab.color && !isActive ? tab.color : '',
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
