/**
 * Real Weather Provider (Operational Ingestion)
 *
 * Implements the WeatherProvider contract using live Open-Meteo telemetry.
 * Normalizes live meteorological responses, evaluates freshness, and persists
 * operational records to Neon PostgreSQL + PostGIS.
 */

import type { WeatherProvider } from '../types';
import type { NormalizedWeather } from '@/lib/weather/types';
import { openMeteoClient } from '@/lib/weather/openMeteoClient';
import { normalizeOpenMeteoResponse } from '@/lib/weather/normalizer';
import { getCachedWeather, saveWeatherTelemetry } from '@/lib/weather/store';
import { executeQuery } from '@/lib/db';

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
      return rows.map((r) => ({
        id: r.id,
        locationName: r.location_name,
        state: r.state,
        district: r.district,
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
      }));
    } catch (err: any) {
      console.warn('[REAL-WEATHER-PROVIDER] Failed to fetch regional weather:', err.message);
      return [];
    }
  }
}

export const realWeatherProvider = new RealWeatherProvider();
