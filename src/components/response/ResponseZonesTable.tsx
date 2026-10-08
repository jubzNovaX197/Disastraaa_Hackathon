'use client';

import { useState } from 'react';
import {
  MapPin,
  ShieldAlert,
  Users,
  Building2,
  Navigation,
  Home,
  Package,
  Eye,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import {
  OPERATIONAL_STATUSES,
  type ResponseZoneItem,
  type OperationalStatus,
} from '@/lib/response/types';

interface ResponseZonesTableProps {
  zones: ResponseZoneItem[];
  selectedZoneId?: string | null;
  onSelectZone: (zone: ResponseZoneItem) => void;
  onStatusChange: (zoneId: string, newStatus: OperationalStatus) => void;
}

export function ResponseZonesTable({
  zones,
  selectedZoneId,
  onSelectZone,
  onStatusChange,
}: ResponseZonesTableProps) {
  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-red-500/15 text-critical">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Operational Response Zones & Priority Index
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Deterministic priority ranking based on measurable hazard, exposure & deficit criteria
            </p>
          </div>
        </div>

        <Badge severity={zones.length > 0 ? "CRITICAL" : "LOW"} dot={zones.length > 0} className="text-xs">
          {zones.length} Operational Sectors
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/80 border-b border-white/[0.06] text-slate-400 text-[10px] uppercase font-semibold">
            <tr>
              <th className="py-2.5 px-3">Zone / Jurisdiction</th>
              <th className="py-2.5 px-3 text-center">Priority Index</th>
              <th className="py-2.5 px-3 text-center">Risk Score</th>
              <th className="py-2.5 px-3 text-right">Population</th>
              <th className="py-2.5 px-3 text-center">Road Access</th>
              <th className="py-2.5 px-3">Shelter Pressure</th>
              <th className="py-2.5 px-3">Primary Resource Gaps</th>
              <th className="py-2.5 px-3">Operational Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {zones.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                  <ShieldAlert className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                  <p className="font-semibold text-slate-400">No operational response zones active</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Response sectors will populate automatically when real hazards or verified incidents are registered.</p>
                </td>
              </tr>
            ) : (
              zones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                const { score, level } = zone.priorityIndex;

                return (
                  <tr
                    key={zone.id}
                    onClick={() => onSelectZone(zone)}
                    className={cn(
                      'cursor-pointer transition-colors group',
                      isSelected
                        ? 'bg-accent/15 dark:bg-accent/15'
                        : 'hover:bg-slate-100/50 dark:hover:bg-white/[0.03]',
                    )}
                  >
                    {/* Zone & District */}
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-semibold text-slate-100 group-hover:text-accent transition-colors">
                          {zone.name}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {zone.district}
                        </p>
                      </div>
                    </td>

                    {/* Response Priority Index (Requirement 6) */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded font-black text-xs font-mono',
                            level === 'CRITICAL'
                              ? 'bg-red-500/20 text-critical border border-red-500/40'
                              : level === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : level === 'MODERATE'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-green-500/20 text-green-400 border border-green-500/40',
                          )}
                        >
                          {score}/100
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                          {level}
                        </span>
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-bold text-slate-200">
                        {zone.riskScore}
                      </span>
                    </td>

                    {/* Population */}
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {formatNumber(zone.populationExposed)}
                    </td>

                    {/* Road Access */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                          zone.roadAccess === 'RESTRICTED'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : zone.roadAccess === 'PARTIAL'
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : 'bg-green-500/15 text-green-400 border border-green-500/30',
                        )}
                      >
                        {zone.roadAccess}
                      </span>
                    </td>

                    {/* Shelter Pressure */}
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          'text-[11px] font-medium block',
                          zone.shelterGap > 0
                            ? 'text-critical'
                            : zone.shelterStatus === 'PRESSURE'
                            ? 'text-orange-400'
                            : 'text-safe',
                        )}
                      >
                        {zone.shelterGap > 0
                          ? `SHORTAGE (-${formatNumber(zone.shelterGap)})`
                          : zone.shelterStatus === 'PRESSURE'
                          ? 'HIGH PRESSURE'
                          : 'AVAILABLE'}
                      </span>
                    </td>

                    {/* Resource Gaps */}
                    <td className="py-3 px-3">
                      {zone.resourceGaps.length > 0 ? (
                        <div className="text-[11px] text-amber-400 font-medium">
                          {zone.resourceGaps
                            .slice(0, 2)
                            .map((g) => `${g.name}: -${formatNumber(g.gap)}`)
                            .join(', ')}
                        </div>
                      ) : (
                        <span className="text-[11px] text-safe">Supply Adequate</span>
                      )}
                    </td>

                    {/* Operational Status (Requirement 13) */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={zone.operationalStatus}
                        onChange={(e) => onStatusChange(zone.id, e.target.value as OperationalStatus)}
                        className={cn(
                          'text-[10px] font-bold uppercase rounded-lg px-2 py-1 border transition-colors focus:outline-none cursor-pointer',
                          zone.operationalStatus === 'ACTIVE RESPONSE'
                            ? 'bg-red-500/15 text-red-300 border-red-500/40'
                            : zone.operationalStatus === 'RESOURCE DEPLOYMENT'
                            ? 'bg-orange-500/15 text-orange-300 border-orange-500/40'
                            : zone.operationalStatus === 'RESPONSE PLANNED'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                            : zone.operationalStatus === 'ASSESSING'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            : zone.operationalStatus === 'RESOLVED'
                            ? 'bg-green-500/15 text-green-300 border-green-500/40'
                            : 'bg-surface-elevated text-slate-300 border-white/10',
                        )}
                      >
                        {OPERATIONAL_STATUSES.map((status) => (
                          <option key={status} value={status} className="bg-surface-card text-slate-100">
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectZone(zone);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
