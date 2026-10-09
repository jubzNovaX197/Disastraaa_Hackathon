'use client';

import {
  AlertTriangle,
  Flame,
  Users,
  Building2,
  Navigation,
  HeartPulse,
  GraduationCap,
  Bell,
  CheckCircle2,
  Home,
  PackageX,
  Waves,
  Wind,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Badge } from '@/components/ui';
import { cn, formatNumber } from '@/lib/utils';
import type { CommandOverviewKpis } from '@/lib/commandCenter/types';

interface CommandCenterKpiRowProps {
  kpis: CommandOverviewKpis;
}

export function CommandCenterKpiRow({ kpis }: CommandCenterKpiRowProps) {
  const { risk, impact, response } = kpis;
  const peakScore = risk.highestCurrentRisk.score;
  const peakSeverity =
    peakScore >= 80 ? 'CRITICAL' : peakScore >= 65 ? 'HIGH' : peakScore >= 45 ? 'MODERATE' : 'LOW';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* ── Group 1: Risk Overview ── */}
        <Card className="bg-surface-card/90 border-red-500/20 shadow-md">
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-500/15 text-red-400">
                  <Flame className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Hazard & Risk Status
                </span>
              </div>
              <Badge severity={peakSeverity} dot className="text-[10px]">
                {peakScore === 0 ? 'Standby 0/100' : `Peak ${peakScore}/100`}
              </Badge>
            </div>

            {/* Highest risk highlight */}
            <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Highest Risk Sector</p>
                <p className="text-xs font-bold text-slate-100 line-clamp-1">
                  {risk.highestCurrentRisk.zoneName}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    'text-base font-extrabold',
                    peakScore >= 80
                      ? 'text-critical'
                      : peakScore >= 65
                      ? 'text-high'
                      : peakScore >= 45
                      ? 'text-amber-400'
                      : 'text-slate-200',
                  )}
                >
                  {peakScore}
                </span>
                <p className="text-[9px] text-slate-400 uppercase font-semibold">
                  {peakScore === 0 ? 'STANDBY' : risk.highestCurrentRisk.dominantHazard}
                </p>
              </div>
            </div>

            {/* Breakdown meters */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">High Risk</p>
                <p className={cn('text-sm font-bold', risk.highRiskLocationsCount > 0 ? 'text-critical' : 'text-slate-400')}>
                  {risk.highRiskLocationsCount}
                </p>
                <p className="text-[9px] text-slate-500">zones</p>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-[10px] text-blue-300 flex items-center justify-center gap-0.5">
                  <Waves className="w-3 h-3" /> Flood
                </p>
                <p className={cn('text-sm font-bold', risk.floodRiskLocationsCount > 0 ? 'text-blue-400' : 'text-slate-400')}>
                  {risk.floodRiskLocationsCount}
                </p>
                <p className="text-[9px] text-slate-500">zones</p>
              </div>
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-[10px] text-purple-300 flex items-center justify-center gap-0.5">
                  <Wind className="w-3 h-3" /> Cyclone
                </p>
                <p className={cn('text-sm font-bold', risk.cycloneRiskLocationsCount > 0 ? 'text-purple-400' : 'text-slate-400')}>
                  {risk.cycloneRiskLocationsCount}
                </p>
                <p className="text-[9px] text-slate-500">zones</p>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-300 flex items-center justify-center gap-0.5">
                  <Layers className="w-3 h-3" /> Multi
                </p>
                <p className={cn('text-sm font-bold', risk.multiHazardLocationsCount > 0 ? 'text-amber-400' : 'text-slate-400')}>
                  {risk.multiHazardLocationsCount}
                </p>
                <p className="text-[9px] text-slate-500">zones</p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Group 2: Impact Estimates ── */}
        <Card className="bg-surface-card/90 border-amber-500/20 shadow-md">
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <Building2 className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Projected Exposure
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Impact Assessment Engine
              </span>
            </div>

            {/* Population primary stat */}
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Population In Hazard Corridor</p>
                <p className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  {formatNumber(impact.populationExposed)} People
                </p>
              </div>
              <Badge severity={impact.populationExposed > 0 ? 'HIGH' : 'LOW'} className="text-[10px]">
                {impact.populationExposed > 0 ? 'High Exposure' : 'No Hazard Zone'}
              </Badge>
            </div>

            {/* Infrastructure metrics */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">Buildings</p>
                <p className="text-sm font-bold text-slate-200">
                  {impact.estimatedBuildingsAffected > 0 ? formatNumber(impact.estimatedBuildingsAffected) : 'N/A'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {impact.estimatedBuildingsAffected > 0 ? 'units' : 'layer pending'}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">Roads</p>
                <p className="text-sm font-bold text-slate-200">
                  {impact.affectedRoadsKm > 0 ? `${impact.affectedRoadsKm} km` : '0 km'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {impact.affectedRoadsKm > 0 ? 'disrupted' : 'all passable'}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">Hospitals</p>
                <p className="text-sm font-bold text-slate-200">
                  {impact.affectedHospitals > 0 ? impact.affectedHospitals : 'N/A'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {impact.affectedHospitals > 0 ? 'at risk' : 'layer pending'}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">Schools</p>
                <p className="text-sm font-bold text-slate-200">
                  {impact.affectedSchools > 0 ? impact.affectedSchools : 'N/A'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {impact.affectedSchools > 0 ? 'institutions' : 'layer pending'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Group 3: Response & Field Operations ── */}
        <Card className="bg-surface-card/90 border-cyan-500/20 shadow-md">
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <Navigation className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Operational Response
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">Tactical Streams</span>
            </div>

            {/* Active alerts highlight */}
            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Warning Signals</p>
                <p className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  {response.activeAlertsCount} Broadcast Alerts
                </p>
              </div>
              <Badge severity={response.activeAlertsCount > 0 ? 'MODERATE' : 'LOW'} className="text-[10px]">
                {response.activeAlertsCount > 0 ? 'CAP Broadcast' : '0 Active (Monitoring)'}
              </Badge>
            </div>

            {/* Field telemetry breakdown */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">Verified</p>
                <p className="text-sm font-bold text-safe">{response.verifiedCitizenReportsCount}</p>
                <p className="text-[9px] text-slate-500">reports</p>
              </div>
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-[10px] text-orange-300">Blocked</p>
                <p className="text-sm font-bold text-orange-400">{response.blockedRoadsCount}</p>
                <p className="text-[9px] text-slate-500">roads</p>
              </div>
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-[10px] text-purple-300">Shelters</p>
                <p className="text-sm font-bold text-purple-400">
                  {response.sheltersUnderPressureCount > 0 ? `${response.sheltersUnderPressureCount} alert` : 'Registered'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {response.sheltersUnderPressureCount > 0 ? 'pressure' : 'occupancy unmon.'}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] text-red-300">Logistics</p>
                <p className={cn('text-sm font-bold', response.resourceShortagesCount > 0 ? 'text-critical' : 'text-slate-400')}>
                  {response.resourceShortagesCount > 0 ? response.resourceShortagesCount : 'Standby'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {response.resourceShortagesCount > 0 ? 'deficits' : 'telemetry unconf.'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
