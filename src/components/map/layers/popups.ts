/**
 * Popup HTML builders.
 *
 * Returns plain HTML strings for MapLibre Popup.setHTML().
 * Styled to work in both dark and light themes via explicit inline classes
 * that respect the app's CSS variables / globals.
 *
 * Keep these as pure functions — no React, no imports of MapLibre here.
 */

import { formatNumber } from '@/lib/utils';

// ── Shared ────────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      '#10B981',
  MODERATE: '#F59E0B',
  HIGH:     '#F97316',
  CRITICAL: '#EF4444',
};

const HAZARD_LABEL: Record<string, string> = {
  FLOOD:       '🌊 Flood',
  CYCLONE:     '🌀 Cyclone',
  HEATWAVE:    '🌡️ Heatwave',
  LIGHTNING:   '⚡ Lightning',
  LANDSLIDE:   '⛰️ Landslide',
  DROUGHT:     '🏜️ Drought',
  STORM_SURGE: '🌊 Storm Surge',
};

const SHELTER_STATUS_LABEL: Record<string, string> = {
  OPEN:       '🟢 Open',
  FULL:       '🟡 Full',
  CLOSED:     '🔴 Closed',
  PREPARING:  '🔵 Preparing',
};

const INFRA_LABEL: Record<string, string> = {
  HOSPITAL:                    '🏥 Hospital',
  FIRE_STATION:                '🚒 Fire Station',
  POLICE_STATION:              '🚔 Police Station',
  EMERGENCY_OPERATIONS_CENTER: '📡 Emergency Operations Centre',
  HELIPAD:                     '🚁 Helipad',
  WATER_SUPPLY:                '💧 Water Supply',
};

function badge(text: string, color: string): string {
  return `<span style="
    display:inline-block;
    padding:2px 8px;
    border-radius:999px;
    font-size:11px;
    font-weight:600;
    background:${color}22;
    color:${color};
    border:1px solid ${color}44;
    margin-bottom:6px;
  ">${text}</span>`;
}

function row(label: string, value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  return `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;">
    <span style="color:#64748B;font-size:12px;">${label}</span>
    <span style="font-size:12px;font-weight:500;">${value}</span>
  </div>`;
}

function amenity(icon: string, label: string, active: boolean): string {
  return `<span style="
    display:inline-flex;align-items:center;gap:4px;
    padding:2px 7px;border-radius:6px;font-size:11px;
    background:${active ? '#10B98122' : '#1e293b'};
    color:${active ? '#10B981' : '#475569'};
    border:1px solid ${active ? '#10B98133' : '#1e293b'};
    margin:2px 2px 0 0;
  ">${icon} ${label}</span>`;
}

function demoTag(props: Record<string, unknown>): string {
  return `<div style="
    font-size:10px;color:#475569;margin-top:8px;
    padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);
  ">${props.dataProvenance === 'Live API / cached observations' ? 'Live API / cached observations — check source age and availability' : 'Simulated — fictional operational data'}</div>`;
}

// ── Risk Zone popup ───────────────────────────────────────────────────────────

export function riskZonePopupHTML(props: Record<string, unknown>): string {
  const severity = String(props.severity ?? '');
  const color = SEVERITY_COLOR[severity] ?? '#64748B';
  return `
    <div>
      ${badge(severity, color)}
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${props.name}</div>
      ${row('Primary Hazard', HAZARD_LABEL[String(props.primaryHazard)] ?? String(props.primaryHazard))}
      ${row('Risk Score', `${props.riskScore}/100`)}
      ${row('Affected Population', formatNumber(Number(props.affectedPopulation)))}
      ${props.description ? `<div style="margin-top:8px;font-size:12px;color:#94A3B8;line-height:1.5;">${props.description}</div>` : ''}
      ${demoTag(props)}
    </div>`;
}

// ── Flood Area popup ──────────────────────────────────────────────────────────

