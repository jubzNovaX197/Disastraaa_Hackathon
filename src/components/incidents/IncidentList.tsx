'use client';

import {
  INCIDENT_SEVERITY_CONFIG,
  INCIDENT_STATUS_CONFIG,
  INCIDENT_TYPE_ICON,
  TEAM_LABEL,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
} from '@/lib/incidents';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import { Clock, MapPin, Users } from 'lucide-react';

interface IncidentListProps {
  incidents:        Incident[];
  selectedId?:      string;
  onSelect:         (incident: Incident) => void;
  filterStatus?:    IncidentStatus | 'ALL';
  filterSeverity?:  IncidentSeverity | 'ALL';
  filterType?:      IncidentType | 'ALL';
  search?:          string;
}

export function IncidentList({
  incidents,
  selectedId,
  onSelect,
  filterStatus   = 'ALL',
  filterSeverity = 'ALL',
  filterType     = 'ALL',
  search         = '',
}: IncidentListProps) {
  const filtered = incidents.filter((inc) => {
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterType !== 'ALL' && inc.incidentType !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !inc.title.toLowerCase().includes(q) &&
        !inc.locationName.toLowerCase().includes(q) &&
        !inc.id.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Sort: escalated/critical first, then by updatedAt
  const sorted = [...filtered].sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const statusOrder = { ESCALATED: 0, IN_PROGRESS: 1, ASSIGNED: 2, TRIAGED: 3, NEW: 4, RESOLVED: 5, CLOSED: 6 };
    const aOrder = statusOrder[a.status] * 10 + severityOrder[a.severity];
    const bOrder = statusOrder[b.status] * 10 + severityOrder[b.severity];
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (sorted.length === 0) {
    if (incidents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 dark:text-slate-400">
          <div className="text-3xl mb-2">🛡️</div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">No operational incidents logged</div>
          <div className="text-xs mt-1 text-slate-500 max-w-xs leading-relaxed">
            The operational incident queue is currently clear. Real-time emergencies, citizen escalations, and automated alert incidents will populate here.
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 dark:text-slate-400">
        <div className="text-3xl mb-2">✅</div>
        <div className="text-sm font-medium">No incidents match the current filters.</div>
        <div className="text-xs mt-1">Adjust filters or clear your search.</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
      {sorted.map((inc) => {
        const statusCfg   = INCIDENT_STATUS_CONFIG[inc.status];
        const severityCfg = INCIDENT_SEVERITY_CONFIG[inc.severity];
        const icon        = INCIDENT_TYPE_ICON[inc.incidentType];
        const isSelected  = inc.id === selectedId;

        return (
          <button
            key={inc.id}
            type="button"
            onClick={() => onSelect(inc)}
            className={cn(
              'w-full text-left px-4 py-3.5 transition-colors',
              isSelected
                ? 'bg-accent/8 dark:bg-accent/10'
                : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]',
            )}
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">
                    {inc.title}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                    {inc.id}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase',
                  severityCfg.color, severityCfg.bg, severityCfg.border,
                )}>
                  {severityCfg.label}
                </span>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                  statusCfg.color, statusCfg.bg, statusCfg.border,
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusCfg.dot)} />
                  {statusCfg.label}
                </span>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[140px]">{inc.locationName}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(inc.updatedAt)}
              </span>
              {inc.affectedPopulation && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  ~{formatNumber(inc.affectedPopulation)}
                </span>
              )}
              {inc.assignedTeam && (
                <span className="text-violet-600 dark:text-violet-400 font-medium">
                  {TEAM_LABEL[inc.assignedTeam.team]}
                </span>
              )}
              {inc.evidence && inc.evidence.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  📷 {inc.evidence.length} Photo{inc.evidence.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
