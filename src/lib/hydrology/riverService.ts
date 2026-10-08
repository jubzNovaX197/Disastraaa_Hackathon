/**
 * Hydrology & River Intelligence Aggregator Service
 *
 * Coordinates ground gauge observations from Central Water Commission (India-WRIS)
 * and global hydrological model telemetry (Copernicus GloFAS).
 *
 * Enforces strict engineering standards:
 * - NEVER fabricates water levels or invents gauge readings.
 * - NEVER substitutes precipitation rainfall for river levels.
 * - Distinguishes verified observations, archived benchmarks, and unavailable feeds.
 */

import { cwcWrisClient } from './cwcWrisClient';
import { glofasClient } from './glofasClient';
import type {
  RiverGaugeObservation,
  RiverDischargeObservation,
  RiverIntelligenceSummary,
} from './types';

// In-memory TTL cache to avoid hammering government APIs repeatedly
interface CachedHydrology {
  summary: RiverIntelligenceSummary;
  expiresAt: number;
}

const _hydrologyCache = new Map<string, CachedHydrology>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes TTL

export class RiverService {
  /**
   * Retrieves operational river intelligence for Kalahandi District (initial demonstration area).
   * Kesinga station on the Tel River (Mahanadi basin).
   */
  async getKalahandiRiverStatus(forceRefresh = false): Promise<RiverIntelligenceSummary> {
    return this.getRiverStatusForDistrict('Odisha', 'Kalahandi', 19.9075, 83.1659, forceRefresh);
  }

  /**
   * Retrieves operational river intelligence for an arbitrary district and location.
   */
  async getRiverStatusForDistrict(
    state: string,
    district: string,
    lat: number,
    lon: number,
    forceRefresh = false,
  ): Promise<RiverIntelligenceSummary> {
    const cacheKey = `${state.toLowerCase()}_${district.toLowerCase()}`;
    const now = Date.now();

    if (!forceRefresh) {
      const cached = _hydrologyCache.get(cacheKey);
      if (cached && now < cached.expiresAt) {
        return cached.summary;
      }
    }

    const lastChecked = new Date().toISOString();

    // 1. Fetch CWC ground station gauge from India-WRIS
    const cwcPromise = cwcWrisClient.fetchRiverGauges({
      stateName: state,
      districtName: district,
      agencyName: 'CWC',
      timeoutMs: 9000,
    });

    // 2. Fetch Copernicus GloFAS river discharge
    const glofasPromise = glofasClient.fetchRiverDischarge(lat, lon, district, state);

    const [cwcResult, glofasResult] = await Promise.allSettled([cwcPromise, glofasPromise]);

    const gauges: RiverGaugeObservation[] =
      cwcResult.status === 'fulfilled' && cwcResult.value.success
        ? cwcResult.value.records
        : [];

    const discharge: RiverDischargeObservation | null =
      glofasResult.status === 'fulfilled' && glofasResult.value.success
        ? glofasResult.value.data
        : null;

    let status: 'CONNECTED' | 'STANDBY' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let notes = '';

    if (gauges.length > 0 && discharge) {
      status = 'CONNECTED';
      notes = `CWC ground telemetry active (${gauges.length} stations found) with GloFAS discharge monitoring (${discharge.dischargeM3s} m³/s).`;
    } else if (gauges.length > 0) {
      status = 'CONNECTED';
      notes = `CWC ground telemetry active (${gauges.length} stations in ${district}).`;
    } else if (discharge) {
      status = 'CONNECTED';
      notes = `GloFAS hydrological model active (${discharge.dischargeM3s} m³/s). CWC ground telemetry: ${
        cwcResult.status === 'fulfilled' ? cwcResult.value.error || 'No ground gauges in window' : 'Offline'
      }.`;
    } else {
      status = 'UNAVAILABLE';
      notes = `Hydrological telemetry unavailable for ${district}. CWC: ${
        cwcResult.status === 'fulfilled' ? cwcResult.value.error || 'Unavailable' : 'Connection failed'
      }.`;
    }

    const summary: RiverIntelligenceSummary = {
      gauges,
      discharge,
      status,
      sourceAgency: gauges.length > 0 ? 'Central Water Commission (India-WRIS)' : 'Copernicus GloFAS',
      lastChecked,
      notes,
    };

    _hydrologyCache.set(cacheKey, {
      summary,
      expiresAt: now + CACHE_TTL_MS,
    });

    return summary;
  }

  _resetCacheForTesting(): void {
    _hydrologyCache.clear();
  }
}

export const riverService = new RiverService();
