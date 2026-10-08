'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  X,
  MapPin,
  Waves,
  Wind,
  Layers,
  Users,
  Building2,
  Navigation,
  HeartPulse,
  GraduationCap,
  Bell,
  Home,
  Package,
  FileCheck2,
  Car,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatNumber, cn } from '@/lib/utils';
import type { PriorityLocation } from '@/lib/commandCenter/types';
import type { DemoAlert } from '@/data/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { RoadSegment } from '@/lib/roads/types';

interface LocationDetailDrawerProps {
  location: PriorityLocation | null;
  onClose: () => void;
  activeAlerts: DemoAlert[];
  citizenReports: CitizenReportItem[];
  roadSegments: RoadSegment[];
}

type TabType = 'overview' | 'risk_impact' | 'operations' | 'field_intel';

export function LocationDetailDrawer({
  location,
  onClose,
  activeAlerts,
  citizenReports,
  roadSegments,
}: LocationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (!location) return null;

  // Filter alerts for this location
  const localAlerts = activeAlerts.filter(
    (a) =>
      a.regionName.toLowerCase().includes(location.district.toLowerCase()) ||
      a.title.toLowerCase().includes(location.district.toLowerCase()) ||
      (Math.abs(a.coordinates[0] - location.coordinates[0]) < 0.5 &&
        Math.abs(a.coordinates[1] - location.coordinates[1]) < 0.5),
  );

  // Filter roads for this location
  const localRoads = roadSegments.filter((r) => {
    const matchDistrict =
      r.name.toLowerCase().includes(location.district.toLowerCase()) ||
      location.name.toLowerCase().includes(r.name.toLowerCase());
    const dist = Math.hypot(
      r.coordinates[0][0] - location.coordinates[0],
      r.coordinates[0][1] - location.coordinates[1],
    );
    return matchDistrict || dist < 0.45;
  });

  // Filter reports
  const localReports = citizenReports.filter((r) => {
    const matchDistrict =
      r.administrativeArea.toLowerCase().includes(location.district.toLowerCase()) ||
      r.address.toLowerCase().includes(location.district.toLowerCase());
    const dist = Math.hypot(
      r.coordinates[0] - location.coordinates[0],
      r.coordinates[1] - location.coordinates[1],
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
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge severity={location.severity} dot className="text-xs">
                Risk Score {location.riskScore}/100
              </Badge>
              <span className="text-xs text-slate-400 font-mono">
                {location.coordinates[1].toFixed(4)}°N, {location.coordinates[0].toFixed(4)}°E
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              {location.name}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              {location.district} · Operational Jurisdiction
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-white/[0.08] bg-surface-base px-4 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'overview', label: 'Situation Summary' },
            { id: 'risk_impact', label: 'Risk & Impact' },
            { id: 'operations', label: 'Shelter & Resources' },
            { id: 'field_intel', label: 'Alerts, Roads & Reports' },
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

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Quick KPI stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Risk Score</p>
                  <p className="text-xl font-bold text-critical mt-0.5">{location.riskScore}</p>
                  <p className="text-[10px] text-slate-500 capitalize">
                    {location.dominantHazard.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Population</p>
                  <p className="text-xl font-bold text-slate-100 mt-0.5">
                    {formatNumber(location.populationExposed)}
                  </p>
                  <p className="text-[10px] text-slate-500">residents in sector</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Road Access</p>
                  <p
                    className={cn(
                      'text-sm font-bold mt-1 uppercase',
                      location.roadAccessibility === 'BLOCKED'
                        ? 'text-critical'
                        : location.roadAccessibility === 'PARTIAL'
                        ? 'text-orange-400'
                        : 'text-safe',
                    )}
                  >
                    {location.roadAccessibility}
                  </p>
                  <p className="text-[10px] text-slate-500">transit corridor</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-elevated border border-white/[0.06]">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Shelter Deficit</p>
                  <p
                    className={cn(
                      'text-sm font-bold mt-1',
                      location.shelterGap > 0 ? 'text-critical' : 'text-safe',
                    )}
                  >
                    {location.shelterGap > 0 ? `-${location.shelterGap}` : 'Covered'}
                  </p>
                  <p className="text-[10px] text-slate-500">capacity balance</p>
                </div>
              </div>

              {/* Tactical Situation Narrative */}
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-white/[0.06] space-y-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-accent" />
                  Tactical Operational Synthesis
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {location.name} is currently identified as an operational focal point with an integrated
                  danger rating of {location.riskScore}/100. Dominant threat profile stems from{' '}
                  {location.dominantHazard.toLowerCase().replace('_', ' ')}.
                  {location.roadAccessibility === 'BLOCKED'
                    ? ' Severe ingress and egress disruptions reported on primary connecting corridors.'
                    : ' Access corridors remain partially constrained but passable with high-clearance assets.'}
                  {' '}Shelter facilities report {location.shelterPressureLabel.toLowerCase()}, while emergency supplies require inter-district replenishment for {location.resourceGapSummary.toLowerCase()}.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-wrap gap-2.5">
                <Link
                  href="/travel"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Inspect Travel Corridors to this Sector
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Center in Live Map
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: RISK & IMPACT */}
          {activeTab === 'risk_impact' && (
            <div className="space-y-4">
              {/* Risk scores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-blue-400" />
                      Flood Inundation Risk
                    </span>
                    <Badge severity={location.floodRiskScore ? 'HIGH' : 'LOW'}>
                      {location.floodRiskScore ?? 'N/A'}/100
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    River catchment runoff, surge barrier overtopping, and low-lying topography exposure.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Wind className="w-4 h-4 text-purple-400" />
                      Cyclone & Surge Risk
                    </span>
                    <Badge severity={location.cycloneRiskScore ? 'CRITICAL' : 'LOW'}>
                      {location.cycloneRiskScore ?? 'N/A'}/100
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sustained core winds, gust factors up to 180 km/h, and astronomical tidal surge overlap.
                  </p>
                </div>
              </div>

              {/* Impact breakdown */}
              <div className="p-4 rounded-xl bg-surface-elevated border border-white/[0.06] space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Estimated Physical & Social Exposure (Task 4)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <Building2 className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                    <p className="text-sm font-bold text-slate-200">{formatNumber(location.impact.buildings)}</p>
                    <p className="text-[10px] text-slate-500">Structures</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <Navigation className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
                    <p className="text-sm font-bold text-slate-200">{location.impact.roadsKm} km</p>
                    <p className="text-[10px] text-slate-500">Road Corridor</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <HeartPulse className="w-4 h-4 mx-auto text-critical mb-1" />
                    <p className="text-sm font-bold text-critical">{location.impact.hospitals}</p>
                    <p className="text-[10px] text-slate-500">Hospitals at Risk</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <GraduationCap className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                    <p className="text-sm font-bold text-slate-200">{location.impact.schools}</p>
                    <p className="text-[10px] text-slate-500">Schools</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHELTER & RESOURCES */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              {/* Shelter operations */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-purple-400" />
                    Shelter Operations Telemetry (Task 7)
                  </h4>
                  <Badge severity={location.shelterGap > 0 ? 'CRITICAL' : 'MODERATE'}>
                    {location.shelterPressureLabel}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-400 text-[10px]">Total Capacity</p>
                    <p className="font-bold text-slate-200">{formatNumber(location.shelterCapacity)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-400 text-[10px]">Projected Demand</p>
                    <p className="font-bold text-amber-400">{formatNumber(location.shelterDemand)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-slate-400 text-[10px]">Net Gap</p>
                    <p className="font-bold text-critical">
                      {location.shelterGap > 0 ? `-${formatNumber(location.shelterGap)}` : '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resource operations */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-400" />
                    Logistics & Stockpile Status (Task 8)
                  </h4>
                  <Badge severity={location.resourceShortageCount > 0 ? 'HIGH' : 'LOW'}>
                    {location.resourceGapSummary}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  Resource algorithms indicate {location.resourceShortageCount} supply categories experiencing
                  deficits. Immediate inter-district replenishment is recommended for water purification supplies,
                  inflatable rescue boats, and mobile paramedic units.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ALERTS, ROADS & REPORTS */}
          {activeTab === 'field_intel' && (
            <div className="space-y-4">
              {/* Active alerts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Active Warning Alerts ({localAlerts.length})
                </h4>
                {localAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-surface-elevated rounded-lg">
                    No active CAP alerts currently broadcasting for this district.
                  </p>
                ) : (
                  localAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">{a.title}</span>
                        <Badge severity={a.severity} className="text-[10px]">
                          {a.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{a.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Blocked roads */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-orange-400" />
                  Road Disruptions ({localRoads.length})
                </h4>
                {localRoads.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-surface-elevated rounded-lg">
                    No blocked roads reported on monitored corridors in this sector.
                  </p>
                ) : (
                  localRoads.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{r.name}</p>
                        <p className="text-[10px] text-slate-400">{r.blockageType ?? 'General obstruction'}</p>
                      </div>
                      <Badge severity={r.status === 'BLOCKED' ? 'CRITICAL' : 'HIGH'}>
                        {r.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              {/* Citizen reports */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                  Citizen Ground Reports ({localReports.length})
                </h4>
                {localReports.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-surface-elevated rounded-lg">
                    No citizen reports logged from this sector in the active window.
                  </p>
                ) : (
                  localReports.slice(0, 3).map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded-lg bg-surface-elevated border border-white/[0.06] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{rep.title}</span>
                        <Badge
                          severity={rep.status === 'VERIFIED' ? 'LOW' : 'MODERATE'}
                          className="text-[10px]"
                        >
                          {rep.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{rep.description}</p>
                      {rep.evidence && rep.evidence.length > 0 && (
                        <p className="text-[10px] text-cyan-400 flex items-center gap-1">
                          Evidence: {rep.evidence[0].type} ({rep.preliminaryAnalysis?.evidenceAssessment?.score ?? 80}% confidence)
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
