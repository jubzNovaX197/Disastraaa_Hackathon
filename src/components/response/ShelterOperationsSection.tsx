'use client';

import { Home, Users, AlertCircle, CheckCircle2, ShieldCheck, HeartPulse, Utensils } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import type { ShelterOperationsData } from '@/lib/response/types';

interface ShelterOperationsSectionProps {
  shelterData: ShelterOperationsData;
}

export function ShelterOperationsSection({ shelterData }: ShelterOperationsSectionProps) {
  const {
    totalShelters,
    availableCapacity,
    projectedDemand,
    capacityGap,
    highPressureShelters,
    shortageAreasCount,
    shelters,
  } = shelterData;

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
            <Home className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Shelter Readiness & Evacuation Capacity
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Verified facility capacity compared against dynamic projected evacuation demand
            </p>
          </div>
        </div>

        <Badge
          severity={capacityGap > 0 ? 'CRITICAL' : 'MODERATE'}
          dot
          className="text-xs"
        >
          {capacityGap > 0 ? `Net Gap: -${formatNumber(capacityGap)}` : 'Sufficient Overall'}
        </Badge>
      </div>

      {/* Metric counters */}
      <div className="p-3.5 border-b border-white/[0.06] bg-surface-elevated/40 grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-slate-400 text-[10px]">Total Shelters</p>
          <p className="text-sm font-bold text-slate-200">{totalShelters}</p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-green-300 text-[10px]">Available Slots</p>
          <p className="text-sm font-bold text-green-400">{formatNumber(availableCapacity)}</p>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-300 text-[10px]">Projected Demand</p>
          <p className="text-sm font-bold text-blue-400">{formatNumber(projectedDemand)}</p>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 text-[10px]">Capacity Deficit</p>
          <p className="text-sm font-bold text-red-400">
            {capacityGap > 0 ? `-${formatNumber(capacityGap)}` : '0'}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <p className="text-orange-300 text-[10px]">High Pressure</p>
          <p className="text-sm font-bold text-orange-400">{highPressureShelters}</p>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 text-[10px]">Shortage Areas</p>
          <p className="text-sm font-bold text-purple-400">{shortageAreasCount}</p>
        </div>
      </div>

      {/* Shelter Table */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/80 border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
            <tr>
              <th className="py-2.5 px-3">Shelter Name</th>
              <th className="py-2.5 px-3">Sector</th>
              <th className="py-2.5 px-3 text-right">Verified Capacity</th>
              <th className="py-2.5 px-3 text-right">Current Occupancy</th>
              <th className="py-2.5 px-3 text-right">Projected Demand</th>
              <th className="py-2.5 px-3 text-right">Available Slots</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {shelters.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                  <Home className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                  <p className="font-semibold text-slate-400">No Operational Shelters Registered</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Emergency shelter inventory will display when registered in the operational database.</p>
                </td>
              </tr>
            ) : (
              shelters.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-200">
                  {s.name}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                  {s.district}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                  {formatNumber(s.capacity)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                  {formatNumber(s.currentOccupancy)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                  {formatNumber(s.projectedDemand)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-safe">
                  {formatNumber(s.availableCapacity)}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      s.status === 'SHORTAGE'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : s.status === 'PRESSURE'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-green-500/15 text-green-400 border border-green-500/30',
                    )}
                  >
                    {s.status}
                  </span>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-white/[0.06] text-[10px] text-slate-500 flex items-center justify-between">
        <span>Verified structural capacity data synchronized with disaster readiness records.</span>
        <span>Projected demand modeled from demographic vulnerability corridors.</span>
      </div>
    </Card>
  );
}
