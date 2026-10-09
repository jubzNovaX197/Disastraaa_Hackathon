'use client';

import { Badge } from '@/components/ui/Badge';
import type { EvacuationZone, RouteStatus, ShelterPressure } from '@/lib/evacuation';
import {
  remainingEvacuees,
  sortZonesByPriority,
  summariseEvacuation,
} from '@/lib/evacuation';
import { cn, formatNumber, severityConfig } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Bus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Route,
  Shield,
  Stethoscope,
  TrendingUp,
  Users,
  Wifi, WifiOff,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';

// ── Sub-component helpers ─────────────────────────────────────────────────────

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    MONITORING:           { label: 'Monitoring',  color: 'text-slate-400',   bg: 'bg-slate-400/10',   dot: 'bg-slate-400'   },
    PREPARE:              { label: 'Prepare',     color: 'text-warning',     bg: 'bg-warning/10',     dot: 'bg-warning'     },
    EVACUATION_ADVISED:   { label: 'Advised',     color: 'text-orange-400',  bg: 'bg-orange-400/10', dot: 'bg-orange-400'  },
    EVACUATION_ACTIVE:    { label: 'Active',      color: 'text-critical',    bg: 'bg-critical/10',    dot: 'bg-critical'    },
    EVACUATION_COMPLETED: { label: 'Completed',   color: 'text-safe',        bg: 'bg-safe/10',        dot: 'bg-safe'        },
  };
  return map[status] ?? map['MONITORING'];
}

function shelterPressureConfig(p: ShelterPressure) {
  const map: Record<ShelterPressure, { label: string; color: string }> = {
    AVAILABLE:     { label: 'Available',     color: 'text-safe'       },
    FILLING:       { label: 'Filling',       color: 'text-warning'    },
    NEAR_CAPACITY: { label: 'Near Capacity', color: 'text-orange-400' },
    OVER_CAPACITY: { label: 'Over Capacity', color: 'text-critical'   },
    UNAVAILABLE:   { label: 'Unavailable',   color: 'text-slate-500'  },
  };
  return map[p];
}

function routeStatusConfig(s: RouteStatus) {
  const map: Record<RouteStatus, { label: string; color: string; icon: React.ElementType }> = {
    CLEAR:   { label: 'Clear',   color: 'text-safe',      icon: CheckCircle2  },
    CAUTION: { label: 'Caution', color: 'text-warning',   icon: AlertTriangle },
    BLOCKED: { label: 'Blocked', color: 'text-critical',  icon: AlertTriangle },
    UNKNOWN: { label: 'Unknown', color: 'text-slate-400', icon: Clock         },
  };
  return map[s];
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accent = false, warning = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl p-4 flex flex-col gap-1.5',
      'bg-surface-card border',
      warning ? 'border-critical/20' : 'border-white/[0.06]',
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-3.5 h-3.5', accent ? 'text-accent' : warning ? 'text-critical' : 'text-slate-500')} />
        <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn(
        'text-2xl font-bold tabular-nums',
        accent ? 'text-accent' : warning ? 'text-critical' : 'text-slate-100',
      )}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 rounded-full bg-white/5', className)}>
      <div
        className="h-full rounded-full bg-accent transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

// ── Zone row ──────────────────────────────────────────────────────────────────

