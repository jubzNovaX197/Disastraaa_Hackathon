/**
 * Real Weather Provider (Operational Ingestion)
 *
 * Implements the WeatherProvider contract using live Open-Meteo telemetry.
 * Normalizes live meteorological responses, evaluates freshness, and persists
 * operational records to Neon PostgreSQL + PostGIS.
 */

import { executeQuery } from '@/lib/db';
import { parseLocationFromText } from '@/lib/geo/regions';
import { normalizeOpenMeteoResponse } from '@/lib/weather/normalizer';
import { openMeteoClient } from '@/lib/weather/openMeteoClient';
import { getCachedWeather, saveWeatherTelemetry } from '@/lib/weather/store';
import type { NormalizedWeather } from '@/lib/weather/types';
import type { WeatherProvider } from '../types';

export class RealWeatherProvider implements WeatherProvider {
  async getWeather(
    lat: number,
    lon: number,
    locationName: string = 'Monitored Sector',
  ): Promise<NormalizedWeather | null> {
    // 1. Check in-memory cache first
    const cached = getCachedWeather(lat, lon);
    if (cached) {
      return cached;
    }

    // 2. Fetch from Open-Meteo
    const result = await openMeteoClient.fetchForecast(lat, lon);
    if (!result.success || !result.data) {
      console.warn(`[REAL-WEATHER-PROVIDER] Ingestion failed for [${lat}, ${lon}]:`, result.error);

      // Fallback: check database for last-known-good persisted weather
      if (process.env.DATABASE_URL) {
        try {
          const rows = await executeQuery<any>(
            `SELECT *, ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat
             FROM weather_telemetry
             WHERE environment = 'REAL'
             ORDER BY ST_Distance(coordinates, ST_SetSRID(ST_MakePoint($1, $2), 4326)) ASC
             LIMIT 1;`,
            [lon, lat],
          );
          if (rows.length > 0) {
            const r = rows[0];
            return {
              id: r.id,
              locationName: r.location_name,
              state: r.state,
              district: r.district,
              coordinates: [Number(r.lng) || lon, Number(r.lat) || lat],
              temperatureC: Number(r.temperature_c),
              relativeHumidityPct: r.relative_humidity_pct,
              precipitationMm: Number(r.precipitation_mm),
              windSpeedKmh: Number(r.wind_speed_kmh),
              windDirectionDeg: r.wind_direction_deg,
              surfacePressureHpa: Number(r.surface_pressure_hpa),
              weatherCode: r.weather_code,
              condition: r.weather_condition,
              icon: '⛅',
              isDay: true,
              source: `${r.source} (Last-Known-Good DB Fallback)`,
              sourceId: r.id,
              retrievedAt: new Date().toISOString(),
              observedAt: new Date(r.observed_at).toISOString(),
              validFrom: new Date(r.observed_at).toISOString(),
              validUntil: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              freshnessStatus: 'STALE',
              hourlyForecast: Array.isArray(r.forecast_json) ? r.forecast_json : [],
              environment: 'REAL',
            };
          }
        } catch {
          // Fall through to null
        }
      }
      return null;
    }

    // 3. Normalize into common data contract
    const normalized = normalizeOpenMeteoResponse(result.data, locationName);
    if (!normalized) return null;

    // 4. Persist to Neon PostgreSQL & register location in geographic service
    await saveWeatherTelemetry(normalized);

    return normalized;
  }

  async getRegionalWeather(state?: string, district?: string): Promise<NormalizedWeather[]> {
    if (!process.env.DATABASE_URL) return [];

    try {
      if (!state && !district) {
        const canonicalSectors = [
          { name: 'Kalahandi District, Odisha', lat: 19.9075, lon: 83.1659 },
          { name: 'Bhubaneswar State Command Operations, Khordha District, Odisha', lat: 20.2961, lon: 85.8245 },
          { name: 'Puri Coastal Belt, Puri District, Odisha', lat: 19.8135, lon: 85.8312 },
          { name: 'Cuttack Operational Sector, Cuttack District, Odisha', lat: 20.4625, lon: 85.8830 },
        ];

        try {
          const countCheck = await executeQuery<{ cnt: string }>(
            `SELECT COUNT(*)::text as cnt FROM weather_telemetry WHERE environment = 'REAL' AND observed_at >= NOW() - INTERVAL '3 hours';`,
          );
          const hasRecent = countCheck.length > 0 && parseInt(countCheck[0].cnt, 10) >= 4;

          if (!hasRecent) {
            await Promise.allSettled(
              canonicalSectors.map((s) => this.getWeather(s.lat, s.lon, s.name)),
            );
          }
        } catch {
          // Continue to query existing records if live refresh encounters network timeout
        }
      }

      let query = 'SELECT *, ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat FROM weather_telemetry WHERE environment = $1';
      const params: any[] = ['REAL'];

      if (state && district) {
        query += ' AND state = $2 AND district = $3';
        params.push(state, district);
      } else if (state) {
        query += ' AND state = $2';
        params.push(state);
      }

      query += ' ORDER BY observed_at DESC LIMIT 20;';

      const rows = await executeQuery<any>(query, params);
      return rows.map((r) => {
        const parsed = parseLocationFromText(r.location_name, r.state || 'Odisha');
        return {
          id: r.id,
          locationName: r.location_name,
          state: r.state || parsed.state,
          district: r.district || parsed.district,
          coordinates: [Number(r.lng) || 0, Number(r.lat) || 0] as [number, number],
        temperatureC: Number(r.temperature_c),
        relativeHumidityPct: r.relative_humidity_pct,
        precipitationMm: Number(r.precipitation_mm),
        windSpeedKmh: Number(r.wind_speed_kmh),
        windDirectionDeg: r.wind_direction_deg,
        surfacePressureHpa: Number(r.surface_pressure_hpa),
        weatherCode: r.weather_code,
        condition: r.weather_condition,
        icon: '🌤️',
        isDay: true,
        source: r.source,
        retrievedAt: new Date(r.retrieved_at).toISOString(),
        observedAt: new Date(r.observed_at).toISOString(),
        validFrom: new Date(r.observed_at).toISOString(),
        validUntil: new Date(new Date(r.observed_at).getTime() + 3600000).toISOString(),
        freshnessStatus: r.freshness_status,
        environment: 'REAL',
      };
    });
  } catch (err: any) {
      console.warn('[REAL-WEATHER-PROVIDER] Failed to fetch regional weather:', err.message);
      return [];
    }
  }
}

export const realWeatherProvider = new RealWeatherProvider();
