'use client';

import {
  FileText,
  AlertCircle,
  Users,
  Compass,
  Home,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import type { OperationalSummaryNarrative } from '@/lib/commandCenter/types';

interface SituationSummaryPanelProps {
  narrative: OperationalSummaryNarrative;
}

export function SituationSummaryPanel({ narrative }: SituationSummaryPanelProps) {
  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-accent/15 text-accent">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <CardTitle className="text-sm font-bold text-slate-100">
                Operational Situation Brief
              </CardTitle>
              <p className="text-[11px] text-slate-400">
                Dynamically synthesized from real-time and computed disaster streams
              </p>
            </div>
          </div>
          <Badge
            severity={narrative.statusLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH'}
            dot
            className="text-xs uppercase"
          >
            {narrative.statusLevel}
          </Badge>
        </div>

        {/* 5 structured intelligence pillars */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* 1. Situation */}
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-critical text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Situation</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {narrative.situation}
            </p>
          </div>

          {/* 2. Impact */}
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Impact</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {narrative.impact}
            </p>
          </div>

          {/* 3. Access */}
          <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>Access & Transit</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {narrative.access}
            </p>
          </div>

          {/* 4. Shelters */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold uppercase tracking-wider">
              <Home className="w-3.5 h-3.5" />
              <span>Shelters</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {narrative.shelters}
            </p>
          </div>

          {/* 5. Resources */}
          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Package className="w-3.5 h-3.5" />
              <span>Logistics Gap</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {narrative.resources}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Source: Unified Disaster Intelligence Engine (Tasks 2–15)</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-safe" />
            Decision-support advisory for incident commanders
          </span>
        </div>
      </div>
    </Card>
  );
}