function ZoneRow({
  zone,
  selected,
  onClick,
}: {
  zone: EvacuationZone;
  selected: boolean;
  onClick: () => void;
}) {
  const sc  = statusConfig(zone.evacuationStatus);
  const sev = severityConfig[zone.riskLevel];
  const pct = zone.evacuationRequired > 0
    ? Math.round((zone.evacuated / zone.evacuationRequired) * 100)
    : 0;
  const remaining = remainingEvacuees(zone);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl p-4 transition-all duration-150 group',
        'border',
        selected
          ? 'bg-accent/5 border-accent/30'
          : 'bg-surface-card border-white/[0.06] hover:border-white/[0.12] hover:bg-surface-elevated',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full flex-shrink-0', sc.dot)} />
            <span className="text-sm font-semibold text-slate-100 truncate">{zone.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{zone.regionName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', sc.color, sc.bg)}>
            {sc.label}
          </span>
          <Badge severity={zone.riskLevel} dot>
            {sev.label}
          </Badge>
          {selected
            ? <ChevronDown className="w-3.5 h-3.5 text-accent" />
            : <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
          }
        </div>
      </div>

      {/* Population row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">At Risk</div>
          <div className="text-sm font-semibold text-slate-200 tabular-nums">
            {formatNumber(zone.estimatedPopulation)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">Evacuated</div>
          <div className="text-sm font-semibold text-safe tabular-nums">
            {formatNumber(zone.evacuated)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-0.5">Remaining</div>
          <div className={cn('text-sm font-semibold tabular-nums', remaining > 0 ? 'text-warning' : 'text-safe')}>
            {formatNumber(remaining)}
          </div>
        </div>
      </div>

      {/* Progress */}
      {zone.evacuationRequired > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Evacuation progress</span>
            <span className="text-[10px] font-semibold text-accent">{pct}%</span>
          </div>
          <ProgressBar value={pct} />
        </div>
      )}
    </button>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function ZoneDetailPanel({ zone }: { zone: EvacuationZone }) {
  const sc  = statusConfig(zone.evacuationStatus);
  const pct = zone.evacuationRequired > 0
    ? Math.round((zone.evacuated / zone.evacuationRequired) * 100)
    : 0;
  const remaining = remainingEvacuees(zone);

  return (
    <div className="animate-fade-in space-y-4">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('inline-block w-2 h-2 rounded-full', sc.dot)} />
          <h2 className="text-base font-bold text-slate-100">{zone.name}</h2>
        </div>
        <p className="text-xs text-slate-500 mb-3">{zone.regionName}</p>
        <div className={cn('text-xs rounded-lg p-3 leading-relaxed', sc.color, sc.bg)}>
          <span className="font-semibold">Priority {zone.priority} — {zone.priorityLabel}:</span>{' '}
          {zone.priorityReason}
        </div>
      </div>

      {/* Population & Progress */}
      <div className="rounded-xl bg-surface-elevated border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Evacuation Progress</span>
          <span className="ml-auto text-[10px] text-slate-500 italic">Estimated figures</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Population at Risk',   val: zone.estimatedPopulation, color: 'text-slate-200' },
            { label: 'Evacuation Required',  val: zone.evacuationRequired,  color: 'text-slate-200' },
            { label: 'Evacuated',            val: zone.evacuated,           color: 'text-safe'       },
            { label: 'Remaining',            val: remaining,                color: remaining > 0 ? 'text-warning' : 'text-safe' },
          ].map(({ label, val, color }) => (
            <div key={label} className="space-y-0.5">
              <div className="text-[10px] text-slate-500">{label}</div>
              <div className={cn('text-sm font-bold tabular-nums', color)}>
                {formatNumber(val)}
              </div>
            </div>
          ))}
        </div>
        {zone.evacuationRequired > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Overall progress</span>
              <span className="text-xs font-bold text-accent">{pct}%</span>
            </div>
            <ProgressBar value={pct} />
          </div>
        )}
      </div>

      {/* Shelters */}
      <div className="rounded-xl bg-surface-elevated border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Home className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Shelter Plan</span>
        </div>
        {zone.assignedShelters.length === 0 ? (
          <p className="text-xs text-slate-500">No shelters assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {zone.assignedShelters.map((sh) => {
              const pc = shelterPressureConfig(sh.pressure);
              const fillPct = sh.capacity > 0
                ? Math.round(((sh.occupancy + sh.allocatedSlots) / sh.capacity) * 100)
                : 100;
              return (
                <div key={sh.shelterId} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200 leading-tight">{sh.shelterName}</span>
                    <span className={cn('text-[10px] font-semibold whitespace-nowrap', pc.color)}>
                      {pc.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="space-y-0.5">
                      <div className="text-slate-500">Allocated</div>
                      <div className="text-slate-200 font-semibold">{formatNumber(sh.allocatedSlots)}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-slate-500">Distance</div>
                      <div className="text-slate-200 font-semibold">{sh.distanceKm} km</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-slate-500">Capacity</div>
                      <div className="text-slate-200 font-semibold">{formatNumber(sh.capacity)}</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <ProgressBar value={fillPct} />
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      {sh.hasMedical && <span className="flex items-center gap-1"><Stethoscope className="w-2.5 h-2.5" />Medical</span>}
                      {sh.hasFood    && <span className="flex items-center gap-1"><Building2 className="w-2.5 h-2.5" />Food</span>}
                      {sh.hasPower
                        ? <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" />Power</span>
                        : <span className="flex items-center gap-1 text-warning"><WifiOff className="w-2.5 h-2.5" />No Power</span>
                      }
                    </div>
                  </div>
                </div>
              );
            })}
            {zone.capacityGap > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-critical bg-critical/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Capacity gap: <strong>{formatNumber(zone.capacityGap)}</strong> additional places needed
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Routes */}
      <div className="rounded-xl bg-surface-elevated border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Route className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Evacuation Routes</span>
        </div>
        <div className="space-y-2">
          {zone.routes.map((route) => {
            const rc = routeStatusConfig(route.status);
            const RouteIcon = rc.icon;
            return (
              <div key={route.id} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {route.isPrimary && (
                      <span className="text-[9px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase tracking-wide">
                        Primary
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-200">{route.name}</span>
                  </div>
                  <div className={cn('flex items-center gap-1 text-[10px] font-semibold', rc.color)}>
                    <RouteIcon className="w-3 h-3" />
                    {rc.label}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{route.description}</p>
                <div className="flex items-center gap-4 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5" />{route.distanceKm} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />~{route.estimatedMinutes} min
                  </span>
                </div>
                {route.via.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {route.via.map((pt, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">{pt}</span>
                        {i < route.via.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-slate-600" />}
                      </span>
                    ))}
                  </div>
                )}
                {route.blockedSegments.length > 0 && (
                  <div className="space-y-1">
                    {route.blockedSegments.map((seg, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-critical bg-critical/10 rounded px-2 py-1">
                        <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="leading-tight">{seg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resources */}
      <div className="rounded-xl bg-surface-elevated border border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bus className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Resources</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{zone.resourceNote}</p>
      </div>

      {/* Alerts */}
      {zone.activeAlertIds.length > 0 && (
        <div className="rounded-xl bg-surface-elevated border border-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Linked Alerts</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {zone.activeAlertIds.map((id) => (
              <span key={id} className="text-[10px] font-mono bg-white/5 text-slate-400 border border-white/[0.06] px-2 py-0.5 rounded">
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data provenance */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 pt-1">
        <AlertTriangle className="w-3 h-3" />
        <span>
          Source: {zone.source} — Estimated figures only. Not verified government data.
          Updated: {new Date(zone.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface EvacuationDashboardProps {
  zones: EvacuationZone[];
  environment?: 'REAL' | 'DEMO';
}

export function EvacuationDashboard({ zones, environment = 'REAL' }: EvacuationDashboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(zones[0]?.id ?? null);

  const sorted  = useMemo(() => sortZonesByPriority(zones), [zones]);
  const summary = useMemo(() => summariseEvacuation(zones), [zones]);
  const selected = useMemo(() => sorted.find((z) => z.id === selectedId) ?? null, [sorted, selectedId]);

  const handleSelect = (id: string) =>
    setSelectedId((prev) => (prev === id ? null : id));

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6 space-y-5 max-w-[1600px] w-full mx-auto">

      {/* Page header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 leading-tight">Evacuation Management</h1>
              {environment === 'DEMO' ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase font-semibold">
                  SIMULATION
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                  LIVE OPERATIONAL
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Coordinate evacuation zones, safe routes and shelter capacity</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
        <KpiCard
          icon={Shield}
          label="Active Zones"
          value={summary.activeZones}
          sub={`${summary.advisoryZones} advised`}
          warning={summary.activeZones > 0}
        />
        <KpiCard
          icon={Users}
          label="Evacuation Required"
          value={summary.totalEvacuationRequired}
          sub="Estimated"
          accent
        />
        <KpiCard
          icon={CheckCircle2}
          label="Evacuated"
          value={summary.totalEvacuated}
          sub={`${summary.progressPct}% complete`}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Remaining"
          value={summary.totalRemaining}
          sub="Estimated"
          warning={summary.totalRemaining > 0}
        />
        <KpiCard
          icon={Home}
          label="Shelters Pressured"
          value={summary.sheltersUnderPressure}
          sub="Near/over capacity"
          warning={summary.sheltersUnderPressure > 0}
        />
        <KpiCard
          icon={Route}
          label="Blocked Primary Routes"
          value={summary.blockedPrimaryRoutes}
          sub="Primary routes"
          warning={summary.blockedPrimaryRoutes > 0}
        />
      </div>

      {/* Overall progress bar */}
      {summary.totalEvacuationRequired > 0 && (
        <div className="flex-shrink-0 rounded-xl bg-surface-card border border-white/[0.06] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-slate-300">Overall Evacuation Progress</span>
              <span className="text-[10px] text-slate-500 italic">— Estimated figures</span>
            </div>
            <span className="text-sm font-bold text-accent">{summary.progressPct}%</span>
          </div>
          <ProgressBar value={summary.progressPct} />
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
            <span>{formatNumber(summary.totalEvacuated)} evacuated</span>
            <span>{formatNumber(summary.totalRemaining)} remaining</span>
          </div>
        </div>
      )}

      {/* Zone list + detail panel or Empty State */}
      {zones.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl bg-surface-card border border-white/[0.06] p-12 text-center min-h-[300px]">
          <Shield className="w-10 h-10 text-emerald-400 mb-3" />
          <h2 className="text-base font-semibold text-slate-100">No active evacuation orders</h2>
          <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
            {environment === 'REAL'
              ? 'All sectors are currently in normal operational status. Evacuation zones, corridor routing, and shelter capacity tracking will activate upon authority issuance.'
              : 'No evacuation zones loaded in this simulation scenario.'}
          </p>
          <div className="mt-4 pt-4 border-t border-white/[0.05] inline-flex items-center gap-3 text-[11px] text-slate-500">
            <span>Directive: State EOC Standby</span>
            <span>•</span>
            <span>Status: Normal Operations</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
          {/* Zone list */}
          <div className="lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-0.5">
            {sorted.map((zone) => (
              <ZoneRow
                key={zone.id}
                zone={zone}
                selected={selectedId === zone.id}
                onClick={() => handleSelect(zone.id)}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {selected ? (
              <div className="rounded-xl bg-surface-card border border-white/[0.06] p-4 sm:p-5">
                <ZoneDetailPanel zone={selected} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-white/10">
                <div className="text-center space-y-2">
                  <Shield className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-sm text-slate-500">Select an evacuation zone to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
