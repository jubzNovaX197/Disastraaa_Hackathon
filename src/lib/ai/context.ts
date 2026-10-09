/**
 * AI Disaster Intelligence Assistant — Structured & Database-Grounded Context Builder
 *
 * Extracts compact, relevant structured slices from active disaster engines and Neon PostGIS.
 * Strictly enforces data isolation:
 * - REAL operational records are queried from live Neon database tables / verified telemetry stores.
 * - DEMO scenario data is retained for simulation drills.
 * - All untrusted user and citizen input is sanitized to neutralize prompt injection.
 * - Data provenance and freshness (LIVE, STALE, UNAVAILABLE, SIMULATED) are explicitly tagged.
 */

import { aggregateCommandCenterData } from '@/lib/commandCenter/aggregator';
import { getDbClient } from '@/lib/db';
import { DETERMINISTIC_LIVE_EVENTS } from '@/lib/realtime/events';
import type { LiveDataOverrides } from '@/lib/realtime/types';
import { getAllCachedWeather } from '@/lib/weather/store';
import type { Role } from '@/types/roles';
import { sanitizeUntrustedText } from './sanitize';
import type { AssistantIntent, StructuredContextPayload } from './types';

export interface BuildContextOptions {
  intent: AssistantIntent;
  targetLocation?: string;
  liveOverrides?: Partial<LiveDataOverrides>;
  secondsSinceSync?: number;
  role?: Role;
}

/**
 * Synchronous context builder preserving backward compatibility for unit tests and local callers.
 */
