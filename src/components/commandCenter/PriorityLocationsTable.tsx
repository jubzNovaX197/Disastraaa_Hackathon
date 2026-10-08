'use client';

import {
  AlertTriangle,
  ChevronRight,
  Eye,
  MapPin,
  Waves,
  Wind,
  Layers,
  Users,
  ShieldAlert,
  Car,
  Home,
  Package,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import type { PriorityLocation } from '@/lib/commandCenter/types';

interface PriorityLocationsTableProps {
  locations: PriorityLocation[];
  selectedLocationId?: string | null;
  onSelectLocation: (loc: PriorityLocation) => void;
}

export function PriorityLocationsTable({
  locations,
  selectedLocationId,
  onSelectLocation,
}: PriorityLocationsTableProps) {
  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-xl overflow-hidden">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-red-500/15 text-critical">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Operational Priority Locations
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Objective operational ranking by risk score, exposed population & critical deficits
            </p>
          </div>
        </div>

        <Badge severity={locations.length > 0 ? 'CRITICAL' : 'LOW'} dot={locations.length > 0} className="text-xs">
          {locations.length} Locations Ranked
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/80 border-b border-white/[0.06] text-slate-400 font-semibold uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Rank / Location</th>
              <th className="py-2.5 px-3 text-center">Risk Score</th>
              <th className="py-2.5 px-3">Dominant Hazard</th>
              <th className="py-2.5 px-3 text-right">Population</th>
              <th className="py-2.5 px-3 text-center">Alert Status</th>
              <th className="py-2.5 px-3 text-center">Road Access</th>
              <th className="py-2.5 px-3">Shelter Pressure</th>
              <th className="py-2.5 px-3">Resource Deficit</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                  No active operational priority locations. Operational monitoring feeds are standing by.
                </td>
              </tr>
            ) : (
              locations.map((loc, idx) => {
                const isSelected = selectedLocationId === loc.id;
                const HazardIcon =
                  loc.dominantHazard === 'CYCLONE' ? Wind :
                  loc.dominantHazard === 'FLOOD' ? Waves : Layers;

                return (
                  <tr
                    key={loc.id}
                    onClick={() => onSelectLocation(loc)}
                    className={cn(
                      'cursor-pointer transition-colors group',
                      isSelected
                        ? 'bg-accent/15 dark:bg-accent/15'
                        : 'hover:bg-slate-100/50 dark:hover:bg-white/[0.03]',
                    )}
                  >
                    {/* Rank & Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-surface-elevated border border-white/10 text-[10px] font-bold flex items-center justify-center text-slate-300">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-100 group-hover:text-accent transition-colors">
                            {loc.name}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {loc.district}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded font-extrabold text-xs',
                          loc.riskScore >= 75
                            ? 'bg-critical/15 text-critical border border-critical/30'
                            : loc.riskScore >= 50
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
                        )}
                      >
                        {loc.riskScore}
                      </span>
                    </td>

                    {/* Hazard */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <HazardIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-medium text-slate-300 capitalize text-[11px]">
                          {loc.dominantHazard.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    {/* Population */}
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {formatNumber(loc.populationExposed)}
                    </td>

                    {/* Alert Status */}
                    <td className="py-3 px-3 text-center">
                      <Badge
                        severity={
                          loc.activeAlertStatus === 'CRITICAL' ? 'CRITICAL' :
                          loc.activeAlertStatus === 'HIGH' ? 'HIGH' :
                          loc.activeAlertStatus === 'MODERATE' ? 'MODERATE' : 'LOW'
                        }
                        className="text-[10px]"
                      >
                        {loc.activeAlertStatus}
                      </Badge>
                    </td>

                    {/* Road Access */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                          loc.roadAccessibility === 'BLOCKED'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : loc.roadAccessibility === 'PARTIAL'
                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                            : 'bg-green-500/15 text-green-400 border border-green-500/30',
                        )}
                      >
                        {loc.roadAccessibility}
                      </span>
                    </td>

                    {/* Shelter Pressure */}
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          loc.shelterGap > 0
                            ? 'text-critical'
                            : loc.shelterDemand > loc.shelterCapacity * 0.8
                            ? 'text-orange-400'
                            : 'text-safe',
                        )}
                      >
                        {loc.shelterPressureLabel}
                      </span>
                    </td>

                    {/* Resource Gap */}
                    <td className="py-3 px-3">
                      <span
                        className={cn(
                          'text-[11px]',
                          loc.resourceShortageCount > 0 ? 'text-amber-400 font-medium' : 'text-slate-400',
                        )}
                      >
                        {loc.resourceGapSummary}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLocation(loc);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
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
