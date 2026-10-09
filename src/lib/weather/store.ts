/**
 * Weather Repository & Persistence Store
 *
 * Persists normalized operational weather telemetry into Neon PostgreSQL + PostGIS.
 * Deduplicates telemetry records (does NOT insert redundant duplicate rows for the same observation).
 * Automatically registers newly observed locations into the data-driven geographic region system.
 */

import { executeQuery } from '@/lib/db';
import { parseLocationFromText, registerRealOperationalLocation } from '@/lib/geo/regions';
import type { NormalizedWeather } from './types';

// In-memory cache for ultra-fast repeated queries (60-minute TTL)
const _weatherCache = new Map<string, { weather: NormalizedWeather; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

/**
 * Checks in-memory cache for fresh weather data
 */
export function getCachedWeather(lat: number, lon: number): NormalizedWeather | null {
  const key = getCacheKey(lat, lon);
  const entry = _weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _weatherCache.delete(key);
    return null;
  }
  return entry.weather;
}

export function getAllCachedWeather(): NormalizedWeather[] {
  const now = Date.now();
  const list: NormalizedWeather[] = [];
  for (const [key, entry] of _weatherCache.entries()) {
    if (now > entry.expiresAt) {
      _weatherCache.delete(key);
    } else {
      list.push(entry.weather);
    }
  }
  return list;
}

/**
 * Persists normalized operational weather into Neon PostgreSQL + PostGIS
 * and updates memory cache. Deduplicates by ID and observation timestamp.
 */
export interface WeatherSaveResult {
  success: boolean;
  persistedToDb: boolean;
  isNewer: boolean;
  error?: string;
}

/**
 * Persists normalized operational weather into Neon PostgreSQL + PostGIS
 * and updates memory cache. Deduplicates by ID, enforces temporal ordering
 * (rejects overwriting newer observations with older ones), and validates coordinates.
 */
export async function saveWeatherTelemetry(weather: NormalizedWeather): Promise<WeatherSaveResult> {
  // Validate coordinates and numbers
  if (
    !weather ||
    !Array.isArray(weather.coordinates) ||
    weather.coordinates.length !== 2 ||
    typeof weather.coordinates[0] !== 'number' ||
    typeof weather.coordinates[1] !== 'number' ||
    isNaN(weather.coordinates[0]) ||
    isNaN(weather.coordinates[1]) ||
    weather.coordinates[0] < -180 ||
    weather.coordinates[0] > 180 ||
    weather.coordinates[1] < -90 ||
    weather.coordinates[1] > 90 ||
    typeof weather.temperatureC !== 'number' ||
    isNaN(weather.temperatureC)
  ) {
    return {
      success: false,
      persistedToDb: false,
      isNewer: false,
      error: 'Malformed coordinates or invalid numeric weather observations',
    };
  }

  const [lon, lat] = weather.coordinates;
  const key = getCacheKey(lat, lon);

  // Update in-memory cache
  _weatherCache.set(key, {
    weather,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  // Dynamically register into the geographic region discovery system
  try {
    const parsed = parseLocationFromText(`${weather.locationName}, ${weather.district ?? ''}, ${weather.state ?? ''}`);
    registerRealOperationalLocation({
      district: weather.district || parsed.district,
      state: weather.state || parsed.state,
      coordinates: [lon, lat],
      locality: weather.locationName,
      source: 'WEATHER',
      environment: 'REAL',
    });
  } catch (err) {
    // Non-blocking
  }

  // Persist to Neon PostgreSQL if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    return {
      success: true,
      persistedToDb: false,
      isNewer: true,
      error: 'DATABASE_URL not configured; cached in memory only',
    };
  }

  try {
    // Deduplication & temporal ordering check
    const existing = await executeQuery<{ id: string; observed_at: string }>(
      'SELECT id, observed_at FROM weather_telemetry WHERE id = $1 LIMIT 1;',
      [weather.id],
    );

    if (existing.length > 0) {
      const existingObservedMs = new Date(existing[0].observed_at).getTime();
      const incomingObservedMs = new Date(weather.observedAt).getTime();

      // Avoid overwriting a valid observation with an older observation
      if (!isNaN(existingObservedMs) && !isNaN(incomingObservedMs) && incomingObservedMs < existingObservedMs) {
        return {
          success: true,
          persistedToDb: false,
          isNewer: false,
          error: 'Incoming observation is older than existing record; preserved newer record',
        };
      }

      // Update existing record rather than inserting duplicate row
      await executeQuery(
        `UPDATE weather_telemetry SET
          location_name = COALESCE($13, location_name),
          state = COALESCE($14, state),
          district = COALESCE($15, district),
          temperature_c = $1,
          relative_humidity_pct = $2,
          precipitation_mm = $3,
          wind_speed_kmh = $4,
          wind_direction_deg = $5,
          surface_pressure_hpa = $6,
          weather_code = $7,
          weather_condition = $8,
          retrieved_at = $9,
          freshness_status = $10,
          forecast_json = $11
        WHERE id = $12;`,
        [
          weather.temperatureC,
          weather.relativeHumidityPct,
          weather.precipitationMm,
          weather.windSpeedKmh,
          weather.windDirectionDeg,
          weather.surfacePressureHpa,
          weather.weatherCode,
          weather.condition,
          weather.retrievedAt,
          weather.freshnessStatus,
          JSON.stringify(weather.hourlyForecast ?? []),
          weather.id,
          weather.locationName,
          weather.state || null,
          weather.district || null,
        ],
      );

      return { success: true, persistedToDb: true, isNewer: true };
    } else {
      // Insert new normalized row with PostGIS Point geometry
      await executeQuery(
        `INSERT INTO weather_telemetry (
          id,
          location_name,
          state,
          district,
          coordinates,
          temperature_c,
          relative_humidity_pct,
          precipitation_mm,
          wind_speed_kmh,
          wind_direction_deg,
          surface_pressure_hpa,
          weather_code,
          weather_condition,
          source,
          observed_at,
          retrieved_at,
          freshness_status,
          forecast_json,
          environment
        ) VALUES (
          $1, $2, $3, $4,
          ST_SetSRID(ST_MakePoint($5, $6), 4326),
          $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        );`,
        [
          weather.id,
          weather.locationName,
          weather.state || null,
          weather.district || null,
          lon,
          lat,
          weather.temperatureC,
          weather.relativeHumidityPct,
          weather.precipitationMm,
          weather.windSpeedKmh,
          weather.windDirectionDeg,
          weather.surfacePressureHpa,
          weather.weatherCode,
          weather.condition,
          weather.source || 'Open-Meteo',
          weather.observedAt,
          weather.retrievedAt || new Date().toISOString(),
          weather.freshnessStatus || (weather as any).freshness || 'LIVE',
          JSON.stringify(weather.hourlyForecast ?? []),
          weather.environment || 'REAL',
        ],
      );

      return { success: true, persistedToDb: true, isNewer: true };
    }
  } catch (err: any) {
    console.warn('[WEATHER-STORE] Failed to persist to PostgreSQL (falling back to memory cache):', err.message);
    return {
      success: false,
      persistedToDb: false,
      isNewer: true,
      error: `Database persistence failed: ${err.message}`,
    };
  }
}
