/**
 * Real Hazard Repository & Deduplication Service
 *
 * Persists normalized operational hazard events (EONET, FIRMS, external telemetry)
 * into Neon PostgreSQL + PostGIS with:
 * - Upsert/deduplication by ID and externalId
 * - PostGIS Point geometry indexing
 * - Dynamic discovery registration into the regional GIS registry
 * - In-memory LRU-style cache with TTL for ultra-fast query performance
 */

import { executeQuery } from '@/lib/db';
import type { IngestedHazardEvent } from '../types';
import { registerRealOperationalLocation, parseLocationFromText } from '@/lib/geo/regions';

// In-memory cache for fast repeated reads without slamming PostgreSQL
let _cachedHazards: IngestedHazardEvent[] = [];
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class HazardRepository {
  /**
   * Persists a batch of normalized hazard events with deduplication.
   */
  async saveBatch(events: IngestedHazardEvent[]): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    for (const event of events) {
      // 1. Update in-memory cache
      const existingIdx = _cachedHazards.findIndex((h) => h.id === event.id);
      if (existingIdx !== -1) {
        _cachedHazards[existingIdx] = event;
        updated++;
      } else {
        _cachedHazards.unshift(event);
        inserted++;
      }

      // 2. Register location dynamically into geographic system
      try {
        const parsed = parseLocationFromText(event.locationName);
        registerRealOperationalLocation({
          district: event.district || parsed.district,
          state: event.state || parsed.state,
          coordinates: event.coordinates,
          locality: event.locationName,
          source: 'HAZARD',
          environment: 'REAL',
        });
      } catch {
        // Non-blocking
      }

      // 3. Persist to Neon PostgreSQL if DATABASE_URL is available
      if (process.env.DATABASE_URL) {
        try {
          const [lon, lat] = event.coordinates;

          // Check if record exists
          const existingDb = await executeQuery<{ id: string }>(
            'SELECT id FROM hazards WHERE id = $1 LIMIT 1;',
            [event.id],
          );

          if (existingDb.length > 0) {
            await executeQuery(
              `UPDATE hazards SET
                title = $1,
                description = $2,
                severity = $3,
                status = $4,
                source_agency = $5,
                updated_at = $6
              WHERE id = $7;`,
              [
                event.title,
                event.description,
                event.severity,
                event.status,
                event.source,
                event.updatedAt,
                event.id,
              ],
            );
          } else {
            await executeQuery(
              `INSERT INTO hazards (
                id,
                hazard_type,
                severity,
                status,
                title,
                description,
                state,
                district,
                location_name,
                centroid,
                source_agency,
                started_at,
                environment
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                ST_SetSRID(ST_MakePoint($10, $11), 4326),
                $12, $13, $14
              ) ON CONFLICT (id) DO NOTHING;`,
              [
                event.id,
                event.hazardType,
                event.severity,
                event.status,
                event.title,
                event.description,
                event.state || 'India',
                event.district || event.locationName,
                event.locationName,
                lon,
                lat,
                event.source,
                event.startedAt,
                event.environment,
              ],
            );
          }
        } catch (err: any) {
          console.warn('[HAZARD-REPO] PostgreSQL persistence warning:', err.message);
        }
      }
    }

    _cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return { inserted, updated };
  }

  /**
   * Retrieves active operational hazards in REAL mode.
   */
  async getActiveHazards(): Promise<IngestedHazardEvent[]> {
    if (_cachedHazards.length > 0 && Date.now() < _cacheExpiresAt) {
      return _cachedHazards.filter((h) => h.isActive);
    }

    if (!process.env.DATABASE_URL) {
      return _cachedHazards.filter((h) => h.isActive);
    }

    try {
      const rows = await executeQuery<any>(
        `SELECT
          id, hazard_type, severity, status, title, description,
          state, district, location_name,
          ST_X(centroid) as lon, ST_Y(centroid) as lat,
          source_agency, started_at, updated_at
        FROM hazards
        WHERE environment = 'REAL' AND status != 'DISSIPATED'
        ORDER BY updated_at DESC
        LIMIT 50;`,
      );

      const dbHazards: IngestedHazardEvent[] = rows.map((r) => ({
        id: r.id,
        externalId: r.id,
        title: r.title,
        description: r.description || '',
        hazardType: r.hazard_type,
        severity: r.severity,
        status: r.status,
        coordinates: [parseFloat(r.lon), parseFloat(r.lat)],
        state: r.state,
        district: r.district,
        locationName: r.location_name,
        source: r.source_agency,
        startedAt: r.started_at,
        updatedAt: r.updated_at,
        isActive: r.status !== 'DISSIPATED',
        geometryType: 'Point',
        geometry: { type: 'Point', coordinates: [parseFloat(r.lon), parseFloat(r.lat)] },
        freshness: 'RECENT',
        environment: 'REAL',
      }));

      _cachedHazards = dbHazards;
      _cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return dbHazards;
    } catch (err: any) {
      console.warn('[HAZARD-REPO] Query error, falling back to cache:', err.message);
      return _cachedHazards.filter((h) => h.isActive);
    }
  }

  /**
   * Testing helper to reset in-memory state between test suites.
   */
  _resetForTesting(): void {
    _cachedHazards = [];
    _cacheExpiresAt = 0;
  }
}

export const hazardRepository = new HazardRepository();
