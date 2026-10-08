/**
 * Incident Store — client-side in-memory incident state.
 *
 * Provides a React-compatible store with functional update helpers.
 * Future: replace with server actions + database without changing UI hooks.
 *
 * Seeded with realistic demo incidents using existing alert / report / road data.
 */

import type { Incident, IncidentAction } from './types';
import { createIncident, assignTeam, addAction } from './engine';
import { ROLES } from '@/types/roles';

// ── Demo seed ─────────────────────────────────────────────────────────────────

function seedIncidents(): Incident[] {
  const incidents: Incident[] = [];

  // 1. Critical cyclone incident from active alert
  const c1 = createIncident({
    title:            'Severe Cyclonic Storm — Puri Coastal Corridor',
    description:      'Cyclone Red Alert active for Puri District. Winds 160–180 km/h expected at landfall. Mass evacuation underway along NH-316 coastal route.',
    incidentType:     'CYCLONE',
    hazardType:       'CYCLONE',
    severity:         'CRITICAL',
    locationName:     'Puri District, Odisha',
    coordinates:      [85.8315, 19.8005],
    affectedArea:     'Puri–Konark coastal belt, 40 km radius',
    source:           'ACTIVE_ALERT',
    sourceReference:  'al-cyclone-puri',
    dataLabel:        'LIVE_UPDATED',
    createdBy:        'Dr. Suresh Mohapatra',
    createdByRole:    ROLES.STATE_AUTHORITY,
    affectedPopulation: 340000,
    relatedAlertIds:  ['al-cyclone-puri', 'al-surge-puri'],
  });

  const c1a = assignTeam(c1, {
    team:           'RESCUE',
    officer:        'Cmdr. R. K. Verma',
    assignedBy:     'Dr. Suresh Mohapatra',
    assignedByRole: ROLES.STATE_AUTHORITY,
  });

  const c1b = addAction(c1a, {
    title:        'Deploy NDRF teams to Puri coastal evacuation route',
    owner:        'Cmdr. R. K. Verma',
    priority:     'CRITICAL',
    addedBy:      'Dr. Suresh Mohapatra',
    addedByRole:  ROLES.STATE_AUTHORITY,
  });

  const c1c = addAction(c1b, {
    title:        'Activate all 8 designated shelters in coastal zone',
    owner:        'Priyadarshini Sahoo (IAS)',
    priority:     'CRITICAL',
    addedBy:      'Dr. Suresh Mohapatra',
    addedByRole:  ROLES.STATE_AUTHORITY,
  });

  const c1final = addAction(c1c, {
    title:        'Issue public warning broadcast via ASDMA channels',
    owner:        'SEOC Communication Cell',
    priority:     'HIGH',
    addedBy:      'Dr. Suresh Mohapatra',
    addedByRole:  ROLES.STATE_AUTHORITY,
  });

  incidents.push({ ...c1final, status: 'IN_PROGRESS', escalationLevel: 2, escalationReason: 'Cyclone intensified to ESCS category; landfall in < 6h' });

  // 2. Flash flood — Cuttack North
  const f1 = createIncident({
    title:            'Flash Flood — Cuttack North / Mahanadi Breach',
    description:      'Hirakud Dam releases increased to 8 lakh cusecs. Mahanadi river level rising rapidly. Low-lying areas under immediate flood threat. 12 villages cut off.',
    incidentType:     'FLOOD',
    hazardType:       'FLOOD',
    severity:         'HIGH',
    locationName:     'Cuttack North, Odisha',
    coordinates:      [85.883, 20.481],
    affectedArea:     'North Cuttack flood plain',
    source:           'ACTIVE_ALERT',
    sourceReference:  'al-flood-cuttack',
    dataLabel:        'LIVE_UPDATED',
    createdBy:        'Priyadarshini Sahoo (IAS)',
    createdByRole:    ROLES.DISTRICT_AUTHORITY,
    affectedPopulation: 85000,
    relatedAlertIds:  ['al-flood-cuttack'],
  });

  const f1a = assignTeam(f1, {
    team:           'RESCUE',
    officer:        'Lt. Arun Dash',
    assignedBy:     'Priyadarshini Sahoo (IAS)',
    assignedByRole: ROLES.DISTRICT_AUTHORITY,
  });

  const f1b = addAction(f1a, {
    title:        'Deploy rescue boats to Badambadi and Choudwar',
    owner:        'Lt. Arun Dash',
    priority:     'HIGH',
    addedBy:      'Priyadarshini Sahoo (IAS)',
    addedByRole:  ROLES.DISTRICT_AUTHORITY,
  });

  const f1final = addAction(f1b, {
    title:        'Verify road NH-55 bypass alternate route',
    owner:        'Road Clearance Unit',
    priority:     'HIGH',
    addedBy:      'Priyadarshini Sahoo (IAS)',
    addedByRole:  ROLES.DISTRICT_AUTHORITY,
  });

  incidents.push({ ...f1final, status: 'IN_PROGRESS' });

  // 3. Road blockage — field report derived
  const r1 = createIncident({
    title:            'NH-16 Bypass Partial Blockage — Flood Debris',
    description:      'Citizen report confirmed: NH-16 bypass partially blocked by flood debris at km marker 124. Alternative routing via SH-17 possible but degraded.',
    incidentType:     'ROAD_BLOCKAGE',
    hazardType:       'FLOOD',
    severity:         'MEDIUM',
    locationName:     'NH-16 Bypass, Bhubaneswar',
    coordinates:      [85.79, 20.27],
    source:           'CITIZEN_REPORT',
    sourceReference:  'cr-003',
    dataLabel:        'CITIZEN_REPORT',
    createdBy:        'B. K. Pradhan (BDO)',
    createdByRole:    ROLES.BLOCK_AUTHORITY,
    relatedReportIds: ['cr-003'],
  });

  const r1a = assignTeam(r1, {
    team:           'ROAD_CLEARANCE',
    officer:        'Er. Deepak Nayak',
    assignedBy:     'B. K. Pradhan (BDO)',
    assignedByRole: ROLES.BLOCK_AUTHORITY,
  });

  const r1final = addAction(r1a, {
    title:        'Inspect and clear debris; install diversion sign',
    owner:        'Er. Deepak Nayak',
    priority:     'MEDIUM',
    addedBy:      'B. K. Pradhan (BDO)',
    addedByRole:  ROLES.BLOCK_AUTHORITY,
  });

  incidents.push({ ...r1final, status: 'ASSIGNED' });

  // 4. Shelter overload — Kendrapara
  const s1 = createIncident({
    title:            'Shelter Capacity Overload — Kendrapara Zone',
    description:      'All 5 designated shelters in Kendrapara coastal zone above 90% capacity. Estimated 2,800 additional evacuees en route. Additional temporary shelter space required.',
    incidentType:     'SHELTER_OVERLOAD',
    hazardType:       'CYCLONE',
    severity:         'HIGH',
    locationName:     'Kendrapara District, Odisha',
    coordinates:      [86.4214, 20.5012],
    source:           'SHELTER_PRESSURE',
    dataLabel:        'SYSTEM_GENERATED',
    createdBy:        'System',
    createdByRole:    ROLES.STATE_AUTHORITY,
    affectedPopulation: 12000,
    relatedAlertIds:  ['al-flood-kendrapara'],
    relatedShelterIds: ['sh-kendrapara-1', 'sh-kendrapara-2'],
  });

  const s1final = addAction(s1, {
    title:        'Activate Kendrapara High School as overflow shelter',
    owner:        'District Shelter Coordinator',
    priority:     'HIGH',
    addedBy:      'System',
    addedByRole:  ROLES.STATE_AUTHORITY,
  });

  incidents.push({ ...s1final, status: 'TRIAGED' });

  // 5. Medical emergency — Visakhapatnam
  const m1 = createIncident({
    title:            'Medical Emergency — Flood Injury Cases, Visakhapatnam',
    description:      'Urban flooding reported in Visakhapatnam low-lying zones. Hospital access road waterlogged. 14 injury cases reported requiring medical transport.',
    incidentType:     'MEDICAL_EMERGENCY',
    hazardType:       'FLOOD',
    severity:         'HIGH',
    locationName:     'Visakhapatnam, Andhra Pradesh',
    coordinates:      [83.301, 17.6868],
    source:           'CITIZEN_REPORT',
    dataLabel:        'CITIZEN_REPORT',
    createdBy:        'System',
    createdByRole:    ROLES.STATE_AUTHORITY,
    affectedPopulation: 4200,
    relatedAlertIds:  ['al-flood-vizag'],
  });

  const m1a = assignTeam(m1, {
    team:           'MEDICAL',
    officer:        'Dr. Priya Raman',
    assignedBy:     'System',
    assignedByRole: ROLES.STATE_AUTHORITY,
  });

  incidents.push({ ...m1a, status: 'ASSIGNED' });

  // 6. Resolved incident
  const rv1 = createIncident({
    title:            'Lightning Strike Infrastructure Damage — Bhubaneswar Substation',
    description:      'Lightning strike caused partial power outage at Mancheswar substation. Crew deployed and restored within 3h.',
    incidentType:     'INFRASTRUCTURE_DAMAGE',
    hazardType:       'LIGHTNING',
    severity:         'MEDIUM',
    locationName:     'Mancheswar, Bhubaneswar',
    coordinates:      [85.831, 20.296],
    source:           'ACTIVE_ALERT',
    sourceReference:  'al-lightning-bhubaneswar',
    dataLabel:        'VERIFIED',
    createdBy:        'System',
    createdByRole:    ROLES.STATE_AUTHORITY,
    relatedAlertIds:  ['al-lightning-bhubaneswar'],
  });

  const now = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  incidents.push({
    ...rv1,
    status:     'RESOLVED',
    resolvedAt: now,
    updatedAt:  now,
    createdAt:  new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  });

  return incidents;
}

