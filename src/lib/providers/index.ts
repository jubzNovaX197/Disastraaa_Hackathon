/**
 * Data Providers Entry Point
 *
 * Resolves the appropriate data provider (REAL vs DEMO) based on the environment.
 * The application consumes this facade — ensuring clean separation between
 * real operational data and simulated scenario data without code duplication.
 */

import type { AppEnvironment } from '@/lib/env';
import {
  demoAlertProvider,
  demoDataProvider,
  demoHazardProvider,
  demoIncidentProvider,
  demoReportProvider,
  demoRoadProvider,
  demoShelterProvider,
} from './demo/demoProvider';
import { demoWeatherProvider } from './demo/demoWeatherProvider';
import {
  realAlertProvider,
  realDataProvider,
  realHazardProvider,
  realIncidentProvider,
  realReportProvider,
  realRoadProvider,
  realShelterProvider,
} from './real/realProvider';
import { realWeatherProvider } from './real/realWeatherProvider';
import type {
  AlertProvider,
  DisasterDataProvider,
  HazardProvider,
  IncidentProvider,
  ReportProvider,
  RoadProvider,
  ShelterProvider,
  WeatherProvider,
} from './types';

export {
  demoAlertProvider, demoDataProvider, demoHazardProvider, demoIncidentProvider, demoReportProvider, demoRoadProvider,
  demoShelterProvider
} from './demo/demoProvider';
export { demoWeatherProvider } from './demo/demoWeatherProvider';
export {
  realAlertProvider, realDataProvider, realHazardProvider, realIncidentProvider, realReportProvider, realRoadProvider,
  realShelterProvider
} from './real/realProvider';
export { realWeatherProvider } from './real/realWeatherProvider';
export * from './types';

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
