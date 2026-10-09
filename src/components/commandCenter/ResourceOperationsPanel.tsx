'use client';

import { Package, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import type { ResourceOperationsSummary } from '@/lib/commandCenter/types';

interface ResourceOperationsPanelProps {
  resourceOperations: ResourceOperationsSummary;
}

export function ResourceOperationsPanel({ resourceOperations }: ResourceOperationsPanelProps) {
  const { categories, totalDeficitCategories, criticalDeficitCategories } = resourceOperations;

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
            <Package className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Emergency Logistics & Resource Deficits
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Statewide stockpile coverage & inter-district replenishment requirements
            </p>
          </div>
        </div>
        <Badge
          severity={criticalDeficitCategories > 0 ? 'CRITICAL' : totalDeficitCategories > 0 ? 'HIGH' : 'LOW'}
          dot={totalDeficitCategories > 0}
          className="text-xs"
        >
          {totalDeficitCategories > 0
            ? `${totalDeficitCategories} Deficit Categories`
            : categories.length > 0
            ? 'Stockpiles Adequate'
            : 'Logistics Telemetry Standby'}
        </Badge>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/80 border-b border-white/[0.06] text-slate-400 uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Resource Category</th>
              <th className="py-2.5 px-3 text-right">Required</th>
              <th className="py-2.5 px-3 text-right">Available</th>
              <th className="py-2.5 px-3 text-right">Net Gap</th>
              <th className="py-2.5 px-3 text-center">Coverage</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                  Logistics Inventory Feeds: External warehouse ERP telemetry unconfigured / Standby. No active deficits reported.
                </td>
              </tr>
            ) : (
              categories.map((res) => {
                const isShortage = res.status === 'SHORTAGE' || res.status === 'CRITICAL';
              const isCritical = res.status === 'CRITICAL' || res.coveragePct < 70;

              return (
                <tr key={res.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{res.icon}</span>
                      <div>
                        <span className="font-semibold text-slate-200">{res.name}</span>
                        <p className="text-[10px] text-slate-500 uppercase">{res.unit}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {formatNumber(res.required)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {formatNumber(res.available)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono">
                    {res.gap > 0 ? (
                      <span className="text-critical font-bold">-{formatNumber(res.gap)}</span>
                    ) : (
                      <span className="text-safe font-bold">0</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 max-w-[120px] mx-auto">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isCritical ? 'bg-critical' : isShortage ? 'bg-amber-400' : 'bg-safe',
                          )}
                          style={{ width: `${Math.min(100, res.coveragePct)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-300 w-8 text-right">
                        {res.coveragePct}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                        isCritical
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : isShortage
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-green-500/15 text-green-400 border border-green-500/30',
                      )}
                    >
                      {res.status}
                    </span>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-white/[0.06] text-[10px] text-slate-500 text-center">
        Logistics dispatch recommendations derived from Operational Decision Support Model.
      </div>
    </Card>
  );
}
