/**
 * Incident Store — client-side in-memory incident state.
 *
 * Provides a React-compatible store with functional update helpers.
 * Future: replace with server actions + database without changing UI hooks.
 *
 * Seeded with realistic demo incidents using existing alert / report / road data.
 */

import { ROLES } from '@/types/roles';
import { addAction, assignTeam, createIncident } from './engine';
import type { Incident } from './types';

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
import { executeQuery } from '@/lib/db';
import type { AppEnvironment } from '@/lib/env';
import { parseLocationFromText, registerRealOperationalLocation } from '@/lib/geo/regions';

let _realIncidentsStore: Incident[] = [];
let _demoIncidentsStore: Incident[] = seedIncidents();

const VALID_HAZARDS = new Set([
  'CYCLONE',
  'FLOOD',
  'URBAN_FLOOD',
  'LANDSLIDE',
  'STORM_SURGE',
  'HEATWAVE',
  'LIGHTNING',
  'DROUGHT',
  'EARTHQUAKE',
  'MULTI_HAZARD',
]);

function mapDbSeverity(sev: string): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (sev === 'CRITICAL') return 'CRITICAL';
  if (sev === 'HIGH') return 'HIGH';
  if (sev === 'MEDIUM' || sev === 'MODERATE') return 'MODERATE';
  return 'LOW';
}

function mapDbStatus(st: string): 'NEW' | 'TRIAGED' | 'DISPATCHED' | 'ON_SCENE' | 'CONTAINED' | 'RESOLVED' | 'CLOSED' {
  if (st === 'ASSIGNED') return 'DISPATCHED';
  if (st === 'IN_PROGRESS') return 'ON_SCENE';
  if (st === 'ESCALATED') return 'TRIAGED';
  if (st === 'RESOLVED') return 'RESOLVED';
  if (st === 'CLOSED') return 'CLOSED';
  if (st === 'TRIAGED') return 'TRIAGED';
  return 'NEW';
}

async function persistIncidentToDatabase(incident: Incident): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const parsed = parseLocationFromText(incident.affectedArea || incident.locationName);
  const state = parsed.state || 'Odisha';
  const district = parsed.district || 'Khordha';

  const hazardType = VALID_HAZARDS.has(incident.hazardType) ? incident.hazardType : 'FLOOD';
  const dbSeverity = mapDbSeverity(incident.severity);
  const dbStatus = mapDbStatus(incident.status);

  const coords = incident.coordinates || [85.8245, 20.2961];
  const originReportId = incident.sourceReference || (incident.relatedReportIds && incident.relatedReportIds[0]) || null;

  await executeQuery(
    `INSERT INTO incidents (
      id, title, description, hazard_type, severity, status,
      state, district, address, coordinates, origin_report_id,
      assigned_team, command_notes, environment, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4::hazard_type_enum, $5::severity_enum, $6::incident_status_enum,
      $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326), $12,
      $13, $14, 'REAL'::data_environment_enum, $15, $16
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      assigned_team = EXCLUDED.assigned_team,
      updated_at = NOW();`,
    [
      incident.id,
      incident.title.slice(0, 255),
      incident.description,
      hazardType,
      dbSeverity,
      dbStatus,
      state.slice(0, 100),
      district.slice(0, 100),
      incident.locationName.slice(0, 500),
      coords[0],
      coords[1],
      originReportId,
      incident.assignedTeam || null,
      incident.actions?.length ? incident.actions[0].title : null,
      incident.createdAt || new Date().toISOString(),
      incident.updatedAt || new Date().toISOString(),
    ],
  );
}

export async function getPersistedIncidents(env: AppEnvironment = 'REAL'): Promise<Incident[]> {
  if (env === 'DEMO') {
    return _demoIncidentsStore;
  }

  if (process.env.DATABASE_URL) {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, title, description, hazard_type, severity, status,
                state, district, address,
                ST_X(coordinates) as lon, ST_Y(coordinates) as lat,
                origin_report_id, assigned_team, command_notes,
                created_at, updated_at
         FROM incidents
         WHERE environment = 'REAL'
         ORDER BY created_at DESC;`,
      );

      const mapped: Incident[] = rows.map((r) => {
        const lon = parseFloat(r.lon) || 0;
        const lat = parseFloat(r.lat) || 0;
        const mappedSeverity = r.severity === 'MODERATE' ? 'MEDIUM' : r.severity;
        const mappedStatus = r.status === 'DISPATCHED' ? 'ASSIGNED' : r.status === 'ON_SCENE' ? 'IN_PROGRESS' : r.status;

        const base = createIncident({
          title: r.title,
          description: r.description,
          incidentType: 'OTHER',
          hazardType: r.hazard_type,
          severity: mappedSeverity,
          locationName: r.address,
          coordinates: [lon, lat],
          affectedArea: `${r.district}, ${r.state}`,
          source: r.origin_report_id ? 'CITIZEN_REPORT' : 'MANUAL',
          sourceReference: r.origin_report_id || undefined,
          dataLabel: 'VERIFIED',
          createdBy: 'Operations Dispatcher',
          createdByRole: ROLES.DISTRICT_AUTHORITY,
          relatedReportIds: r.origin_report_id ? [r.origin_report_id] : [],
        });

        return {
          ...base,
          id: r.id,
          status: mappedStatus,
          assignedTeam: r.assigned_team || undefined,
          createdAt: new Date(r.created_at).toISOString(),
          updatedAt: new Date(r.updated_at).toISOString(),
        };
      });

      _realIncidentsStore = mapped;
      return mapped;
    } catch (err) {
      console.warn('[INCIDENTS/STORE] Failed to query persisted incidents from database:', err);
    }
  }

  return _realIncidentsStore;
}

export function getIncidents(env: AppEnvironment = 'REAL'): Incident[] {
  return env === 'DEMO' ? _demoIncidentsStore : _realIncidentsStore;
}

export function getIncident(id: string, env: AppEnvironment = 'REAL'): Incident | undefined {
  const store = env === 'DEMO' ? _demoIncidentsStore : _realIncidentsStore;
  return store.find((i) => i.id === id);
}

export async function saveIncident(incident: Incident, env: AppEnvironment = 'REAL'): Promise<void> {
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

    // Persist to Neon database
    try {
      await persistIncidentToDatabase(incident);
    } catch (err) {
      console.warn('[INCIDENTS/STORE] Database persistence error (falling back to memory):', err);
    }

    // Register real geographic region dynamically
    try {
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

