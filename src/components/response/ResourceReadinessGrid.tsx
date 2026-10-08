'use client';

import { useState } from 'react';
import {
  Package,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import type { ResourceReadinessItem, ResourceZoneAllocation } from '@/lib/response/types';

interface ResourceReadinessGridProps {
  resources: ResourceReadinessItem[];
  selectedResourceId?: string | null;
  onSelectResource?: (id: string) => void;
  onSelectZone?: (zoneId: string) => void;
}

export function ResourceReadinessGrid({
  resources,
  selectedResourceId,
  onSelectResource,
  onSelectZone,
}: ResourceReadinessGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(selectedResourceId ?? null);

  const toggleExpand = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (onSelectResource) onSelectResource(id);
  };

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
            <Package className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Resource Readiness & Allocation
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Stockpile adequacy, requirement modeling & inter-district zone allocations
            </p>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          {resources.length} Response Supply Lines
        </span>
      </div>

      <div className="p-4 space-y-3">
        {resources.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-white/10 rounded-xl space-y-1">
            <Package className="w-6 h-6 mx-auto mb-1 text-slate-600" />
            <p className="font-semibold text-xs text-slate-400">No Resource Supply Lines Active</p>
            <p className="text-[11px] text-slate-500">Resource requirements will calculate when real operational incidents or response zones are active.</p>
          </div>
        ) : (
          resources.map((res) => {
          const isExpanded = expandedId === res.id;
          const isShortage = res.status === 'SHORTAGE';
          const isLimited = res.status === 'LIMITED';

          return (
            <div
              key={res.id}
              className={cn(
                'rounded-xl border transition-all',
                isExpanded
                  ? 'border-accent/40 bg-surface-elevated/70 shadow-md'
                  : 'border-white/[0.06] bg-surface-card/60 hover:bg-surface-elevated/30',
              )}
            >
              {/* Header row */}
              <div
                onClick={() => toggleExpand(res.id)}
                className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
              >
                {/* Category & Title */}
                <div className="flex items-center gap-2.5 min-w-[220px]">
                  <span className="text-xl">{res.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">{res.name}</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase',
                          isShortage
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : isLimited
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-green-500/15 text-green-400 border border-green-500/30',
                        )}
                      >
                        {res.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{res.unit}</span>
                  </div>
                </div>

                {/* Gap Visual Bar (Requirement 7) */}
                <div className="flex-1 max-w-md space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">
                      Available: <strong className="text-slate-200">{formatNumber(res.available)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Required: <strong className="text-slate-200">{formatNumber(res.required)}</strong>
                    </span>
                  </div>

                  {/* Visual Coverage Bar */}
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        isShortage ? 'bg-critical' : isLimited ? 'bg-amber-400' : 'bg-safe',
                      )}
                      style={{ width: `${Math.min(100, res.coveragePct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Coverage: {res.coveragePct}%</span>
                    <span
                      className={cn(
                        'font-bold font-mono',
                        res.gap > 0 ? 'text-critical' : 'text-safe',
                      )}
                    >
                      {res.gap > 0 ? `Deficit: -${formatNumber(res.gap)}` : 'Fully Covered'}
                    </span>
                  </div>
                </div>

                {/* Expand / View allocation button */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <span className="text-[11px] font-semibold text-accent flex items-center gap-1">
                    {isExpanded ? 'Hide Allocation' : 'View Allocation'}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>

              {/* Expanded Allocation View (Requirement 4) */}
              {isExpanded && (
                <div className="p-3.5 border-t border-white/[0.06] bg-surface-base/50 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-accent" />
                      Allocated Operational Zones ({res.affectedZones.length} Sectors)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Allocation based on risk score, exposed population & unmet deficits
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-elevated/80 border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="py-2 px-3">Affected Zone</th>
                          <th className="py-2 px-3">District</th>
                          <th className="py-2 px-3 text-right">Required</th>
                          <th className="py-2 px-3 text-right">Available</th>
                          <th className="py-2 px-3 text-right">Gap</th>
                          <th className="py-2 px-3 text-center">Coverage</th>
                          <th className="py-2 px-3 text-center">Priority</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {res.affectedZones.map((alloc) => (
                          <tr key={alloc.zoneId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">
                              {alloc.zoneName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {alloc.district}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                              {formatNumber(alloc.required)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                              {formatNumber(alloc.available)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {alloc.gap > 0 ? (
                                <span className="text-critical">-{formatNumber(alloc.gap)}</span>
                              ) : (
                                <span className="text-safe">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-300">
                              {alloc.coveragePct}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                severity={
                                  alloc.priorityLevel === 'CRITICAL'
                                    ? 'CRITICAL'
                                    : alloc.priorityLevel === 'HIGH'
                                    ? 'HIGH'
                                    : 'MODERATE'
                                }
                                className="text-[10px]"
                              >
                                {alloc.priorityLevel}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {onSelectZone && (
                                <button
                                  type="button"
                                  onClick={() => onSelectZone(alloc.zoneId)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                                >
                                  Inspect Sector
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </Card>
  );
}