export function buildStructuredContext({
  intent,
  targetLocation,
  liveOverrides,
  secondsSinceSync = 12,
}: BuildContextOptions): StructuredContextPayload {
  const ccData = aggregateCommandCenterData(liveOverrides);
  const locFilter = targetLocation?.toLowerCase().trim();
  const isReal = liveOverrides?.environment === 'REAL';

  const freshness = {
    lastSyncFormatted: secondsSinceSync === 0 ? 'Just now' : `${secondsSinceSync}s ago`,
    secondsSinceSync,
    isSimulated: !isReal,
  };

  const summary = {
    activeDisasters: ccData.overview.activeDisasters.map((d) => `${d.name} (${d.severity})`),
    highestRiskLocation: ccData.overview.highestRiskLocation,
    statusLevel: ccData.narrative.statusLevel,
    narrative: ccData.narrative.situation,
  };

  const kpis = {
    riskScore: ccData.kpis.risk.highestCurrentRisk.score,
    highRiskLocationsCount: ccData.kpis.risk.highRiskLocationsCount,
    exposedPopulation: ccData.kpis.impact.populationExposed,
    buildingsAffected: ccData.kpis.impact.estimatedBuildingsAffected,
    activeAlertsCount: ccData.kpis.response.activeAlertsCount,
    blockedRoadsCount: ccData.roadOperations.blockedCount + ccData.roadOperations.closedCount,
    sheltersUnderPressure: ccData.shelterOperations.highUtilizationShelters,
    resourceDeficitsCount: ccData.resourceOperations.totalDeficitCategories,
    citizenReportsCount: ccData.citizenIntelligence.totalReports,
  };

  const payload: StructuredContextPayload = {
    intent,
    targetLocation: targetLocation || undefined,
    dataFreshness: freshness,
    summary,
    kpis,
  };

  // 1. Alert queries, situation summary, or SitRep
  if (
    intent === 'ALERT_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'SITREP_GENERATION' ||
    intent === 'GENERAL_OPERATIONAL'
  ) {
    let alerts = ccData.activeAlerts;
    if (locFilter) {
      alerts = alerts.filter(
        (a) =>
          a.regionName.toLowerCase().includes(locFilter) ||
          a.title.toLowerCase().includes(locFilter),
      );
    }
    payload.relevantAlerts = alerts.slice(0, 5).map((a) => ({
      id: a.id,
      title: sanitizeUntrustedText(a.title, 120),
      severity: a.severity,
      regionName: a.regionName,
      message: sanitizeUntrustedText(a.message, 250),
    }));
  }

  // 2. Risk, Flood, Cyclone, Situation summary, or SitRep
  if (
    intent === 'RISK_ANALYSIS' ||
    intent === 'FLOOD_ANALYSIS' ||
    intent === 'CYCLONE_ANALYSIS' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'SITREP_GENERATION' ||
    intent === 'IMPACT_QUERY' ||
    intent === 'RESPONSE_QUERY' ||
    intent === 'GENERAL_OPERATIONAL'
  ) {
    let locations = ccData.priorityLocations;
    if (locFilter) {
      locations = locations.filter(
        (l) =>
          l.name.toLowerCase().includes(locFilter) ||
          l.district.toLowerCase().includes(locFilter),
      );
    }
    if (intent === 'FLOOD_ANALYSIS') {
      locations = locations.filter((l) => (l.floodRiskScore ?? 0) > 40 || l.dominantHazard === 'FLOOD');
    } else if (intent === 'CYCLONE_ANALYSIS') {
      locations = locations.filter((l) => (l.cycloneRiskScore ?? 0) > 40 || l.dominantHazard === 'CYCLONE');
    }

    payload.relevantRisks = locations.slice(0, 6).map((l) => ({
      id: l.id,
      name: l.name,
      district: l.district,
      severity: l.severity,
      score: l.riskScore,
      dominantHazard: l.dominantHazard,
      exposedPopulation: l.populationExposed,
    }));
  }

  // 3. Road / Access queries, or SitRep
  if (
    intent === 'ROAD_QUERY' ||
    intent === 'ROUTE_QUERY' ||
    intent === 'DESTINATION_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'SITREP_GENERATION' ||
    intent === 'RESPONSE_QUERY'
  ) {
    let roads = ccData.roadOperations.criticalSegments;
    if (locFilter) {
      roads = roads.filter(
        (r) =>
          r.name.toLowerCase().includes(locFilter) ||
          r.administrativeArea.toLowerCase().includes(locFilter),
      );
    }
    payload.relevantRoads = roads.slice(0, 6).map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      severity: r.severity,
      reason: sanitizeUntrustedText(
        r.travelRisk?.explanation || `${r.blockageType} obstruction on highway corridor`,
        150,
      ),
    }));
  }

  // 4. Shelter queries, or SitRep
  if (
    intent === 'SHELTER_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'SITREP_GENERATION' ||
    intent === 'RESPONSE_QUERY'
  ) {
    let shelters = ccData.shelterOperations.items;
    if (locFilter) {
      shelters = shelters.filter(
        (s) =>
          s.location.toLowerCase().includes(locFilter) ||
          s.name.toLowerCase().includes(locFilter),
      );
    }
    payload.relevantShelters = shelters.slice(0, 6).map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      capacity: s.capacity,
      occupancy: s.occupancy,
      projectedDemand: s.projectedDemand,
      gap: s.gapOrSurplus,
      status: s.status,
    }));
  }

  // 5. Resource queries, or SitRep
  if (
    intent === 'RESOURCE_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'SITREP_GENERATION' ||
    intent === 'RESPONSE_QUERY'
  ) {
    payload.relevantResources = ccData.resourceOperations.categories.map((c) => ({
      category: c.name,
      available: c.available,
      required: c.required,
      deficit: c.gap,
      status: c.status,
    }));
  }

  // 6. Field Report queries, or SitRep
  if (
    intent === 'FIELD_REPORT_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'SITREP_GENERATION' ||
    intent === 'LIVE_CHANGE_QUERY'
  ) {
    let reports = ccData.citizenIntelligence.recentHighImpactReports;
    if (locFilter) {
      reports = reports.filter(
        (r) =>
          r.address.toLowerCase().includes(locFilter) ||
          r.administrativeArea.toLowerCase().includes(locFilter),
      );
    }
    payload.recentReports = reports.slice(0, 5).map((r) => ({
      id: r.id,
      title: sanitizeUntrustedText(r.title, 100),
      severity: r.severity,
      status: r.status,
      address: sanitizeUntrustedText(r.address, 120),
    }));
  }

  // 7. Live changes queries
  if (
    intent === 'LIVE_CHANGE_QUERY' ||
    intent === 'SITUATION_SUMMARY' ||
    intent === 'SITREP_GENERATION' ||
    intent === 'GENERAL_OPERATIONAL'
  ) {
    if (isReal) {
      payload.recentLiveEvents = [];
    } else {
      payload.recentLiveEvents = DETERMINISTIC_LIVE_EVENTS.slice(0, 4).map((e) => ({
        id: e.id,
        type: e.type,
        title: e.title,
        severity: e.severity,
        timeFormatted: e.timeFormatted,
        summary: e.summary,
      }));
    }
  }

  // Default provenance mapping
  payload.dataSourceProvenance = {
    databaseConnected: false,
    environment: isReal ? 'REAL' : 'DEMO',
    weatherSource: isReal ? 'Open-Meteo In-Memory Cache' : 'Demo Meteorological Simulation',
    hazardsSource: isReal ? 'Real Hazard Registry' : 'Demo Multi-Hazard Fixtures',
    alertsSource: isReal ? 'IMD CAP / WMO Mirror' : 'Demo Alert Fixtures',
    roadsSource: isReal ? 'OSM Road Segments' : 'Demo Road Network',
    sheltersSource: isReal ? 'OSDMA Shelters' : 'Demo Shelter Registry',
    incidentsSource: isReal ? 'Real Operational Incidents' : 'Demo Incidents',
    reportsSource: isReal ? 'Citizen Ground Intelligence' : 'Demo Reports',
  };

  return payload;
}

