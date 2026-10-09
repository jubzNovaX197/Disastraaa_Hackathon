'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import { Badge, Card, CardTitle } from '@/components/ui';
import type { RoadOperationsSummary } from '@/lib/commandCenter/types';
import type { RoadSegment } from '@/lib/roads/types';
import { cn } from '@/lib/utils';
import { Eye, ShieldAlert, X } from 'lucide-react';
import { useState } from 'react';

interface BlockedRoadsOperationsPanelProps {
  roadOperations: RoadOperationsSummary;
}

export function BlockedRoadsOperationsPanel({ roadOperations }: BlockedRoadsOperationsPanelProps) {
  const [inspectedRoad, setInspectedRoad] = useState<RoadSegment | null>(null);

  const {
    blockedCount,
    partiallyBlockedCount,
    closedCount,
    cautionCount,
    openCount,
    unknownCount,
    criticalSegments,
  } = roadOperations;

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <DataProvenance />
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Road Network Operations & Closures
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Transit corridor accessibility & structural obstruction tracking
            </p>
          </div>
        </div>
        <Badge
          severity={blockedCount + closedCount > 0 ? 'CRITICAL' : 'LOW'}
          dot={blockedCount + closedCount > 0}
          className="text-xs"
        >
          {blockedCount + closedCount} Impassable
        </Badge>
      </div>

      {/* Road status counts */}
      <div className="p-3.5 border-b border-white/[0.06] bg-surface-elevated/40 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 text-[10px]">Blocked</p>
          <p className="text-sm font-bold text-red-400">{blockedCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <p className="text-orange-300 text-[10px]">Partially Blocked</p>
          <p className="text-sm font-bold text-orange-400">{partiallyBlockedCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 text-[10px]">Closed (DMA)</p>
          <p className="text-sm font-bold text-purple-400">{closedCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-300 text-[10px]">Caution</p>
          <p className="text-sm font-bold text-yellow-400">{cautionCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-green-300 text-[10px]">Open</p>
          <p className="text-sm font-bold text-green-400">{openCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-slate-400 text-[10px]">Unknown</p>
          <p className="text-sm font-bold text-slate-300">{unknownCount}</p>
        </div>
      </div>

      {/* Critical segments list */}
      <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
        {criticalSegments.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No road blockages reported. All surveyed arterial corridors report normal operational flow.
          </div>
        ) : (
          criticalSegments.map((road) => (
          <div
            key={road.id}
            onClick={() => setInspectedRoad(road)}
            className="p-3 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 truncate">{road.name}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                    road.status === 'BLOCKED'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : road.status === 'CLOSED'
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
                  )}
                >
                  {road.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="text-orange-400 font-medium">Obstruction:</span>
                <span>{road.blockageType ?? 'Flooding / Debris'}</span>
                <span className="text-slate-600">·</span>
                <span>Source: {road.source ?? 'Traffic Authority'}</span>
              </p>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-accent/15 text-slate-400 hover:text-accent transition-colors flex-shrink-0"
              title="Inspect road segment"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        )))}
      </div>

      {/* Road segment modal */}
      {inspectedRoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-card border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <Badge severity="CRITICAL" className="mb-1 text-[10px]">
                  {inspectedRoad.status}
                </Badge>
                <h3 className="text-base font-bold text-slate-100">{inspectedRoad.name}</h3>
                <p className="text-[11px] text-slate-400">{inspectedRoad.roadType ?? 'Arterial Link'}</p>
              </div>
              <button
                onClick={() => setInspectedRoad(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06] space-y-1">
                <p className="text-slate-400 text-[10px] uppercase font-semibold">Obstruction Reason</p>
                <p className="text-slate-200">
                  {inspectedRoad.travelRisk?.explanation ?? 'Deep water inundation and structural debris blocking carriage-way.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-white/5">
                  <p className="text-slate-400 text-[10px]">Verification Status</p>
                  <p className="font-semibold text-safe">
                    {inspectedRoad.authorityVerification?.status ?? 'VERIFIED'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5">
                  <p className="text-slate-400 text-[10px]">Travel Risk Score</p>
                  <p className="font-bold text-critical">{inspectedRoad.travelRisk?.score ?? 85}/100</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedRoad(null)}
                className="px-4 py-2 rounded-lg font-semibold bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
