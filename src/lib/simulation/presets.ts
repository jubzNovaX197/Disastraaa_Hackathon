/**
 * Response Simulator — Standard Operational Scenario Presets
 *
 * Pre-calibrated operational scenarios for rapid situational testing.
 */

import type { ScenarioConfiguration, ScenarioPreset } from './types';

export const DEFAULT_ADVANCED_CONDITIONS = {
  rainfallMm24h: 0,
  riverSurgeMeters: 0,
  windSpeedKmh: 0,
  stormSurgeMeters: 0,
  roadDisruptionLevel: 'NORMAL' as const,
  shelterPressureFactor: 1.0,
  resourceDeficitPct: 0,
};

export const DEFAULT_SCENARIO_CONFIG: ScenarioConfiguration = {
  id: 'custom-scenario',
  name: 'Custom Operational Scenario',
  hazard: 'FLOOD',
  intensity: 'HIGH',
  duration: '24h',
  targetRegionId: 'ALL',
  populationExposureMultiplier: 1.0,
  advanced: {
    rainfallMm24h: 120,
    riverSurgeMeters: 1.5,
    windSpeedKmh: 40,
    stormSurgeMeters: 0.5,
    roadDisruptionLevel: 'SEVERE',
    shelterPressureFactor: 1.3,
    resourceDeficitPct: 15,
  },
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'preset-super-cyclone',
    name: 'Super Cyclone Landfall (Category 4)',
    description: 'Direct landfall along the Puri-Konark coast with sustained gale winds >190 km/h and 3.8m storm surge.',
    hazard: 'CYCLONE',
    intensity: 'EXTREME',
    duration: '24h',
    targetRegionId: 'mh-puri-coast',
    advanced: {
      rainfallMm24h: 160,
      riverSurgeMeters: 1.2,
      windSpeedKmh: 195,
      stormSurgeMeters: 3.8,
      roadDisruptionLevel: 'CRITICAL',
      shelterPressureFactor: 2.1,
      resourceDeficitPct: 25,
    },
  },
  {
    id: 'preset-catchment-breach',
    name: 'Catastrophic Catchment Inundation',
    description: 'Upstream reservoir discharge synchronizes with heavy localized cloudburst in Mahanadi lowlands.',
    hazard: 'FLOOD',
    intensity: 'EXTREME',
    duration: '48h',
    targetRegionId: 'mh-mahanadi-delta',
    advanced: {
      rainfallMm24h: 220,
      riverSurgeMeters: 2.9,
      windSpeedKmh: 45,
      stormSurgeMeters: 0.6,
      roadDisruptionLevel: 'CRITICAL',
      shelterPressureFactor: 1.8,
      resourceDeficitPct: 20,
    },
  },
  {
    id: 'preset-compound-surge',
    name: 'Compound Coastal & Riverine Surge',
    description: 'Simultaneous cyclone landfall and deltaic embankment overtopping across coastal districts.',
    hazard: 'MULTI_HAZARD',
    intensity: 'HIGH',
    duration: '24h',
    targetRegionId: 'ALL',
    advanced: {
      rainfallMm24h: 135,
      riverSurgeMeters: 1.8,
      windSpeedKmh: 140,
      stormSurgeMeters: 2.4,
      roadDisruptionLevel: 'SEVERE',
      shelterPressureFactor: 1.5,
      resourceDeficitPct: 15,
    },
  },
  {
    id: 'preset-urban-waterlogging',
    name: 'Urban Transit Flash Waterlogging',
    description: 'High-intensity convective thunderstorm overwhelming capital stormwater network.',
    hazard: 'FLOOD',
    intensity: 'MODERATE',
    duration: '12h',
    targetRegionId: 'mh-bhubaneswar-urban',
    advanced: {
      rainfallMm24h: 75,
      riverSurgeMeters: 0.6,
      windSpeedKmh: 35,
      stormSurgeMeters: 0.0,
      roadDisruptionLevel: 'ELEVATED',
      shelterPressureFactor: 1.1,
      resourceDeficitPct: 5,
    },
  },
];