export function floodAreaPopupHTML(props: Record<string, unknown>): string {
  const severity = String(props.severity ?? '');
  const color = SEVERITY_COLOR[severity] ?? '#64748B';
  const updated = props.lastUpdated
    ? new Date(String(props.lastUpdated)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;
  return `
    <div>
      ${badge(severity, color)}
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${props.name}</div>
      ${row('Hazard', HAZARD_LABEL[String(props.type)] ?? String(props.type))}
      ${props.depthMeters != null ? row('Water Depth', `${props.depthMeters} m`) : ''}
      ${props.areaKm2 != null ? row('Inundated Area', `${props.areaKm2} km²`) : ''}
      ${row('Last Updated', updated)}
      ${props.description ? `<div style="margin-top:8px;font-size:12px;color:#94A3B8;line-height:1.5;">${props.description}</div>` : ''}
      ${demoTag(props)}
    </div>`;
}

// ── Shelter popup ─────────────────────────────────────────────────────────────

export function shelterPopupHTML(props: Record<string, unknown>): string {
  const status = String(props.status ?? '');
  const cap = Number(props.capacity);
  const occ = Number(props.occupancy);
  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
  const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';

  return `
    <div>
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">⛺ ${props.name}</div>
      <div style="margin-bottom:6px;">${SHELTER_STATUS_LABEL[status] ?? status}</div>
      <div style="font-size:12px;color:#94A3B8;margin-bottom:8px;">${props.address}</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
        <span style="color:#64748B">Occupancy</span>
        <span>${occ} / ${cap} (${pct}%)</span>
      </div>
      <div style="background:#1e293b;border-radius:4px;height:5px;margin-bottom:8px;">
        <div style="background:${barColor};width:${Math.min(pct, 100)}%;height:5px;border-radius:4px;"></div>
      </div>
      <div style="margin-bottom:4px;">
        ${amenity('🏥', 'Medical', Boolean(props.hasMedical))}
        ${amenity('🍽️', 'Food', Boolean(props.hasFood))}
        ${amenity('⚡', 'Power', Boolean(props.hasPower))}
      </div>
      ${props.contactPhone ? row('Phone', String(props.contactPhone)) : ''}
      ${demoTag(props)}
    </div>`;
}

// ── Alert popup ───────────────────────────────────────────────────────────────

export function alertPopupHTML(props: Record<string, unknown>): string {
  const severity = String(props.severity ?? '');
  const color = SEVERITY_COLOR[severity] ?? '#64748B';
  const issued = props.issuedAt
    ? new Date(String(props.issuedAt)).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const sourceAgency = props.sourceAgency ? String(props.sourceAgency) : null;
  const isReal = !!sourceAgency && !sourceAgency.toLowerCase().includes('scenario');
  const freshness = props.freshnessStatus ? String(props.freshnessStatus) : null;
  const instruction = props.instruction ? String(props.instruction) : null;

  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
        ${badge(severity, color)}
        ${
          isReal
            ? `<span style="font-size:10px;font-weight:700;color:#10B981;background:#10B98118;border:1px solid #10B98133;padding:2px 6px;border-radius:999px;">${freshness === 'STALE' ? 'ARCHIVED' : 'OFFICIAL CAP'}</span>`
            : `<span style="font-size:10px;font-weight:700;color:#F59E0B;background:#F59E0B18;border:1px solid #F59E0B33;padding:2px 6px;border-radius:999px;">SIMULATED</span>`
        }
      </div>
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${props.title}</div>
      <div style="font-size:11px;color:#64748B;margin-bottom:8px;">${HAZARD_LABEL[String(props.type)] ?? ''} · ${props.regionName}</div>
      <div style="font-size:12px;color:#CBD5E1;line-height:1.6;margin-bottom:6px;">${props.message}</div>
      ${instruction ? `<div style="font-size:11px;color:#93C5FD;background:#1E3A8A25;border:1px solid #3B82F633;padding:6px 8px;border-radius:6px;margin:6px 0;"><strong>Directives:</strong> ${instruction}</div>` : ''}
      ${row('Issued', issued)}
      ${sourceAgency ? row('Authority', sourceAgency) : ''}
      ${demoTag(props)}
    </div>`;
}

// ── Infrastructure popup ──────────────────────────────────────────────────────

export function infrastructurePopupHTML(props: Record<string, unknown>): string {
  const typeKey = String(props.type ?? '');
  const operational = props.isOperational;
  return `
    <div>
      <div style="font-size:11px;color:#64748B;margin-bottom:4px;">${INFRA_LABEL[typeKey] ?? typeKey}</div>
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;">${props.name}</div>
      <div style="font-size:12px;color:#94A3B8;margin-bottom:6px;">${props.address}</div>
      ${row('Status', operational ? '🟢 Operational' : '🔴 Non-operational')}
      ${props.capacity ? row('Capacity', String(props.capacity)) : ''}
      ${props.contactPhone ? row('Phone', String(props.contactPhone)) : ''}
      ${demoTag(props)}
    </div>`;
}

// ── Blocked Road popup ────────────────────────────────────────────────────────

export function blockedRoadPopupHTML(props: Record<string, unknown>): string {
  const severity = String(props.severity ?? '');
  const color = severity === 'FULL' ? '#EF4444' : '#F97316';
  const since = props.since
    ? new Date(String(props.since)).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;
  return `
    <div>
      ${badge(severity === 'FULL' ? '🚫 Fully Blocked' : '⚠️ Partially Blocked', color)}
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${props.name}</div>
      <div style="font-size:12px;color:#CBD5E1;line-height:1.5;margin-bottom:6px;">${props.reason}</div>
      ${row('Since', since)}
      ${props.alternateRoute ? `<div style="margin-top:6px;font-size:12px;"><span style="color:#64748B">Alternate:</span> <span style="color:#22D3EE;">${props.alternateRoute}</span></div>` : ''}
      ${demoTag(props)}
    </div>`;
}

// ── Citizen Report popup ──────────────────────────────────────────────────────

const REPORT_STATUS_LABEL: Record<string, string> = {
  NEW:                 '🆕 New Incident',
  PENDING:             '⏳ Pending Review',
  UNDER_REVIEW:        '🔍 Under Review',
  COMMUNITY_CONFIRMED: '👥 Community Confirmed',
  VERIFIED:            '✅ Verified Ground Intelligence',
  ESCALATED:           '⬆️ Escalated',
  REJECTED:            '❌ Rejected',
};

export function citizenReportPopupHTML(props: Record<string, unknown>): string {
  const created = props.createdAt
    ? new Date(String(props.createdAt)).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;
  const hasEvidence = Boolean(props.hasEvidence || (Number(props.evidenceCount) > 0));
  const evidenceUrl = props.evidenceUrl ? String(props.evidenceUrl) : null;
  const statusStr = String(props.status ?? 'NEW');

  return `
    <div>
      <div style="font-size:11px;color:#64748B;margin-bottom:4px;">
        ${HAZARD_LABEL[String(props.type)] ?? '📍 Report'} · ${REPORT_STATUS_LABEL[statusStr] ?? statusStr}
      </div>
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:#0F172A;">${props.title}</div>
      <div style="font-size:12px;color:#64748B;margin-bottom:6px;">📍 ${props.address}</div>
      <div style="font-size:12px;color:#334155;line-height:1.5;margin-bottom:6px;">${props.description}</div>
      ${hasEvidence ? `
        <div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:5px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#059669;font-size:11px;font-weight:600;margin-bottom:6px;">
          📷 Photo Evidence Attached (${props.evidenceCount || 1})
        </div>
      ` : ''}
      ${evidenceUrl ? `
        <div style="margin-bottom:8px;border-radius:6px;overflow:hidden;max-height:120px;">
          <img src="${evidenceUrl}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;" alt="Incident Evidence" />
        </div>
      ` : ''}
      ${row('Reported', created)}
      ${row('Confirmations', String(props.confirmCount ?? 0))}
      ${demoTag(props)}
    </div>`;
}

// ── Historical Event popup ────────────────────────────────────────────────────

export function historicalEventPopupHTML(props: Record<string, unknown>): string {
  const severity = String(props.severity ?? '');
  const color = SEVERITY_COLOR[severity] ?? '#64748B';
  const typeLabel = HAZARD_LABEL[String(props.type)] ?? String(props.type);
  const pop = props.affectedPopulation ? Number(props.affectedPopulation).toLocaleString('en-IN') : null;
  return `
    <div>
      <div style="font-size:11px;color:#64748B;margin-bottom:4px;">🕐 Historical Record · ${typeLabel}</div>
      ${badge(severity, color)}
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${props.name}</div>
      <div style="font-size:12px;color:#94A3B8;margin-bottom:6px;">${props.regionName} · ${props.year}</div>
      ${pop ? row('Affected Population', pop) : ''}
      ${props.buildingsAffected ? row('Buildings Affected', String(props.buildingsAffected)) : ''}
      ${props.roadsAffectedKm ? row('Roads (km)', String(props.roadsAffectedKm)) : ''}
      ${props.totalRainfallMm ? row('Rainfall (mm)', String(props.totalRainfallMm)) : ''}
      ${props.peakWindKmh ? row('Peak Wind (km/h)', String(props.peakWindKmh)) : ''}
      ${props.description ? `<div style="margin-top:8px;font-size:12px;color:#94A3B8;line-height:1.5;">${props.description}</div>` : ''}
      <div style="font-size:10px;color:#475569;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
        ⚠️ ${props.sourceLabel}
      </div>
    </div>`;
}
