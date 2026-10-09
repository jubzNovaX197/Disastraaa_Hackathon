'use client';

import { Badge, Card, CardTitle } from '@/components/ui';
import type { SituationTimelinePoint } from '@/lib/commandCenter/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface SituationTimelineTrendProps {
  timeline: SituationTimelinePoint[];
}

export function SituationTimelineTrend({ timeline }: SituationTimelineTrendProps) {
  const maxRisk = 100;

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Operational Situation Trend
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Temporal progression across synoptic observation and simulation horizons
            </p>
          </div>
        </div>

        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Scenario Trend · Simulated Telemetry
        </Badge>
      </div>

      <div className="p-5 space-y-6">
        {/* Trend line graph visualization */}
        <div className="relative pt-6 pb-2">
          {/* Y Axis lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-white border-dashed text-[9px] text-slate-400 pr-1 text-right">
              100 - Extreme
            </div>
            <div className="border-b border-white border-dashed text-[9px] text-slate-400 pr-1 text-right">
              75 - High
            </div>
            <div className="border-b border-white border-dashed text-[9px] text-slate-400 pr-1 text-right">
              50 - Moderate
            </div>
            <div className="border-b border-white border-dashed text-[9px] text-slate-400 pr-1 text-right">
              25 - Low
            </div>
            <div className="border-b border-white text-[9px] text-slate-400 pr-1 text-right">0</div>
          </div>

          {/* Timeline points track */}
          <div className="relative grid grid-cols-6 gap-2 h-44 items-end px-3">
            {timeline.map((pt, idx) => {
              const heightPct = Math.round((pt.riskScore / maxRisk) * 100);
              const isCurrent = pt.hourOffset === 0;

              return (
                <div key={pt.timeLabel} className="flex flex-col items-center h-full justify-end group">
                  {/* Point details hover tooltip */}
                  <div className="mb-2 text-center">
                    <span
                      className={cn(
                        'inline-block px-1.5 py-0.5 rounded text-[11px] font-bold font-mono transition-transform group-hover:scale-110',
                        isCurrent
                          ? 'bg-critical text-white shadow-lg shadow-critical/30 ring-2 ring-critical/50'
                          : pt.riskScore >= 75
                          ? 'bg-critical/20 text-critical border border-critical/40'
                          : pt.riskScore >= 50
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-safe/20 text-safe border border-safe/40',
                      )}
                    >
                      {pt.riskScore}
                    </span>
                  </div>

                  {/* Vertical bar / pillar */}
                  <div className="w-8 sm:w-10 rounded-t-lg bg-surface-elevated/70 border border-white/10 relative overflow-hidden flex items-end">
                    <div
                      className={cn(
                        'w-full transition-all duration-500 rounded-t-lg',
                        isCurrent
                          ? 'bg-gradient-to-t from-critical/80 to-critical'
                          : pt.isForecast
                          ? 'bg-gradient-to-t from-accent/30 to-accent/70 border-t border-accent'
                          : 'bg-gradient-to-t from-white/10 to-white/30',
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Label */}
                  <div className="mt-3 text-center">
                    <p
                      className={cn(
                        'text-xs font-bold font-mono',
                        isCurrent ? 'text-critical' : 'text-slate-200',
                      )}
                    >
                      {pt.timeLabel}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {pt.isForecast ? 'Forecast' : pt.hourOffset === 0 ? 'Current' : 'Synoptic'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Narrative milestones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06] text-xs">
          <div className="p-2.5 rounded-lg bg-white/5 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">T-12h to T0 (Genesis to Landfall)</span>
            <p className="text-slate-300 text-[11px] leading-snug">
              Rapid cyclonic storm intensification combined with 8 lakh cusecs reservoir release from Hirakud.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-critical/10 border border-critical/20 space-y-1">
            <span className="text-[10px] font-mono text-critical uppercase font-bold">T0 to T+6h (Peak Severity Window)</span>
            <p className="text-slate-300 text-[11px] leading-snug">
              Anticipated eye passage over Puri–Konark corridor with compound storm surge up to 3.5 meters.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">T+12h to T+24h (Post-Landfall Runoff)</span>
            <p className="text-slate-300 text-[11px] leading-snug">
              Wind attenuation; peak inland tributary inundation creates secondary cresting in delta blocks.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
