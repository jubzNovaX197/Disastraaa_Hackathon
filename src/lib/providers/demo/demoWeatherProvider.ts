/**
 * Demo Weather Provider (Simulated Scenario Mode)
 *
 * Implements the WeatherProvider contract using simulated severe cyclone
 * and monsoonal storm surge telemetry. Strictly isolated to DEMO mode.
 */

import type { NormalizedWeather } from '@/lib/weather/types';
import type { WeatherProvider } from '../types';

export class DemoWeatherProvider implements WeatherProvider {
  async getWeather(
    lat: number,
    lon: number,
    locationName: string = 'Puri Coastal Belt & Town',
  ): Promise<NormalizedWeather> {
    const now = new Date().toISOString();
    return {
      id: 'wx-demo-puri-cyclone',
      locationName,
      state: 'Odisha',
      district: 'Puri District',
      coordinates: [lon, lat],
      temperatureC: 24.2,
      apparentTemperatureC: 21.0,
      relativeHumidityPct: 98,
      precipitationMm: 142.5,
      rainMm: 142.5,
      windSpeedKmh: 145.0,
      windDirectionDeg: 120,
      windGustsKmh: 175.0,
      surfacePressureHpa: 968.2,
      weatherCode: 95,
      condition: 'Severe Cyclonic Storm (Outer Eye-Wall Landfall)',
      icon: '🌀',
      isDay: false,

      source: 'IMD Coastal Doppler Simulation Feed (Scenario Amrita)',
      sourceId: 'scenario-cyclone-amrita-synoptic-t0',
      retrievedAt: now,
      observedAt: now,
      validFrom: now,
      validUntil: new Date(Date.now() + 3600000).toISOString(),
      freshnessStatus: 'LIVE',

      hourlyForecast: [
        { time: 'T0 (Now)', temperatureC: 24.2, precipitationMm: 142.5, weatherCode: 95, condition: 'Severe Cyclonic Storm' },
        { time: 'T+3h', temperatureC: 23.8, precipitationMm: 165.0, weatherCode: 95, condition: 'Peak Storm Surge' },
        { time: 'T+6h', temperatureC: 23.5, precipitationMm: 120.0, weatherCode: 65, condition: 'Heavy Torrential Rain' },
        { time: 'T+12h', temperatureC: 25.1, precipitationMm: 45.0, weatherCode: 63, condition: 'Moderate Riverine Runoff' },
      ],

      environment: 'DEMO',
    };
  }

  async getRegionalWeather(state?: string, district?: string): Promise<NormalizedWeather[]> {
    const single = await this.getWeather(19.8135, 85.8312, 'Puri Coastal Belt');
    return [single];
  }
}

export const demoWeatherProvider = new DemoWeatherProvider();
