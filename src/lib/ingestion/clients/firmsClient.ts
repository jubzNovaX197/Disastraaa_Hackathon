/**
 * NASA FIRMS (Fire Information for Resource Management System) Client
 *
 * Connects to NASA EOSDIS active fire/thermal hotspot telemetry (VIIRS / MODIS).
 * Requires NASA Earthdata MAP_KEY (free registration).
 *
 * Safe Server-Side Operational Implementation:
 * - If NASA_FIRMS_MAP_KEY is missing, gracefully returns STANDBY / UNAVAILABLE state
 *   without crashing, fabricating fake fires, or leaking credentials.
 * - Spatially filtered for India bounding box.
 * - Limits sample size to prevent memory exhaustion.
 */

import { objectStorage } from '@/lib/storage';
import { INDIA_BBOX, type BoundingBox } from '../types';

export interface FirmsHotspotRaw {
  latitude: number;
  longitude: number;
  brightness: number;
  scan: number;
  track: number;
  acqDate: string; // YYYY-MM-DD
  acqTime: string; // HHMM
  satellite: string;
  confidence: string; // 'l' | 'n' | 'h' or percentage
  frp: number; // Fire Radiative Power (MW)
  dayNight: 'D' | 'N';
}

export interface FetchFirmsOptions {
  bbox?: BoundingBox;
  daysBack?: number;
  source?: 'VIIRS_SNPP_NRT' | 'VIIRS_NOAA20_NRT' | 'MODIS_NRT';
  timeoutMs?: number;
  limit?: number;
  archiveSnapshot?: boolean;
}

export interface FirmsFetchResult {
  success: boolean;
  configured: boolean;
  hotspots: FirmsHotspotRaw[];
  archiveStorageKey?: string;
  error?: string;
  durationMs: number;
}

export class FirmsClient {
  private static readonly BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

  private getMapKey(): string | undefined {
    return process.env.NASA_FIRMS_MAP_KEY || process.env.FIRMS_MAP_KEY;
  }

  isConfigured(): boolean {
    return !!this.getMapKey();
  }

  async fetchHotspots(options: FetchFirmsOptions = {}): Promise<FirmsFetchResult> {
    const startTime = Date.now();
    const mapKey = this.getMapKey();

    if (!mapKey) {
      return {
        success: false,
        configured: false,
        hotspots: [],
        error: 'NASA FIRMS MAP_KEY is not configured in .env.local. Hotspot telemetry standing by.',
        durationMs: Date.now() - startTime,
      };
    }

    const timeoutMs = options.timeoutMs ?? 9000;
    const bbox = options.bbox ?? INDIA_BBOX;
    const daysBack = options.daysBack ?? 1;
    const source = options.source ?? 'VIIRS_SNPP_NRT';
    const limit = options.limit ?? 100;

    // FIRMS Area API format: [minLon],[minLat],[maxLon],[maxLat]
    const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
    const url = `${FirmsClient.BASE_URL}/${mapKey}/${source}/${bboxStr}/${daysBack}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Disastraaa-Disaster-Intelligence/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          configured: true,
          hotspots: [],
          error: `NASA FIRMS API returned HTTP ${response.status}: ${response.statusText}`,
          durationMs: Date.now() - startTime,
        };
      }

      const csvText = await response.text();
      const hotspots = this.parseCsv(csvText, limit);

      let archiveStorageKey: string | undefined;
      if (options.archiveSnapshot !== false && hotspots.length > 0) {
        try {
          const snapshotKey = `raw/firms/${new Date().toISOString().slice(0, 10)}/firms-${Date.now()}.csv`;
          const meta = await objectStorage.putObject({
            key: snapshotKey,
            data: csvText,
            contentType: 'text/csv',
          });
          archiveStorageKey = meta.key;
        } catch {
          // Non-blocking
        }
      }

      return {
        success: true,
        configured: true,
        hotspots,
        archiveStorageKey,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError';
      const msg = isTimeout
        ? `NASA FIRMS API request timed out after ${timeoutMs}ms.`
        : err?.message || 'Unknown network error fetching NASA FIRMS hotspots.';

      console.warn('[FIRMS-CLIENT]', msg);

      return {
        success: false,
        configured: true,
        hotspots: [],
        error: msg,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private parseCsv(csv: string, limit: number): FirmsHotspotRaw[] {
    const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    const header = lines[0].split(',').map((h) => h.trim());
    const latIdx = header.indexOf('latitude');
    const lonIdx = header.indexOf('longitude');
    const brightIdx = header.findIndex((h) => h.includes('bright'));
    const dateIdx = header.indexOf('acq_date');
    const timeIdx = header.indexOf('acq_time');
    const satIdx = header.indexOf('satellite');
    const confIdx = header.indexOf('confidence');
    const frpIdx = header.indexOf('frp');
    const dayNightIdx = header.indexOf('daynight');

    if (latIdx === -1 || lonIdx === -1) return [];

    const results: FirmsHotspotRaw[] = [];
    for (let i = 1; i < lines.length && results.length < limit; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      const lat = parseFloat(parts[latIdx]);
      const lon = parseFloat(parts[lonIdx]);

      if (isNaN(lat) || isNaN(lon)) continue;

      results.push({
        latitude: lat,
        longitude: lon,
        brightness: brightIdx !== -1 ? parseFloat(parts[brightIdx]) || 300 : 300,
        scan: 1,
        track: 1,
        acqDate: dateIdx !== -1 ? parts[dateIdx] : new Date().toISOString().slice(0, 10),
        acqTime: timeIdx !== -1 ? parts[timeIdx] : '1200',
        satellite: satIdx !== -1 ? parts[satIdx] : 'VIIRS',
        confidence: confIdx !== -1 ? parts[confIdx] : 'nominal',
        frp: frpIdx !== -1 ? parseFloat(parts[frpIdx]) || 10 : 10,
        dayNight: (dayNightIdx !== -1 && parts[dayNightIdx] === 'D') ? 'D' : 'N',
      });
    }

    return results;
  }
}

export const firmsClient = new FirmsClient();
