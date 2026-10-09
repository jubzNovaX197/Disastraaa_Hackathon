import { NextRequest, NextResponse } from 'next/server';
import { resolveServerEnvironment } from '@/lib/env';
import { executeQuery, getDbClient } from '@/lib/db';
import { demoDataset } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoRoadSegments } from '@/data/demo';
import { getIncidents } from '@/lib/incidents';
import { parseLocationFromText } from '@/lib/geo/regions';

/**
 * GET /api/stats
 *
 * Grounded operations statistics endpoint.
 * Returns only genuine database-backed metrics in REAL mode without simulating values.
 *
 * Query params:
 *   - env: 'REAL' | 'DEMO'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEnv = searchParams.get('env');

    const environment =
      requestedEnv === 'REAL' || requestedEnv === 'DEMO'
        ? requestedEnv
        : await resolveServerEnvironment();

    if (environment === 'DEMO') {
      const demoInc = getIncidents('DEMO');
      const activeAlerts = demoDataset.alerts.filter((a) => a.isActive);
      const totalShelterCapacity = demoDataset.shelters.reduce((acc, s) => acc + s.capacity, 0);
      const totalShelterOccupancy = demoDataset.shelters.reduce((acc, s) => acc + s.occupancy, 0);
      const blockedRoads = demoRoadSegments.filter((r) => r.status === 'BLOCKED' || r.status === 'CLOSED');

      return NextResponse.json({
        success: true,
        environment: 'DEMO',
        databaseConnected: false,
        stats: {
          alerts: {
            active: activeAlerts.length,
            totalPersisted: demoDataset.alerts.length,
            status: 'SIMULATED_SCENARIO',
          },
          shelters: {
            count: demoDataset.shelters.length,
            verifiedCapacity: totalShelterCapacity,
            totalOccupancy: totalShelterOccupancy,
            status: 'SIMULATED_SCENARIO',
          },
          reports: {
            total: demoCitizenReports.length,
            verified: demoCitizenReports.filter((r) => r.status === 'VERIFIED').length,
            pending: demoCitizenReports.filter((r) => r.status === 'PENDING').length,
            status: 'SIMULATED_SCENARIO',
          },
          incidents: {
            total: demoInc.length,
            active: demoInc.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length,
            status: 'SIMULATED_SCENARIO',
          },
          roads: {
            monitoredCount: demoRoadSegments.length,
            monitoredKm: Math.round(demoRoadSegments.reduce((acc, r) => acc + (r.lengthKm || 0), 0) * 10) / 10,
            blockedCount: blockedRoads.length,
            blockedKm: Math.round(blockedRoads.reduce((acc, r) => acc + (r.lengthKm || 0), 0) * 10) / 10,
            status: 'SIMULATED_SCENARIO',
          },
          regions: {
            persistedInDatabase: 0,
            simulatedCount: 6,
          },
          latestWeather: {
            locationName: 'Puri Coastal Belt & Town',
            district: 'Puri',
            temperatureC: 28.5,
            windSpeedKmh: 145,
            precipitationMm: 180,
            condition: 'Severe Cyclonic Storm',
            observedAt: new Date().toISOString(),
            freshness: 'SIMULATED',
            source: 'Scenario Engine Simulator',
          },
        },
        provenance: {
          source: 'Simulated Scenario Telemetry (DEMO Isolation)',
          queriedAt: new Date().toISOString(),
        },
      });
    }

    // ── REAL Mode: Database Grounded Aggregation ──────────────────────────────
    const client = getDbClient();
    if (!client) {
      return NextResponse.json({
        success: true,
        environment: 'REAL',
        databaseConnected: false,
        stats: {
          alerts: { active: 0, totalPersisted: 0, status: 'UNAVAILABLE' },
          shelters: { count: 0, verifiedCapacity: 0, totalOccupancy: 0, status: 'UNAVAILABLE' },
          reports: { total: 0, verified: 0, pending: 0, status: 'UNAVAILABLE' },
          incidents: { total: 0, active: 0, status: 'UNAVAILABLE' },
          roads: { monitoredCount: 0, monitoredKm: 0, blockedCount: 0, blockedKm: 0, status: 'UNAVAILABLE' },
          regions: { persistedInDatabase: 0 },
          latestWeather: null,
        },
        error: 'Database connection is not configured in current environment.',
        provenance: {
          source: 'In-Memory Standby',
          queriedAt: new Date().toISOString(),
        },
      });
    }

    const [aggRows, weatherRows] = await Promise.all([
      executeQuery<any>(`
        SELECT 
          (SELECT count(*)::int FROM alerts WHERE environment = 'REAL' AND is_active = TRUE) as active_alerts,
          (SELECT count(*)::int FROM alerts WHERE environment = 'REAL') as total_alerts,
          (SELECT count(*)::int FROM shelters WHERE environment = 'REAL') as shelter_count,
          (SELECT coalesce(sum(capacity), 0)::int FROM shelters WHERE environment = 'REAL') as verified_shelter_capacity,
          (SELECT coalesce(sum(occupancy), 0)::int FROM shelters WHERE environment = 'REAL') as total_shelter_occupancy,
          (SELECT count(*)::int FROM citizen_reports WHERE environment = 'REAL') as total_reports,
          (SELECT count(*)::int FROM citizen_reports WHERE environment = 'REAL' AND status = 'VERIFIED') as verified_reports,
          (SELECT count(*)::int FROM citizen_reports WHERE environment = 'REAL' AND status = 'PENDING') as pending_reports,
          (SELECT count(*)::int FROM incidents WHERE environment = 'REAL') as total_incidents,
          (SELECT count(*)::int FROM incidents WHERE environment = 'REAL' AND status NOT IN ('RESOLVED', 'CLOSED')) as active_incidents,
          (SELECT count(*)::int FROM road_segments WHERE environment = 'REAL') as monitored_roads_count,
          (SELECT coalesce(sum(length_km), 0)::numeric FROM road_segments WHERE environment = 'REAL') as monitored_roads_km,
          (SELECT count(*)::int FROM road_segments WHERE environment = 'REAL' AND (status = 'BLOCKED' OR status = 'CLOSED')) as blocked_roads_count,
          (SELECT coalesce(sum(length_km), 0)::numeric FROM road_segments WHERE environment = 'REAL' AND (status = 'BLOCKED' OR status = 'CLOSED')) as blocked_roads_km,
          (SELECT count(*)::int FROM regions WHERE environment = 'REAL') as registered_regions_count;
      `),
      executeQuery<any>(`
        SELECT location_name, state, district, temperature_c, wind_speed_kmh, surface_pressure_hpa, precipitation_mm, weather_condition, observed_at, freshness_status, source
        FROM weather_telemetry
        WHERE environment = 'REAL'
        ORDER BY observed_at DESC
        LIMIT 1;
      `),
    ]);

    const agg = aggRows[0] || {};
    const latestWeather = weatherRows[0] || null;

    const activeAlerts = Number(agg.active_alerts) || 0;
    const totalAlerts = Number(agg.total_alerts) || 0;
    const shelterCount = Number(agg.shelter_count) || 0;
    const verifiedShelterCapacity = Number(agg.verified_shelter_capacity) || 0;
    const totalShelterOccupancy = Number(agg.total_shelter_occupancy) || 0;
    const totalReports = Number(agg.total_reports) || 0;
    const verifiedReports = Number(agg.verified_reports) || 0;
    const pendingReports = Number(agg.pending_reports) || 0;
    const totalIncidents = Number(agg.total_incidents) || 0;
    const activeIncidents = Number(agg.active_incidents) || 0;
    const monitoredRoadsCount = Number(agg.monitored_roads_count) || 0;
    const monitoredRoadsKm = Math.round((Number(agg.monitored_roads_km) || 0) * 10) / 10;
    const blockedRoadsCount = Number(agg.blocked_roads_count) || 0;
    const blockedRoadsKm = Math.round((Number(agg.blocked_roads_km) || 0) * 10) / 10;
    const registeredRegions = Number(agg.registered_regions_count) || 0;

    return NextResponse.json({
      success: true,
      environment: 'REAL',
      databaseConnected: true,
      stats: {
        alerts: {
          active: activeAlerts,
          totalPersisted: totalAlerts,
          status: activeAlerts > 0 ? 'ACTIVE_WARNINGS' : 'ALL_CLEAR',
        },
        shelters: {
          count: shelterCount,
          verifiedCapacity: verifiedShelterCapacity,
          totalOccupancy: totalShelterOccupancy,
          status: shelterCount > 0 ? 'OPERATIONAL' : 'UNAVAILABLE',
        },
        reports: {
          total: totalReports,
          verified: verifiedReports,
          pending: pendingReports,
          status: totalReports > 0 ? 'MONITORED' : 'VERIFIED_ZERO',
        },
        incidents: {
          total: totalIncidents,
          active: activeIncidents,
          status: activeIncidents > 0 ? 'ACTIVE_DISPATCHES' : 'ALL_CLEAR',
        },
        roads: {
          monitoredCount: monitoredRoadsCount,
          monitoredKm: monitoredRoadsKm,
          blockedCount: blockedRoadsCount,
          blockedKm: blockedRoadsKm,
          status: blockedRoadsCount > 0 ? 'DISRUPTIONS_REPORTED' : 'PASSABLE',
        },
        regions: {
          persistedInDatabase: registeredRegions,
        },
        latestWeather: latestWeather
          ? (() => {
              const parsedGeo = parseLocationFromText(latestWeather.location_name, latestWeather.state || 'Odisha');
              return {
                locationName: latestWeather.location_name,
                state: latestWeather.state || parsedGeo.state,
                district: latestWeather.district || parsedGeo.district,
                temperatureC: Number(latestWeather.temperature_c),
                windSpeedKmh: Number(latestWeather.wind_speed_kmh),
                surfacePressureHpa: Number(latestWeather.surface_pressure_hpa),
                precipitationMm: Number(latestWeather.precipitation_mm),
                condition: latestWeather.weather_condition,
                observedAt: new Date(latestWeather.observed_at).toISOString(),
                freshness: latestWeather.freshness_status,
                source: latestWeather.source,
              };
            })()
          : null,
      },
      provenance: {
        source: 'Neon PostgreSQL + PostGIS (Production Database)',
        queriedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error computing statistics';
    console.error('[API/STATS] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
