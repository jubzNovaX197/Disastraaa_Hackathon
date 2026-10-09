'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { RegionalAnalyticsRow } from '@/lib/analytics/types';
import { cn, formatNumber } from '@/lib/utils';
import type { Severity } from '@/types';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface RegionalSituationTableProps {
  rows: RegionalAnalyticsRow[];
  selectedLocationId?: string | null;
  onSelectLocation?: (row: RegionalAnalyticsRow) => void;
}

type SortField =
  | 'name'
  | 'riskScore'
  | 'populationExposed'
  | 'activeAlertsCount'
  | 'shelterGap'
  | 'resourceShortagesCount';

const SEVERITY_BADGE: Record<Severity, string> = {
  CRITICAL: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  HIGH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  MODERATE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

export function RegionalSituationTable({
  rows,
  selectedLocationId,
  onSelectLocation,
}: RegionalSituationTableProps) {
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending
    }
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let diff = 0;
      if (sortField === 'name') {
        diff = a.name.localeCompare(b.name);
      } else if (sortField === 'riskScore') {
        diff = a.riskScore - b.riskScore;
      } else if (sortField === 'populationExposed') {
        diff = a.populationExposed - b.populationExposed;
      } else if (sortField === 'activeAlertsCount') {
        diff = a.activeAlertsCount - b.activeAlertsCount;
      } else if (sortField === 'shelterGap') {
        diff = a.shelterGap - b.shelterGap;
      } else if (sortField === 'resourceShortagesCount') {
        diff = a.resourceShortagesCount - b.resourceShortagesCount;
      }
      return sortAsc ? diff : -diff;
    });
  }, [rows, sortField, sortAsc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 inline ml-1 opacity-60" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-cyan-500 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-500 inline ml-1" />
    );
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3">
      <DataProvenance model />
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Regional Situation
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {sortedRows.length > 0
              ? `Objective operational rankings across affected jurisdictions (${sortedRows.length} locations)`
              : 'Objective operational rankings across affected jurisdictions (0 operational locations detected)'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.08] text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                Location {renderSortIcon('name')}
              </th>
              <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('riskScore')}>
                Risk {renderSortIcon('riskScore')}
              </th>
              <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('populationExposed')}>
                Population Exposed {renderSortIcon('populationExposed')}
              </th>
              <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('activeAlertsCount')}>
                Alerts {renderSortIcon('activeAlertsCount')}
              </th>
              <th className="py-2.5 px-3">Road Access</th>
              <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('shelterGap')}>
                Shelter Status {renderSortIcon('shelterGap')}
              </th>
              <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('resourceShortagesCount')}>
                Resource Status {renderSortIcon('resourceShortagesCount')}
              </th>
              <th className="py-2.5 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <ShieldAlert className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    No Regional Situation Data Available
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No operational disaster zones or active hazard locations currently registered.
                  </p>
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const isSelected = selectedLocationId === row.id;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectLocation?.(row)}
                    className={cn(
                      'group cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-cyan-500/10 dark:bg-cyan-500/15'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]',
                    )}
                  >
                    {/* Location */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {row.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {row.district} · {row.dominantHazard.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Risk */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                            SEVERITY_BADGE[row.severity],
                          )}
                        >
                          {row.severity}
                        </span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {row.riskScore}
                        </span>
                      </div>
                    </td>

                    {/* Population */}
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {formatNumber(row.populationExposed)}
                    </td>

                    {/* Active Alerts */}
                    <td className="py-2.5 px-3">
                      {row.activeAlertsCount > 0 ? (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            row.highestAlertSeverity === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
                          )}
                        >
                          {row.activeAlertsCount} {row.highestAlertSeverity}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">None active</span>
                      )}
                    </td>

                    {/* Road Access */}
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                          row.roadAccessStatus === 'OPEN'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : row.roadAccessStatus === 'PARTIAL'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                        )}
                      >
                        {row.roadAccessStatus}
                      </span>
                    </td>

                    {/* Shelter Status */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                            row.shelterStatus === 'SHORTAGE'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : row.shelterStatus === 'NEAR_CAPACITY'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                          )}
                        >
                          {row.shelterStatus.replace('_', ' ')}
                        </span>
                        {row.shelterGap > 0 && (
                          <span className="text-[10px] text-rose-500 font-semibold">
                            -{formatNumber(row.shelterGap)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Resource Status */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                            row.resourceStatus === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : row.resourceStatus === 'SHORTAGE'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                          )}
                        >
                          {row.resourceStatus}
                        </span>
                        {row.resourceShortagesCount > 0 && (
                          <span className="text-[10px] text-slate-400">
                            ({row.resourceShortagesCount} gaps)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-2 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all inline" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
