/**
 * OpenStreetMap Road Repository & PostGIS Persistence Store
 *
 * Manages normalized real OSM road segments.
 * Supports:
 * - In-memory high performance caching
 * - Neon PostgreSQL + PostGIS LineString persistence
 * - Real public OSM baseline initialization
 * - Live Overpass ingestion
 */

import { executeQuery } from '@/lib/db';
import { normalizeRoadSegment } from '@/lib/geo/osm/normalization';
import { overpassClient } from '@/lib/geo/osm/overpassClient';
import { getRealOsmSeedWays } from '@/lib/geo/osm/seedData';
import type { IngestionResult, OverpassElement, RoadIngestionOptions } from '@/lib/geo/osm/types';
import { validateRoadWay } from '@/lib/geo/osm/validation';
import type { RoadSegment } from './types';

export class OsmRoadStore {
  private cache: Map<string, RoadSegment> = new Map();
  private isInitialized = false;

  /**
   * Converts [[lon, lat], ...] coordinates to PostGIS WKT LineString:
   * e.g. "LINESTRING(85.83 20.29, 85.84 20.30)"
   */
  private toWktLineString(coords: Array<[number, number]>): string {
    const points = coords.map(([lon, lat]) => `${lon.toFixed(6)} ${lat.toFixed(6)}`).join(', ');
    return `LINESTRING(${points})`;
  }

  /**
   * Initializes store with real OSM operational baseline.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // 1. Try to load from PostGIS if database is connected
    if (process.env.DATABASE_URL) {
      try {
        const rows = await executeQuery<any>(
          `SELECT id, name, route_number, state, district,
                  ST_AsGeoJSON(path_line) as geojson,
                  length_km, status, risk_score, travel_minutes,
                  reported_at, updated_at
           FROM road_segments
           WHERE environment = 'REAL';`,
        );

        if (rows.length > 0) {
          for (const row of rows) {
            let coordinates: Array<[number, number]> = [];
            try {
              const parsed = JSON.parse(row.geojson);
              coordinates = parsed.coordinates || [];
            } catch {
              continue;
            }

            if (coordinates.length < 2) continue;

            const segment: RoadSegment = {
              id: row.id,
              name: row.name,
              code: row.route_number || undefined,
              roadType: 'MAJOR_ROAD',
              administrativeArea: `${row.district}, ${row.state}`,
              coordinates,
              status: row.status || 'OPEN',
              blockageType: 'UNKNOWN',
              severity: 'LOW',
              isVerified: false,
              source: 'OPEN_STREET_MAP',
              lastUpdated: row.updated_at || row.reported_at || new Date().toISOString(),
              relatedReportIds: [],
              hazardExposure: { primaryHazard: 'NONE', riskScore: row.risk_score || 0 },
              travelRisk: {
                score: row.risk_score || 5,
                severity: 'LOW',
                factors: ['PostGIS Operational Roadway Record'],
                explanation: 'Operational roadway active in geospatial database.',
                travelAdvice: 'Passable under current operational baseline.',
                safeToTravel: true,
              },
              authorityVerification: {
                isVerified: false,
                status: 'UNVERIFIED',
                notes: 'Loaded from PostGIS operational database.',
              },
              lengthKm: parseFloat(row.length_km) || 0,
              travelMinutes: row.travel_minutes || 10,
            };

            this.cache.set(segment.id, segment);
          }
        }
      } catch (dbErr) {
        // Fall back to seed elements
      }
    }

    // 2. Initialize and supplement from real public OSM seed ways for any missing segments
    const rawSeedElements = getRealOsmSeedWays();
    const newSegments: RoadSegment[] = [];
    if (Array.isArray(rawSeedElements) && rawSeedElements.length > 0) {
      for (const el of rawSeedElements as OverpassElement[]) {
        const validation = validateRoadWay(el);
        if (validation.valid && validation.road) {
          const segment = normalizeRoadSegment(validation.road);
          if (!this.cache.has(segment.id)) {
            this.cache.set(segment.id, segment);
            newSegments.push(segment);
          }
        }
      }

      // Persist newly added seed roads to PostGIS in parallel without blocking HTTP response
      if (process.env.DATABASE_URL && newSegments.length > 0) {
        this.persistBatchToDatabase(newSegments).catch((err) => {
          console.warn('[ROADS] Background DB persistence:', err?.message);
        });
      }
    }

    this.isInitialized = true;
  }

  /**
   * Persists a batch of road segments into Neon PostgreSQL + PostGIS concurrently.
   */
  private async persistBatchToDatabase(segments: RoadSegment[]): Promise<void> {
    if (!process.env.DATABASE_URL || segments.length === 0) return;

    const queries = segments.map(async (seg) => {
      if (seg.coordinates.length < 2) return;

      const wkt = this.toWktLineString(seg.coordinates);
      const [startLon, startLat] = seg.coordinates[0];
      const [endLon, endLat] = seg.coordinates[seg.coordinates.length - 1];
      const areaParts = seg.administrativeArea.split(',');
      const district = areaParts[0]?.trim() || 'Khordha';
      const state = areaParts[1]?.trim() || 'Odisha';

      try {
        await executeQuery(
          `INSERT INTO road_segments (
            id, name, route_number, state, district,
            path_line, start_point, end_point,
            length_km, status, blockage_type, blockage_cause,
            risk_score, travel_minutes, reported_at, environment, updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5,
            ST_GeomFromText($6, 4326),
            ST_SetSRID(ST_MakePoint($7, $8), 4326),
            ST_SetSRID(ST_MakePoint($9, $10), 4326),
            $11, $12::road_status_enum, $13, $14,
            $15, $16, $17, 'REAL', NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            path_line = EXCLUDED.path_line,
            start_point = EXCLUDED.start_point,
            end_point = EXCLUDED.end_point,
            length_km = EXCLUDED.length_km,
            status = EXCLUDED.status,
            risk_score = EXCLUDED.risk_score,
            travel_minutes = EXCLUDED.travel_minutes,
            updated_at = NOW();`,
          [
            seg.id,
            seg.name,
            seg.code || null,
            state,
            district,
            wkt,
            startLon,
            startLat,
            endLon,
            endLat,
            seg.lengthKm || 0,
            seg.status || 'OPEN',
            null,
            null,
            seg.travelRisk.score || 0,
            seg.travelMinutes || 15,
            seg.lastUpdated,
          ],
        );
      } catch (insertErr) {
        // Continue with remaining segments
      }
    });

    await Promise.allSettled(queries);
  }

