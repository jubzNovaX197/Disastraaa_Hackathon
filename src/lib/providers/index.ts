/**
 * Data Providers Entry Point
 *
 * Resolves the appropriate data provider (REAL vs DEMO) based on the environment.
 * The application consumes this facade — ensuring clean separation between
 * real operational data and simulated scenario data without code duplication.
 */

import type { AppEnvironment } from '@/lib/env';
import type {
  DisasterDataProvider,
  AlertProvider,
  HazardProvider,
  RoadProvider,
  ShelterProvider,
  ReportProvider,
  IncidentProvider,
} from './types';
import {
  demoDataProvider,
  demoAlertProvider,
  demoHazardProvider,
  demoRoadProvider,
  demoShelterProvider,
  demoReportProvider,
  demoIncidentProvider,
} from './demo/demoProvider';
import { demoWeatherProvider } from './demo/demoWeatherProvider';
import {
  realDataProvider,
  realAlertProvider,
  realHazardProvider,
  realRoadProvider,
  realShelterProvider,
  realReportProvider,
  realIncidentProvider,
} from './real/realProvider';
import { realWeatherProvider } from './real/realWeatherProvider';
import type { WeatherProvider } from './types';

export * from './types';
export {
  demoDataProvider,
  demoAlertProvider,
  demoHazardProvider,
  demoRoadProvider,
  demoShelterProvider,
  demoReportProvider,
  demoIncidentProvider,
} from './demo/demoProvider';
export {
  realDataProvider,
  realAlertProvider,
  realHazardProvider,
  realRoadProvider,
  realShelterProvider,
  realReportProvider,
  realIncidentProvider,
} from './real/realProvider';
export { demoWeatherProvider } from './demo/demoWeatherProvider';
export { realWeatherProvider } from './real/realWeatherProvider';

export function getDatasetProvider(env: AppEnvironment): DisasterDataProvider {
  return env === 'DEMO' ? demoDataProvider : realDataProvider;
}

export function getAlertProvider(env: AppEnvironment): AlertProvider {
  return env === 'DEMO' ? demoAlertProvider : realAlertProvider;
}

export function getHazardProvider(env: AppEnvironment): HazardProvider {
  return env === 'DEMO' ? demoHazardProvider : realHazardProvider;
}

export function getRoadProvider(env: AppEnvironment): RoadProvider {
  return env === 'DEMO' ? demoRoadProvider : realRoadProvider;
}

export function getShelterProvider(env: AppEnvironment): ShelterProvider {
  return env === 'DEMO' ? demoShelterProvider : realShelterProvider;
}

export function getReportProvider(env: AppEnvironment): ReportProvider {
  return env === 'DEMO' ? demoReportProvider : realReportProvider;
}

export function getIncidentProvider(env: AppEnvironment): IncidentProvider {
  return env === 'DEMO' ? demoIncidentProvider : realIncidentProvider;
}

export function getWeatherProvider(env: AppEnvironment): WeatherProvider {
  return env === 'DEMO' ? demoWeatherProvider : realWeatherProvider;
}
