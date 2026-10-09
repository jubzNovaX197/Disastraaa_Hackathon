'use client';

import { Home, Users, AlertTriangle, ShieldCheck, HeartPulse, Utensils } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import type { ShelterOperationsSummary } from '@/lib/commandCenter/types';

interface ShelterOperationsPanelProps {
  shelterOperations: ShelterOperationsSummary;
}

export function ShelterOperationsPanel({ shelterOperations }: ShelterOperationsPanelProps) {
  const {
    totalShelters,
    availableShelters,
    highUtilizationShelters,
    totalCapacityGap,
    totalProjectedDemand,
    totalProjectedSurplus,
    items,
  } = shelterOperations;

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
            <Home className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Shelter Operations & Evacuation Capacity
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Projected demand versus emergency accommodation capacity
            </p>
          </div>
        </div>
        <Badge
          severity={totalCapacityGap > 0 ? 'CRITICAL' : totalShelters > 0 ? 'MODERATE' : 'LOW'}
          dot={totalCapacityGap > 0}
          className="text-xs"
        >
          {totalCapacityGap > 0
            ? `Gap: -${formatNumber(totalCapacityGap)}`
            : totalShelters > 0
            ? (items.some((s) => s.occupancy > 0) ? 'Sufficient Overall' : 'Registered Capacity (Occupancy Unmonitored)')
            : 'Standby / Unactivated'}
        </Badge>
      </div>

      {/* Aggregate metrics */}
      <div className="p-3.5 border-b border-white/[0.06] bg-surface-elevated/40 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-slate-400 text-[10px]">Total Shelters</p>
          <p className="text-sm font-bold text-slate-200">{totalShelters}</p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-green-300 text-[10px]">Registered Capacity</p>
          <p className="text-sm font-bold text-green-400">
            {formatNumber(items.reduce((acc, s) => acc + s.capacity, 0))}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-white/5 border border-white/[0.04]">
          <p className="text-slate-400 text-[10px]">Live Occupancy</p>
          <p className="text-sm font-bold text-slate-300">
            {items.some((s) => s.occupancy > 0) ? formatNumber(items.reduce((acc, s) => acc + s.occupancy, 0)) : 'Unmonitored'}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-300 text-[10px]">Projected Demand</p>
          <p className="text-sm font-bold text-blue-400">
            {totalProjectedDemand > 0 ? formatNumber(totalProjectedDemand) : 'Standby'}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 text-[10px]">Capacity Gap</p>
          <p className="text-sm font-bold text-red-400">
            {totalCapacityGap > 0 ? `-${formatNumber(totalCapacityGap)}` : '0'}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 text-[10px]">Available Surplus</p>
          <p className="text-sm font-bold text-purple-400">
            {formatNumber(totalProjectedSurplus > 0 ? totalProjectedSurplus : items.reduce((acc, s) => acc + s.capacity, 0))}
          </p>
        </div>
      </div>

      {/* Shelter list table */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/80 border-b border-white/[0.06] text-slate-400 uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Shelter Name</th>
              <th className="py-2.5 px-3 text-right">Capacity</th>
              <th className="py-2.5 px-3 text-right">Occupancy</th>
              <th className="py-2.5 px-3 text-right">Projected Demand</th>
              <th className="py-2.5 px-3 text-right">Net Gap/Surplus</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                  No emergency shelters currently active in operational store.
                </td>
              </tr>
            ) : (
              items.map((shelter) => (
              <tr key={shelter.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-3">
                  <div>
                    <span className="font-semibold text-slate-200">{shelter.name}</span>
                    <p className="text-[10px] text-slate-500">{shelter.location}</p>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                  {formatNumber(shelter.capacity)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                  {shelter.occupancy > 0 ? `${formatNumber(shelter.occupancy)} (${shelter.utilizationPct}%)` : 'Unmonitored'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                  {shelter.projectedDemand > 0 ? formatNumber(shelter.projectedDemand) : 'Standby'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {shelter.gapOrSurplus < 0 ? (
                    <span className="text-critical font-bold">
                      -{formatNumber(Math.abs(shelter.gapOrSurplus))}
                    </span>
                  ) : (
                    <span className="text-safe font-bold">
                      +{formatNumber(shelter.gapOrSurplus)}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      shelter.status === 'SHORTAGE'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : shelter.status === 'PRESSURE'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-green-500/15 text-green-400 border border-green-500/30',
                    )}
                  >
                    {shelter.status}
                  </span>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-white/[0.06] text-[10px] text-slate-500 text-center">
        ⚠️ Simulation estimates for decision-support · Verify with on-ground shelter authorities.
      </div>
    </Card>
  );
}
