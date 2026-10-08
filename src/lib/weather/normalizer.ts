/**
 * Weather Telemetry Normalizer
 *
 * Normalizes raw external weather responses into Disastraaa's common weather contract.
 * Translates WMO weather codes and computes real-time data freshness states.
 */

import type { OpenMeteoRawResponse } from './openMeteoClient';
import type { NormalizedWeather, WeatherFreshnessStatus, WeatherForecastPoint } from './types';

export interface WeatherConditionInfo {
  label: string;
  icon: string;
  category: 'CLEAR' | 'CLOUDY' | 'FOG' | 'DRIZZLE' | 'RAIN' | 'SNOW' | 'THUNDERSTORM';
}

/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */
export function interpretWmoCode(code: number): WeatherConditionInfo {
  switch (code) {
    case 0:
      return { label: 'Clear Sky', icon: '☀️', category: 'CLEAR' };
    case 1:
      return { label: 'Mainly Clear', icon: '🌤️', category: 'CLEAR' };
    case 2:
      return { label: 'Partly Cloudy', icon: '⛅', category: 'CLOUDY' };
    case 3:
      return { label: 'Overcast', icon: '☁️', category: 'CLOUDY' };
    case 45:
    case 48:
      return { label: 'Fog & Mist', icon: '🌫️', category: 'FOG' };
    case 51:
      return { label: 'Light Drizzle', icon: '🌦️', category: 'DRIZZLE' };
    case 53:
      return { label: 'Moderate Drizzle', icon: '🌧️', category: 'DRIZZLE' };
    case 55:
      return { label: 'Dense Drizzle', icon: '🌧️', category: 'DRIZZLE' };
    case 61:
      return { label: 'Slight Rain', icon: '🌦️', category: 'RAIN' };
    case 63:
      return { label: 'Moderate Rain', icon: '🌧️', category: 'RAIN' };
    case 65:
      return { label: 'Heavy Rain', icon: '🌧️', category: 'RAIN' };
    case 66:
    case 67:
      return { label: 'Freezing Rain', icon: '🌨️', category: 'RAIN' };
    case 71:
    case 73:
    case 75:
      return { label: 'Snow Fall', icon: '❄️', category: 'SNOW' };
    case 80:
      return { label: 'Light Rain Showers', icon: '🌦️', category: 'RAIN' };
    case 81:
      return { label: 'Moderate Showers', icon: '🌧️', category: 'RAIN' };
    case 82:
      return { label: 'Violent Rain Showers', icon: '⛈️', category: 'RAIN' };
    case 95:
      return { label: 'Thunderstorm', icon: '⛈️', category: 'THUNDERSTORM' };
    case 96:
    case 99:
      return { label: 'Severe Thunderstorm with Hail', icon: '⛈️', category: 'THUNDERSTORM' };
    default:
      return { label: 'Variable Atmospheric Conditions', icon: '🌤️', category: 'CLEAR' };
  }
}

/**
 * Computes strict operational data freshness:
 * - Under 3 hours: LIVE
 * - Under 12 hours: RECENT
 * - 12+ hours: STALE
 * - Missing/Error: UNAVAILABLE
 */
export function computeFreshnessStatus(observedAtIso: string): WeatherFreshnessStatus {
  try {
    const observedMs = new Date(observedAtIso).getTime();
    if (isNaN(observedMs)) return 'UNAVAILABLE';
    const ageHours = (Date.now() - observedMs) / (1000 * 60 * 60);

    if (ageHours < 3) return 'LIVE';
    if (ageHours < 12) return 'RECENT';
    return 'STALE';
  } catch {
    return 'UNAVAILABLE';
  }
}

/**
 * Normalizes Open-Meteo payload into common NormalizedWeather model
 */
export function normalizeOpenMeteoResponse(
  raw: OpenMeteoRawResponse,
  locationName: string,
  state?: string,
  district?: string,
): NormalizedWeather | null {
  if (!raw.current) return null;

  const current = raw.current;
  const conditionInfo = interpretWmoCode(current.weather_code);
  const nowIso = new Date().toISOString();
  
  // Format observed time: Open-Meteo returns ISO-like 'YYYY-MM-DDTHH:mm'
  const observedAtIso = current.time ? new Date(current.time).toISOString() : nowIso;
  const validUntilIso = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // valid 1h
  const freshness = computeFreshnessStatus(observedAtIso);

  // Hourly forecast
  const hourlyForecast: WeatherForecastPoint[] = [];
  if (raw.hourly && Array.isArray(raw.hourly.time)) {
    const len = Math.min(raw.hourly.time.length, 12);
    for (let i = 0; i < len; i++) {
      const code = raw.hourly.weather_code[i] ?? 0;
      hourlyForecast.push({
        time: raw.hourly.time[i],
        temperatureC: raw.hourly.temperature_2m[i] ?? 0,
        precipitationMm: raw.hourly.precipitation[i] ?? 0,
        weatherCode: code,
        condition: interpretWmoCode(code).label,
      });
    }
  }

  const id = `wx-${Math.round(raw.latitude * 1000)}-${Math.round(raw.longitude * 1000)}`;

  return {
    id,
    locationName,
    state,
    district,
    coordinates: [raw.longitude, raw.latitude],
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature,
    relativeHumidityPct: Math.round(current.relative_humidity_2m),
    precipitationMm: current.precipitation,
    rainMm: current.rain,
    windSpeedKmh: current.wind_speed_10m,
    windDirectionDeg: current.wind_direction_10m,
    windGustsKmh: current.wind_gusts_10m,
    surfacePressureHpa: current.surface_pressure,
    weatherCode: current.weather_code,
    condition: conditionInfo.label,
    icon: conditionInfo.icon,
    isDay: Boolean(current.is_day ?? 1),

    source: 'Open-Meteo ECMWF/GFS Blend',
    sourceId: `open-meteo-${raw.latitude.toFixed(2)}-${raw.longitude.toFixed(2)}`,
    retrievedAt: nowIso,
    observedAt: observedAtIso,
    validFrom: observedAtIso,
    validUntil: validUntilIso,
    freshnessStatus: freshness,

    hourlyForecast,
    environment: 'REAL',
  };
}
