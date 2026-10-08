'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  X,
  MapPin,
  ShieldAlert,
  Users,
  Building2,
  Navigation,
  HeartPulse,
  GraduationCap,
  Bell,
  Home,
  Package,
  FileCheck2,
  Clock,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import {
  OPERATIONAL_STATUSES,
  type ResponseZoneItem,
  type OperationalStatus,
} from '@/lib/response/types';
import type { RoadSegment } from '@/lib/roads/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { DemoAlert } from '@/data/types';

interface ZoneDetailPanelProps {
  zone: ResponseZoneItem | null;
  onClose: () => void;
  roadSegments: RoadSegment[];
  citizenReports: CitizenReportItem[];
  alerts: DemoAlert[];
  onStatusChange: (zoneId: string, newStatus: OperationalStatus) => void;
}

type TabType = 'situation' | 'access' | 'shelter_resources' | 'intel_timeline';

export function ZoneDetailPanel({
  zone,
  onClose,
  roadSegments,
  citizenReports,
  alerts,
  onStatusChange,
}: ZoneDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('situation');

  if (!zone) return null;

  // Correlate alerts
  const localAlerts = alerts.filter(
    (a) =>
      a.regionName.toLowerCase().includes(zone.district.toLowerCase()) ||
      a.title.toLowerCase().includes(zone.district.toLowerCase()) ||
      (Math.abs(a.coordinates[0] - zone.coordinates[0]) < 0.5 &&
        Math.abs(a.coordinates[1] - zone.coordinates[1]) < 0.5),
  );

  // Correlate roads
  const localRoads = roadSegments.filter((r) => {
    const matchDistrict =
      r.name.toLowerCase().includes(zone.district.toLowerCase()) ||
      zone.name.toLowerCase().includes(r.name.toLowerCase());
    const dist = Math.hypot(
      r.coordinates[0][0] - zone.coordinates[0],
      r.coordinates[0][1] - zone.coordinates[1],
    );
    return matchDistrict || dist < 0.45;
  });

  // Correlate citizen reports
  const localReports = citizenReports.filter((r) => {
    const matchDistrict =
      r.administrativeArea.toLowerCase().includes(zone.district.toLowerCase()) ||
      r.address.toLowerCase().includes(zone.district.toLowerCase());
    const dist = Math.hypot(
      r.coordinates[0] - zone.coordinates[0],
      r.coordinates[1] - zone.coordinates[1],
    );
    return matchDistrict || dist < 0.45;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-surface-card border-l border-white/10 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-surface-elevated/70 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-mono font-black uppercase',
                  zone.priorityIndex.level === 'CRITICAL'
                    ? 'bg-red-500/20 text-critical border border-red-500/40'
                    : zone.priorityIndex.level === 'HIGH'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
                )}
              >
                Priority {zone.priorityIndex.score}/100 [{zone.priorityIndex.level}]
              </span>

              <span className="text-xs text-slate-400 font-mono">
                {zone.coordinates[1].toFixed(4)}°N, {zone.coordinates[0].toFixed(4)}°E
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">
              {zone.name}
            </h2>

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              {zone.district} · Tactical Coordination Sector
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-colors flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Status Workflow Switcher (Requirement 13) */}
        <div className="px-5 py-2.5 bg-surface-elevated/50 border-b border-white/[0.06] flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 font-medium">Operational Coordination State:</span>
          <select
            value={zone.operationalStatus}
            onChange={(e) => onStatusChange(zone.id, e.target.value as OperationalStatus)}
            className="text-xs font-bold uppercase rounded-lg px-2.5 py-1 bg-surface-card border border-white/15 text-slate-200 focus:outline-none focus:border-accent cursor-pointer"
          >
            {OPERATIONAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.08] bg-surface-base px-4 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'situation', label: 'Situation & Priority Index' },
            { id: 'access', label: 'Access & Road Network' },
            { id: 'shelter_resources', label: 'Shelter & Resources' },
            { id: 'intel_timeline', label: 'Timeline & Field Intel' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'py-3 px-3.5 border-b-2 font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-400 hover:text-slate-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: SITUATION & RESPONSE CONTEXT */}
          {activeTab === 'situation' && (
            <div className="space-y-4">
              {/* Situation metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Risk Score</p>
                  <p className="text-xl font-bold text-critical mt-0.5">{zone.riskScore}/100</p>
                  <p className="text-[10px] text-slate-500 capitalize">
                    {zone.dominantHazard.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Population</p>
                  <p className="text-xl font-bold text-slate-100 mt-0.5">
                    {formatNumber(zone.populationExposed)}
                  </p>
                  <p className="text-[10px] text-slate-500">residents in sector</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Structures</p>
                  <p className="text-xl font-bold text-slate-100 mt-0.5">
                    {formatNumber(zone.impactEstimate.buildings)}
                  </p>
                  <p className="text-[10px] text-slate-500">estimated units</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Hospitals</p>
                  <p className="text-xl font-bold text-critical mt-0.5">
                    {zone.impactEstimate.hospitals}
                  </p>
                  <p className="text-[10px] text-slate-500">at risk</p>
                </div>
              </div>

              {/* Priority Index Explanation (Requirement 6) */}
              <div className="p-4 rounded-xl bg-surface-elevated border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-accent" />
                    Response Priority Index Decomposition ({zone.priorityIndex.score}/100)
                  </h3>
                  <Badge severity={zone.priorityIndex.level === 'CRITICAL' ? 'CRITICAL' : 'HIGH'}>
                    {zone.priorityIndex.level}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300">
                  Calculated deterministically using objective operational weights. Zero political or subjective criteria.
                </p>

                <div className="space-y-2 pt-1">
                  {zone.priorityIndex.factors.map((f) => (
                    <div
                      key={f.factor}
                      className="p-2.5 rounded-lg bg-surface-card border border-white/[0.04] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{f.factor}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Weight: {f.weight}%</span>
                          <span className="font-mono font-bold text-accent">+{f.contribution} pts</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">{f.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESS & ROAD NETWORK */}
          {activeTab === 'access' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-elevated border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-orange-400" />
                    Ingress & Road Access Assessment
                  </h3>
                  <Badge
                    severity={
                      zone.roadAccess === 'RESTRICTED'
                        ? 'CRITICAL'
                        : zone.roadAccess === 'PARTIAL'
                        ? 'HIGH'
                        : 'LOW'
                    }
                  >
                    {zone.roadAccess}
                  </Badge>
                </div>

                <p className="text-xs text-slate-300">
                  {zone.roadAccess === 'RESTRICTED'
                    ? 'Primary highway connections to this sector have impassable blockages or deep flood standing water. Standard logistical transport blocked; high-clearance 4x4 or marine support required.'
                    : zone.roadAccess === 'PARTIAL'
                    ? 'Transit corridors are experiencing lane restrictions and delays. Emergency supply convoys must coordinate with traffic patrol.'
                    : 'Access corridors are passable and unobstructed.'}
                </p>
              </div>

              {/* Local roads */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Connecting Road Network Segments ({localRoads.length})
                </h4>
                {localRoads.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-surface-elevated rounded-lg">
                    No registered road network disruptions in this sector.
                  </p>
                ) : (
                  localRoads.map((road) => (
                    <div
                      key={road.id}
                      className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{road.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {road.roadType} · Obstruction: {road.blockageType}
                        </p>
                      </div>
                      <Badge
                        severity={
                          road.status === 'BLOCKED' || road.status === 'CLOSED' ? 'CRITICAL' : 'HIGH'
                        }
                      >
                        {road.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SHELTER & RESOURCES */}
          {activeTab === 'shelter_resources' && (
            <div className="space-y-4">
              {/* Shelter Operations */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-purple-400" />
                    Shelter Operations Telemetry
                  </h3>
                  <Badge severity={zone.shelterGap > 0 ? 'CRITICAL' : 'MODERATE'}>
                    {zone.shelterStatus}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-slate-400 text-[10px]">Verified Capacity</p>
                    <p className="font-bold text-slate-100">{formatNumber(zone.shelterCapacity)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-slate-400 text-[10px]">Projected Evacuees</p>
                    <p className="font-bold text-amber-400">{formatNumber(zone.shelterDemand)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-slate-400 text-[10px]">Net Gap</p>
                    <p className="font-bold text-critical">
                      {zone.shelterGap > 0 ? `-${formatNumber(zone.shelterGap)}` : '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resource Operations */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-400" />
                    Operational Resource Gaps
                  </h3>
                  <Badge severity={zone.resourceGaps.length > 0 ? 'CRITICAL' : 'LOW'}>
                    {zone.resourceGaps.length} Deficits
                  </Badge>
                </div>

                {zone.resourceGaps.length === 0 ? (
                  <p className="text-xs text-safe font-medium">
                    Local district stockpiles meet current projected requirements.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {zone.resourceGaps.map((gap) => (
                      <div
                        key={gap.name}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/[0.04] flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-200">{gap.name}</span>
                        <span className="font-mono font-bold text-critical">
                          Deficit: -{formatNumber(gap.gap)} {gap.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TIMELINE & FIELD INTEL */}
          {activeTab === 'intel_timeline' && (
            <div className="space-y-4">
              {/* Response Timeline (Requirement 14) */}
              <div className="p-4 rounded-xl bg-surface-elevated border border-white/[0.06] space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" />
                  Response Timeline
                </h3>

                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-white/10">
                  {zone.timeline.map((step) => (
                    <div key={step.id} className="relative flex items-start gap-3 pl-6 text-xs">
                      <div
                        className={cn(
                          'absolute left-1.5 top-0.5 w-3.5 h-3.5 rounded-full border-2 bg-surface-card -translate-x-1/2',
                          step.status === 'COMPLETED'
                            ? 'border-safe bg-safe'
                            : step.status === 'IN_PROGRESS'
                            ? 'border-accent bg-accent animate-pulse'
                            : 'border-slate-500 bg-surface-elevated',
                        )}
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{step.step}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {step.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{step.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active alerts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Broadcast Warnings ({localAlerts.length})
                </h4>
                {localAlerts.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{a.title}</span>
                      <Badge severity={a.severity} className="text-[10px]">
                        {a.severity}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{a.message}</p>
                  </div>
                ))}
              </div>

              {/* Citizen field reports */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                  Correlated Field Reports ({localReports.length})
                </h4>
                {localReports.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{r.title}</span>
                      <Badge severity={r.status === 'VERIFIED' ? 'LOW' : 'MODERATE'}>
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
