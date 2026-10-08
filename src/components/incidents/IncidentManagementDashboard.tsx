'use client';

/**
 * IncidentManagementDashboard
 *
 * Emergency Incident Management & Coordination workspace.
 * KPI row · filter/search bar · incident list · detail panel
 */

import { useState, useCallback, useEffect } from 'react';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IncidentKPIRow } from './IncidentKPIRow';
import { IncidentList }   from './IncidentList';
import { IncidentDetailPanel } from './IncidentDetailPanel';
import { AuthorityAccessGate } from '@/components/auth/AuthorityAccessGate';
import {
  getIncidents,
  getKPIs,
  saveIncident,
  createIncident,
  INCIDENT_STATUS_CONFIG,
  INCIDENT_SEVERITY_CONFIG,
  INCIDENT_TYPE_ICON,
  type Incident,
  type IncidentStatus,
  type IncidentSeverity,
  type IncidentType,
} from '@/lib/incidents';
import type { Role } from '@/types/roles';
import { ROLES } from '@/types/roles';
import { rolePermissions } from '@/types/roles';

const STATUSES:  { value: IncidentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',         label: 'All' },
  { value: 'NEW',         label: 'New' },
  { value: 'TRIAGED',     label: 'Triaged' },
  { value: 'ASSIGNED',    label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ESCALATED',   label: 'Escalated' },
  { value: 'RESOLVED',    label: 'Resolved' },
  { value: 'CLOSED',      label: 'Closed' },
];

import type { AppEnvironment } from '@/lib/env';

interface Props {
  initialRole: Role;
  environment?: AppEnvironment;
}

export function IncidentManagementDashboard({ initialRole, environment = 'REAL' }: Props) {
  const [role]            = useState<Role>(initialRole);
  const [incidents, setIncidents] = useState<Incident[]>(() => getIncidents(environment));
  const [selected, setSelected]   = useState<Incident | null>(null);
  const [kpis, setKpis]           = useState(() => getKPIs(environment));

  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState<IncidentStatus | 'ALL'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<IncidentSeverity | 'ALL'>('ALL');
  const [showCreate,     setShowCreate]     = useState(false);

  // Create form state
  const [newTitle,    setNewTitle]    = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [newType,     setNewType]     = useState<IncidentType>('FLOOD');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('HIGH');
  const [newLocation, setNewLocation] = useState('');

  const isManager = rolePermissions[role]?.canManageAlerts ?? false;

  const refresh = useCallback(() => {
    setIncidents([...getIncidents(environment)]);
    setKpis(getKPIs(environment));
  }, [environment]);

  const handleUpdate = useCallback((updated: Incident) => {
    saveIncident(updated, environment);
    refresh();
    setSelected(updated);
  }, [environment, refresh]);

  const handleCreate = () => {
    if (!newTitle.trim() || !newLocation.trim()) return;
    const actor = role === ROLES.STATE_AUTHORITY ? 'Dr. Suresh Mohapatra' : 'Priyadarshini Sahoo (IAS)';
    // Map incident type to a hazard type
    const hazardMap: Partial<Record<IncidentType, import('@/types').HazardType>> = {
      FLOOD: 'FLOOD', CYCLONE: 'CYCLONE', ROAD_BLOCKAGE: 'FLOOD',
      SHELTER_OVERLOAD: 'CYCLONE', MEDICAL_EMERGENCY: 'FLOOD',
      INFRASTRUCTURE_DAMAGE: 'LIGHTNING', EVACUATION: 'CYCLONE',
    };
    const hazardType = hazardMap[newType] ?? 'FLOOD';
    const inc = createIncident({
      title:         newTitle,
      description:   newDesc || 'Manually created incident.',
      incidentType:  newType,
      hazardType,
      severity:      newSeverity,
      locationName:  newLocation,
      source:        'MANUAL',
      dataLabel:     'VERIFIED',
      createdBy:     actor,
      createdByRole: role,
    });
    saveIncident(inc, environment);
    refresh();
    setSelected(inc);
    setShowCreate(false);
    setNewTitle('');
    setNewDesc('');
    setNewLocation('');
  };

  // Sync selected incident when store updates
  useEffect(() => {
    if (selected) {
      const updated = incidents.find((i) => i.id === selected.id);
      if (updated) setSelected(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents, selected?.id]);

  const publicBlocked = role === ROLES.CITIZEN;

  if (publicBlocked) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
        <AuthorityAccessGate
          currentRole={role}
          onClearanceGranted={() => {
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0 flex items-start justify-between gap-4 flex-wrap bg-white dark:bg-surface-base">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Incident Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Coordinate active emergencies, response teams and operational actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isManager && (
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Incident
            </button>
          )}
        </div>
      </div>

      {/* Create incident form */}
      {showCreate && isManager && (
        <div className="px-5 py-3 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Create Incident</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <input placeholder="Incident title *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100" />
            <input placeholder="Location *" value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100" />
            <select value={newType} onChange={(e) => setNewType(e.target.value as IncidentType)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100">
              {Object.keys(INCIDENT_TYPE_ICON).map((t) => (
                <option key={t} value={t}>{INCIDENT_TYPE_ICON[t as IncidentType]} {t.replace('_', ' ')}</option>
              ))}
            </select>
            <select value={newSeverity} onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as IncidentSeverity[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <textarea rows={2} placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100 resize-none mb-2" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-1.5 rounded text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90">Create Incident</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Cancel</button>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="px-5 py-3 flex-shrink-0 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-surface-base">
        <IncidentKPIRow kpis={kpis} />
      </div>

      {/* Filter / search bar */}
      <div className="px-5 py-2.5 flex-shrink-0 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-surface-base flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            placeholder="Search incidents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={cn(
                'text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors',
                filterStatus === s.value
                  ? 'bg-accent text-slate-950 border-accent'
                  : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as IncidentSeverity | 'ALL')}
          className="text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Severities</option>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as IncidentSeverity[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Incident list */}
        <div className={cn(
          'flex-shrink-0 overflow-y-auto border-r border-slate-200 dark:border-white/[0.06]',
          selected ? 'hidden md:block md:w-80 lg:w-96' : 'w-full',
        )}>
          <IncidentList
            incidents={incidents}
            selectedId={selected?.id}
            onSelect={setSelected}
            filterStatus={filterStatus}
            filterSeverity={filterSeverity}
            search={search}
          />
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <IncidentDetailPanel
              incident={selected}
              role={role}
              onClose={() => setSelected(null)}
              onUpdate={handleUpdate}
              className="h-full"
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-center text-slate-400 p-8">
            <div>
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm font-medium">Select an incident to view details</div>
              <div className="text-xs mt-1">or create a new incident using the button above</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