// ── Singleton stores — strictly separated ───────────────────────────────────────
import type { AppEnvironment } from '@/lib/env';

let _realIncidentsStore: Incident[] = [];
let _demoIncidentsStore: Incident[] = seedIncidents();

export function getIncidents(env: AppEnvironment = 'REAL'): Incident[] {
  return env === 'DEMO' ? _demoIncidentsStore : _realIncidentsStore;
}

export function getIncident(id: string, env: AppEnvironment = 'REAL'): Incident | undefined {
  const store = env === 'DEMO' ? _demoIncidentsStore : _realIncidentsStore;
  return store.find((i) => i.id === id);
}

export function saveIncident(incident: Incident, env: AppEnvironment = 'REAL'): void {
  if (env === 'DEMO') {
    const idx = _demoIncidentsStore.findIndex((i) => i.id === incident.id);
    if (idx >= 0) {
      _demoIncidentsStore = [..._demoIncidentsStore.slice(0, idx), incident, ..._demoIncidentsStore.slice(idx + 1)];
    } else {
      _demoIncidentsStore = [incident, ..._demoIncidentsStore];
    }
  } else {
    const idx = _realIncidentsStore.findIndex((i) => i.id === incident.id);
    if (idx >= 0) {
      _realIncidentsStore = [..._realIncidentsStore.slice(0, idx), incident, ..._realIncidentsStore.slice(idx + 1)];
    } else {
      _realIncidentsStore = [incident, ..._realIncidentsStore];
    }
    // Register real geographic region dynamically
    try {
      const { registerRealOperationalLocation, parseLocationFromText } = require('@/lib/geo');
      const parsed = parseLocationFromText(incident.affectedArea || incident.locationName);
      registerRealOperationalLocation({
        district: parsed.district,
        state: parsed.state,
        coordinates: incident.coordinates || [85.0, 20.0],
        locality: incident.locationName,
        source: 'INCIDENT',
        environment: 'REAL',
      });
    } catch {
      // ignore
    }
  }
}

export function getKPIs(env: AppEnvironment = 'REAL') {
  const store = env === 'DEMO' ? _demoIncidentsStore : _realIncidentsStore;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    active:      store.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length,
    critical:    store.filter((i) => i.severity === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(i.status)).length,
    unassigned:  store.filter((i) => !i.assignedTeam && !['RESOLVED', 'CLOSED'].includes(i.status)).length,
    inProgress:  store.filter((i) => i.status === 'IN_PROGRESS').length,
    escalated:   store.filter((i) => i.status === 'ESCALATED').length,
    resolvedToday: store.filter((i) => {
      if (!i.resolvedAt) return false;
      return new Date(i.resolvedAt) >= today;
    }).length,
  };
}

export function _resetRealIncidentsForTesting(): void {
  _realIncidentsStore = [];
}

