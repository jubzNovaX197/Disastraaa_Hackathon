/**
 * Copernicus Global Flood Awareness System (GloFAS) River Discharge Client
 *
 * Implements river discharge telemetry via Open-Meteo Flood API.
 * GloFAS combines ECMWF numerical weather predictions with a distributed hydrological model
 * to produce river discharge observations and forecasts in m³/s.
 *
 * Endpoint: https://flood-api.open-meteo.com/v1/flood
 * Free open data, non-commercial, no API key required.
 */

import type { RiverDischargeObservation } from './types';

export class GlofasClient {
  private static readonly ENDPOINT = 'https://flood-api.open-meteo.com/v1/flood';
  private static readonly DEFAULT_TIMEOUT_MS = 8000;

  async fetchRiverDischarge(
    latitude: number,
    longitude: number,
    district: string = 'Kalahandi',
    state: string = 'Odisha',
  ): Promise<{
    success: boolean;
    data: RiverDischargeObservation | null;
    error?: string;
    durationMs: number;
  }> {
    const startTime = Date.now();

    // Coordinate validation
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return {
        success: false,
        data: null,
        error: 'Invalid coordinates provided for river discharge query',
        durationMs: Date.now() - startTime,
      };
    }

    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      daily: 'river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min',
      forecast_days: '3',
    });

    const url = `${GlofasClient.ENDPOINT}?${params.toString()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GlofasClient.DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Disastraaa-Flood-Monitoring/1.0 (Operations)',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          success: false,
          data: null,
          error: `GloFAS API returned HTTP ${response.status}`,
          durationMs: Date.now() - startTime,
        };
      }

      const json = await response.json();

      if (!json || !json.daily || !Array.isArray(json.daily.river_discharge)) {
        return {
          success: false,
          data: null,
          error: 'Malformed response structure from GloFAS API',
          durationMs: Date.now() - startTime,
        };
      }

      const discharge = json.daily.river_discharge[0];
      const maxDischarge = json.daily.river_discharge_max?.[0];
      const minDischarge = json.daily.river_discharge_min?.[0];
      const date = json.daily.time?.[0] || new Date().toISOString().slice(0, 10);

      if (typeof discharge !== 'number' || isNaN(discharge)) {
        return {
          success: false,
          data: null,
          error: 'Non-numeric discharge value returned from GloFAS model',
          durationMs: Date.now() - startTime,
        };
      }

      const observation: RiverDischargeObservation = {
        coordinates: [json.longitude || longitude, json.latitude || latitude],
        district,
        state,
        dischargeM3s: Math.round(discharge * 100) / 100,
        dischargeMaxM3s: typeof maxDischarge === 'number' ? Math.round(maxDischarge * 100) / 100 : undefined,
        dischargeMinM3s: typeof minDischarge === 'number' ? Math.round(minDischarge * 100) / 100 : undefined,
        observedAt: date,
        retrievedAt: new Date().toISOString(),
        source: 'Copernicus GloFAS (ECMWF / Open-Meteo)',
        freshnessStatus: 'LIVE',
      };

      return {
        success: true,
        data: observation,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('timeout');
      return {
        success: false,
        data: null,
        error: isTimeout ? 'GloFAS request timed out' : err?.message || 'GloFAS network error',
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export const glofasClient = new GlofasClient();
