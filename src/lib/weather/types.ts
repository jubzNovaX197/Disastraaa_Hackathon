/**
 * Common Weather Data Contracts & Ingestion Types
 *
 * Defines the normalized operational weather model used across
 * the map, command center, analytics, and intelligence pipelines.
 */

export type WeatherFreshnessStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';

export interface WeatherForecastPoint {
  time: string;
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number;
  condition: string;
}

export interface NormalizedWeather {
  id: string;
  locationName: string;
  state?: string;
  district?: string;
  /** [longitude, latitude] GeoJSON coordinate format */
  coordinates: [number, number];
  temperatureC: number;
  apparentTemperatureC?: number;
  relativeHumidityPct: number;
  precipitationMm: number;
  rainMm?: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustsKmh?: number;
  surfacePressureHpa: number;
  weatherCode: number;
  condition: string;
  icon: string;
  isDay: boolean;
  
  // Metadata & Data Freshness
  source: string;
  sourceId?: string;
  retrievedAt: string;
  observedAt: string;
  validFrom: string;
  validUntil: string;
  freshnessStatus: WeatherFreshnessStatus;

  // Forecast telemetry
  hourlyForecast?: WeatherForecastPoint[];

  environment: 'REAL' | 'DEMO';
}

export interface WeatherIngestionResult {
  success: boolean;
  weather: NormalizedWeather | null;
  error?: string;
  fromCache?: boolean;
}