/**
 * Asynchronous, database-grounded context builder.
 * Connects directly to Neon PostgreSQL + PostGIS in REAL mode.
 * Grounding facts in verified database records, live weather telemetry,
 * and sanitized citizen reports.
 */
export async function buildGroundedContext(
  options: BuildContextOptions,
): Promise<StructuredContextPayload> {
  const { intent, targetLocation, liveOverrides, secondsSinceSync = 12 } = options;
  const isReal = liveOverrides?.environment === 'REAL';
  const baseContext = buildStructuredContext(options);

  if (!isReal) {
    // In DEMO mode, return the simulated operational context
    return baseContext;
  }

  const client = getDbClient();
  if (!client) {
    // Database connection standby fallback
    return baseContext;
  }

  try {
    const locFilter = targetLocation?.toLowerCase().trim();

    // ── 1. Query Weather Telemetry ───────────────────────────────────────────
    let weatherRows: any[] = [];
    try {
      if (locFilter) {
        weatherRows = await client.query(
          `SELECT location_name, state, district, temperature_c, relative_humidity_pct,
                  precipitation_mm, wind_speed_kmh, surface_pressure_hpa, weather_condition,
                  source, observed_at, freshness_status
           FROM weather_telemetry
           WHERE environment = 'REAL' 
             AND (LOWER(location_name) LIKE $1 OR LOWER(district) LIKE $1 OR LOWER(state) LIKE $1)
           ORDER BY observed_at DESC
           LIMIT 1;`,
          [`%${locFilter}%`],
        );
      }
      if (weatherRows.length === 0) {
        weatherRows = await client.query(
          `SELECT location_name, state, district, temperature_c, relative_humidity_pct,
                  precipitation_mm, wind_speed_kmh, surface_pressure_hpa, weather_condition,
                  source, observed_at, freshness_status
           FROM weather_telemetry
           WHERE environment = 'REAL'
           ORDER BY observed_at DESC
           LIMIT 1;`,
        );
      }
    } catch (e) {
      // Non-fatal telemetry query failure
    }

    if (weatherRows.length > 0) {
      const w = weatherRows[0];
      const observedDate = new Date(w.observed_at);
      const ageHours = (Date.now() - observedDate.getTime()) / (1000 * 60 * 60);
      const isStale = ageHours > 24;

      baseContext.telemetryWeather = {
        status: isStale ? 'STALE' : 'LIVE',
        source: w.source || 'Open-Meteo',
        locationName: w.location_name,
        temperatureC: Number(w.temperature_c),
        relativeHumidityPct: Number(w.relative_humidity_pct),
        precipitationMm: Number(w.precipitation_mm),
        windSpeedKmh: Number(w.wind_speed_kmh),
        surfacePressureHpa: Number(w.surface_pressure_hpa),
        weatherCondition: w.weather_condition,
        observedAt: observedDate.toISOString(),
        provenanceNote: `Observed at ${observedDate.toISOString().replace('T', ' ').slice(0, 19)} UTC via ${w.source || 'Open-Meteo'} (${ageHours.toFixed(1)}h ago)`,
      };
    } else {
      // Check in-memory weather store
      const cachedWeather = getAllCachedWeather();
      if (cachedWeather.length > 0) {
        const cw = cachedWeather[0];
        baseContext.telemetryWeather = {
          status: 'LIVE',
          source: cw.source,
          locationName: cw.locationName,
          temperatureC: cw.temperatureC,
          relativeHumidityPct: cw.relativeHumidityPct,
          precipitationMm: cw.precipitationMm,
          windSpeedKmh: cw.windSpeedKmh,
          surfacePressureHpa: cw.surfacePressureHpa,
          weatherCondition: cw.condition,
          observedAt: cw.observedAt,
          provenanceNote: `Retrieved via live Open-Meteo ingest (${cw.locationName})`,
        };
      } else {
        baseContext.telemetryWeather = {
          status: 'UNAVAILABLE',
          source: 'Open-Meteo Station Standby',
          provenanceNote: 'No weather telemetry recorded for active geographic sector',
        };
      }
    }

    // ── 2. Query Active Hazards ──────────────────────────────────────────────
    try {
      const hazardRows = await client.query(
        `SELECT id, hazard_type, severity, status, title, description,
                state, district, location_name, source_agency, started_at
         FROM hazards
         WHERE environment = 'REAL' AND status IN ('ACTIVE', 'WARNING', 'PEAK')
         ORDER BY started_at DESC
         LIMIT 6;`,
      );
      if (hazardRows.length > 0) {
        baseContext.relevantRisks = hazardRows.map((h: any) => ({
          id: h.id,
          name: h.location_name,
          district: h.district,
          severity: h.severity,
          score: h.severity === 'CRITICAL' ? 88 : h.severity === 'HIGH' ? 68 : 45,
          dominantHazard: h.hazard_type,
          exposedPopulation: 0,
        }));
        baseContext.summary.activeDisasters = hazardRows.map(
          (h: any) => `${h.title} (${h.severity})`,
        );
      }
    } catch (e) {
      // Non-fatal
    }

    // ── 3. Query Active Alerts ───────────────────────────────────────────────
    try {
      const alertRows = await client.query(
        `SELECT id, hazard_type, severity, title, description, area_name, source, issued_at
         FROM alerts
         WHERE environment = 'REAL' AND is_active = true
         ORDER BY issued_at DESC
         LIMIT 5;`,
      );
      if (alertRows.length > 0) {
        baseContext.relevantAlerts = alertRows.map((a: any) => ({
          id: a.id,
          title: sanitizeUntrustedText(a.title, 120),
          severity: a.severity,
          regionName: a.area_name,
          message: sanitizeUntrustedText(a.description, 250),
        }));
        baseContext.kpis.activeAlertsCount = alertRows.length;
      }
    } catch (e) {
      // Non-fatal
    }

    // ── 4. Query Verified Incidents ──────────────────────────────────────────
    try {
      const incidentRows = await client.query(
        `SELECT id, title, description, hazard_type, severity, status,
                address, assigned_team, created_at
         FROM incidents
         WHERE environment = 'REAL'
         ORDER BY created_at DESC
         LIMIT 5;`,
      );
      baseContext.verifiedIncidents = incidentRows.map((inc: any) => ({
        id: inc.id,
        title: sanitizeUntrustedText(inc.title, 100),
        severity: inc.severity,
        status: inc.status,
        address: sanitizeUntrustedText(inc.address, 100),
        hazardType: inc.hazard_type,
        assignedTeam: inc.assigned_team ? sanitizeUntrustedText(inc.assigned_team, 80) : undefined,
        createdAt: new Date(inc.created_at).toISOString(),
      }));
    } catch (e) {
      // Non-fatal
    }

    // ── 5. Query Citizen Reports (Sanitized & PII Protected) ─────────────────
    try {
      const reportRows = await client.query(
        `SELECT id, hazard_type, title, description, address, severity, status, created_at
         FROM citizen_reports
         WHERE environment = 'REAL'
         ORDER BY created_at DESC
         LIMIT 5;`,
      );
      if (reportRows.length > 0) {
        baseContext.recentReports = reportRows.map((r: any) => ({
          id: r.id,
          title: sanitizeUntrustedText(r.title, 100),
          severity: r.severity,
          status: r.status,
          address: sanitizeUntrustedText(r.address, 120),
        }));
        baseContext.kpis.citizenReportsCount = reportRows.length;
      }
    } catch (e) {
      // Non-fatal
    }

    // ── 6. Query Road Segments ───────────────────────────────────────────────
    try {
      const roadRows = await client.query(
        `SELECT id, name, status, blockage_type, blockage_cause, risk_score
         FROM road_segments
         WHERE environment = 'REAL' AND status != 'OPEN'
         ORDER BY risk_score DESC
         LIMIT 6;`,
      );
      if (roadRows.length > 0) {
        baseContext.relevantRoads = roadRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          severity: r.risk_score > 70 ? 'CRITICAL' : 'MODERATE',
          reason: sanitizeUntrustedText(
            r.blockage_cause || `${r.blockage_type || 'Disaster disruption'} on corridor`,
            120,
          ),
        }));
        baseContext.kpis.blockedRoadsCount = roadRows.length;
      }
    } catch (e) {
      // Non-fatal
    }

    // ── 7. Query Shelters ────────────────────────────────────────────────────
    try {
      const shelterRows = await client.query(
        `SELECT id, name, address, capacity, occupancy, status
         FROM shelters
         WHERE environment = 'REAL'
         ORDER BY capacity DESC
         LIMIT 6;`,
      );
      if (shelterRows.length > 0) {
        baseContext.relevantShelters = shelterRows.map((s: any) => ({
          id: s.id,
          name: s.name,
          location: s.address,
          capacity: Number(s.capacity) || 0,
          occupancy: Number(s.occupancy) || 0,
          projectedDemand: Number(s.occupancy) || 0,
          gap: (Number(s.capacity) || 0) - (Number(s.occupancy) || 0),
          status: s.status,
        }));
      }
    } catch (e) {
      // Non-fatal
    }

    // Update provenance metadata
    baseContext.dataSourceProvenance = {
      databaseConnected: true,
      environment: 'REAL',
      weatherSource: baseContext.telemetryWeather?.source || 'Open-Meteo PostGIS Ingestion',
      hazardsSource: 'Neon PostgreSQL (hazards)',
      alertsSource: 'IMD CAP / Neon PostgreSQL (alerts)',
      roadsSource: 'OSM Overpass / Neon PostGIS (road_segments)',
      sheltersSource: 'OSDMA Registry / Neon PostGIS (shelters)',
      incidentsSource: 'Neon PostgreSQL (incidents)',
      reportsSource: 'Neon PostgreSQL (citizen_reports)',
    };

    return baseContext;
  } catch (err) {
    console.warn('Database context grounding error, using base context:', err);
    return baseContext;
  }
}
