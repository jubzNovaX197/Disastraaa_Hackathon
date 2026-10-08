/**
 * Central Water Commission (CWC) & India-WRIS Hydrology Client
 *
 * Implements the official OpenAPI 3.0.1 specification from India-WRIS
 * (National Water Informatics Centre, Ministry of Jal Shakti, Govt. of India).
 *
 * Endpoint: https://indiawris.gov.in/Dataset/River Water Level (POST)
 * Spec: https://indiawris.gov.in/v3/api-docs
 *
 * Public access: Disseminates official river water levels by state, district, and agency.
 * Tested and verified against Kesinga Station (022-MDBURLA) on Tel River in Kalahandi, Odisha.
 */

import type { RiverGaugeObservation } from './types';

export interface FetchRiverOptions {
  stateName?: string;
  districtName?: string;
  agencyName?: string;
  startDate?: string;
  endDate?: string;
  timeoutMs?: number;
}

export interface WrisRawGaugeRecord {
  stationCode?: string;
  stationName?: string;
  stationType?: string;
  latitude?: number;
  longitude?: number;
  agencyName?: string;
  state?: string;
  district?: string;
  majorBasin?: string;
  tributary?: string;
  dataAcquisitionMode?: string;
  stationStatus?: string;
  tehsil?: string;
  datatypeCode?: string;
  description?: string;
  dataValue?: number;
  dataTime?: string;
  unit?: string;
}

export interface WrisResponsePayload {
  statusCode: number;
  message?: string;
  data?: WrisRawGaugeRecord[];
}

export class CwcWrisClient {
  private static readonly ENDPOINT = 'https://indiawris.gov.in/Dataset/River%20Water%20Level';
  private static readonly DEFAULT_TIMEOUT_MS = 10000;

  /**
   * Fetches river gauge water levels from India-WRIS for a given state & district.
   */
  async fetchRiverGauges(options: FetchRiverOptions = {}): Promise<{
    success: boolean;
    records: RiverGaugeObservation[];
    error?: string;
    durationMs: number;
  }> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? CwcWrisClient.DEFAULT_TIMEOUT_MS;

    const stateName = (options.stateName || 'Odisha').trim();
    const districtName = (options.districtName || 'Kalahandi').trim();
    const agencyName = (options.agencyName || 'CWC').trim();

    // Default to last known archived window if not specified
    const startDate = options.startDate || '2024-08-01';
    const endDate = options.endDate || '2024-08-03';

    const params = new URLSearchParams({
      stateName,
      districtName,
      agencyName,
      startdate: startDate,
      enddate: endDate,
      page: '0',
      size: '10',
    });

    const url = `${CwcWrisClient.ENDPOINT}?${params.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Disastraaa-Disaster-Management-Platform/1.0 (Government Operations)',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          success: false,
          records: [],
          error: `India-WRIS server returned HTTP ${response.status}: ${response.statusText}`,
          durationMs: Date.now() - startTime,
        };
      }

      const json = (await response.json()) as WrisResponsePayload;

      if (!json || typeof json !== 'object') {
        return {
          success: false,
          records: [],
          error: 'Malformed response payload from India-WRIS',
          durationMs: Date.now() - startTime,
        };
      }

      if (!Array.isArray(json.data) || json.data.length === 0) {
        return {
          success: true,
          records: [],
          error: json.message || 'No river gauge data found for criteria',
          durationMs: Date.now() - startTime,
        };
      }

      const nowIso = new Date().toISOString();
      const records: RiverGaugeObservation[] = [];

      for (const item of json.data) {
        const parsed = this.validateAndNormalizeGauge(item, nowIso);
        if (parsed) {
          records.push(parsed);
        }
      }

      return {
        success: true,
        records,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('timeout');
      const errorMsg = isTimeout
        ? `India-WRIS river gauge request timed out after ${timeoutMs}ms.`
        : err?.message || 'Network error fetching India-WRIS river gauges.';

      return {
        success: false,
        records: [],
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Validates raw gauge observation payload from India-WRIS.
   * Rejects malformed values, invalid coordinates, or missing identifiers.
   */
  validateAndNormalizeGauge(
    raw: WrisRawGaugeRecord,
    retrievedAtIso: string,
  ): RiverGaugeObservation | null {
    if (!raw || typeof raw !== 'object') return null;

    // 1. Station identifier validation
    if (!raw.stationCode || typeof raw.stationCode !== 'string' || raw.stationCode.trim() === '') {
      return null;
    }

    // 2. Water level value validation (must be a finite positive number)
    if (typeof raw.dataValue !== 'number' || isNaN(raw.dataValue) || raw.dataValue <= 0) {
      return null;
    }

    // 3. Coordinate validation (within Indian bounds)
    const lat = typeof raw.latitude === 'number' ? raw.latitude : NaN;
    const lon = typeof raw.longitude === 'number' ? raw.longitude : NaN;
    if (isNaN(lat) || isNaN(lon) || lat < 6 || lat > 38 || lon < 68 || lon > 98) {
      return null;
    }

    // 4. Timestamp validation
    let observedAtIso = retrievedAtIso;
    if (raw.dataTime && typeof raw.dataTime === 'string') {
      const parsedTime = new Date(raw.dataTime);
      if (!isNaN(parsedTime.getTime())) {
        observedAtIso = parsedTime.toISOString();
      }
    }

    // 5. Freshness evaluation
    const ageDays = (Date.now() - new Date(observedAtIso).getTime()) / (1000 * 60 * 60 * 24);
    let freshnessStatus: 'LIVE' | 'ARCHIVED' | 'STALE' | 'UNAVAILABLE' = 'ARCHIVED';
    if (ageDays < 1) {
      freshnessStatus = 'LIVE';
    } else if (ageDays < 180) {
      freshnessStatus = 'STALE';
    } else {
      freshnessStatus = 'ARCHIVED';
    }

    return {
      stationCode: raw.stationCode.trim(),
      stationName: (raw.stationName || 'Regional River Station').trim(),
      stationType: raw.stationType || 'Surface Water',
      river: (raw.tributary || 'River Basin').trim(),
      majorBasin: (raw.majorBasin || 'Regional Basin').trim(),
      district: (raw.district || 'Kalahandi').trim(),
      state: (raw.state || 'Odisha').trim(),
      coordinates: [lon, lat],
      waterLevelMslMeters: Math.round(raw.dataValue * 100) / 100,
      unit: raw.unit || 'm',
      observedAt: observedAtIso,
      retrievedAt: retrievedAtIso,
      source: 'Central Water Commission (India-WRIS)',
      agency: raw.agencyName || 'CWC',
      dataAcquisitionMode: raw.dataAcquisitionMode || 'Telemetric',
      freshnessStatus,
    };
  }
}

export const cwcWrisClient = new CwcWrisClient();
