'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import { Badge, Card, CardTitle } from '@/components/ui';
import type { HazardBreakdownItem } from '@/lib/commandCenter/types';
import { formatNumber } from '@/lib/utils';
import { Bell, Layers, Users, Waves, Wind } from 'lucide-react';

interface HazardBreakdownPanelProps {
  breakdown: HazardBreakdownItem[];
}

export function HazardBreakdownPanel({ breakdown }: HazardBreakdownPanelProps) {
  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <DataProvenance />
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
            <Layers className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Hazard Dynamics Breakdown
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Comparative analysis across Flood, Cyclone & Multi-Hazard regimes
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {breakdown.length === 0 ? (
          <div className="col-span-1 md:col-span-3 py-8 text-center text-slate-500 text-xs">
            No active hazard regimes detected. Hydrometeorological feeds report baseline calm conditions.
          </div>
        ) : (
          breakdown.map((item) => {
          const Icon = item.hazard === 'CYCLONE' ? Wind : item.hazard === 'FLOOD' ? Waves : Layers;
          const colorClass =
            item.hazard === 'CYCLONE'
              ? 'text-purple-400 border-purple-500/30 bg-purple-950/20'
              : item.hazard === 'FLOOD'
              ? 'text-blue-400 border-blue-500/30 bg-blue-950/20'
              : 'text-amber-400 border-amber-500/30 bg-amber-950/20';

          return (
            <div
              key={item.hazard}
              className={`p-4 rounded-xl border ${colorClass} space-y-3 flex flex-col justify-between`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <span className="font-bold text-sm text-slate-100">{item.title}</span>
                  </div>
                  <Badge severity={item.highestRisk >= 75 ? 'CRITICAL' : 'HIGH'} className="text-[10px]">
                    Peak {item.highestRisk}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">{item.description}</p>
              </div>

              {/* Metric meters */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08] text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Affected Sectors:</span>
                  <span className="font-bold">
                    {item.affectedLocationsCount} ({item.highRiskLocationsCount} High-Risk)
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Average Risk Score:</span>
                  <span className="font-mono font-bold">{item.averageRisk} / 100</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Peak Exposure Zone:</span>
                  <span className="font-semibold text-slate-100 truncate max-w-[150px]">
                    {item.highestRiskLocation}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    Population Exposed:
                  </span>
                  <span className="font-mono font-bold text-slate-100">
                    {formatNumber(item.affectedPopulation)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Bell className="w-3 h-3 text-slate-400" />
                    Active CAP Warnings:
                  </span>
                  <span className="font-mono font-bold">{item.activeAlertsCount} alerts</span>
                </div>
              </div>
            </div>
          );
        }))}
      </div>
    </Card>
  );
}