  /**
   * Retrieves all normalized road segments in the store.
   */
  async getRoadSegments(): Promise<RoadSegment[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return Array.from(this.cache.values());
  }

  /**
   * Adds or updates a single road segment.
   */
  async saveRoadSegment(segment: RoadSegment): Promise<void> {
    this.cache.set(segment.id, segment);
    await this.persistBatchToDatabase([segment]);
  }

  /**
   * Ingests real OSM road network data from public Overpass API.
   * Validates, normalizes, and persists to PostGIS + in-memory store.
   */
  async ingestFromOverpass(options?: RoadIngestionOptions): Promise<IngestionResult<RoadSegment>> {
    try {
      const { elements, endpointUsed } = await overpassClient.fetchRoads(options);
      const normalizedSegments: RoadSegment[] = [];
      const errors: string[] = [];

      for (const el of elements) {
        const validation = validateRoadWay(el);
        if (!validation.valid || !validation.road) {
          if (validation.reason) errors.push(validation.reason);
          continue;
        }

        const segment = normalizeRoadSegment(validation.road);
        this.cache.set(segment.id, segment);
        normalizedSegments.push(segment);
      }

      // Persist newly ingested segments into PostGIS
      if (normalizedSegments.length > 0) {
        await this.persistBatchToDatabase(normalizedSegments);
      }

      this.isInitialized = true;

      return {
        success: true,
        count: normalizedSegments.length,
        data: normalizedSegments,
        source: 'OpenStreetMap Overpass API',
        endpointUsed,
        retrievedAt: new Date().toISOString(),
        errors: errors.slice(0, 10),
      };
    } catch (err: any) {
      // Ensure store has baseline even if live Overpass call fails
      if (!this.isInitialized) {
        await this.initialize();
      }

      return {
        success: false,
        count: this.cache.size,
        data: Array.from(this.cache.values()),
        source: 'OpenStreetMap Baseline Store',
        endpointUsed: 'Local Fallback',
        retrievedAt: new Date().toISOString(),
        errors: [err.message || 'Overpass query timed out or returned error'],
      };
    }
  }

  /**
   * Clears in-memory store (primarily for unit test isolation).
   */
  _clearForTesting(): void {
    this.cache.clear();
    this.isInitialized = false;
  }
}

export const osmRoadStore = new OsmRoadStore();
