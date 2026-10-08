/**
 * Open-Meteo Weather API Client
 *
 * Implements non-commercial weather ingestion from Open-Meteo.
 * Open-Meteo provides free, open-source weather telemetry without requiring an API key.
 *
 * Features:
 * - 8-second request timeout via AbortController
 * - Rate-limit detection & HTTP 429 backoff handling
 * - Comprehensive error trapping with graceful degradation
 */

export interface OpenMeteoRawResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  current?: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature?: number;
    is_day?: number;
    precipitation: number;
    rain?: number;
    weather_code: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weather_code: number[];
  };
}

export interface FetchWeatherOptions {
  timeoutMs?: number;
}

export class OpenMeteoClient {
  private static readonly BASE_URL = 'https://api.open-meteo.com/v1/forecast';
  private static readonly DEFAULT_TIMEOUT_MS = 8000;

  /**
   * Fetches current meteorological conditions and hourly forecast for [lat, lon]
   */
  async fetchForecast(
    latitude: number,
    longitude: number,
    options?: FetchWeatherOptions,
  ): Promise<{ success: boolean; data?: OpenMeteoRawResponse; error?: string; status?: number }> {
    const timeoutMs = options?.timeoutMs ?? OpenMeteoClient.DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'rain',
        'weather_code',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      hourly: ['temperature_2m', 'precipitation', 'weather_code'].join(','),
      forecast_days: '1',
      timezone: 'auto',
    });

    const url = `${OpenMeteoClient.BASE_URL}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Disastraaa-Emergency-Platform/1.0 (Disaster Management Operations)',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timer);

      if (response.status === 429) {
        return {
          success: false,
          error: 'Open-Meteo rate limit reached. Backing off gracefully.',
          status: 429,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: `Open-Meteo HTTP error ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      const json = (await response.json()) as OpenMeteoRawResponse;
      return { success: true, data: json };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: `Open-Meteo request timed out after ${timeoutMs}ms.`,
          status: 408,
        };
      }
      return {
        success: false,
        error: err.message || 'Unknown network error connecting to Open-Meteo.',
      };
    }
  }
}

export const openMeteoClient = new OpenMeteoClient();
