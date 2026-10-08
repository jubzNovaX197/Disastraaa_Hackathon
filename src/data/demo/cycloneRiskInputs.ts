/**
 * DEMO DATA — Cyclone Risk Engine Inputs
 *
 * ⚠️  SIMULATED / PROTOTYPE DATA ONLY.
 *     NOT real sensor data. NOT official government thresholds.
 *     For demonstration of the cyclone risk calculation engine only.
 *
 * Keyed by CycloneRiskZone id.
 *
 * Future: replace with live IMD / RSMC cyclone track API adapters.
 */

import type { CycloneRiskInputs } from '@/lib/risk/cyclone';

export const demoCycloneRiskInputs: Record<string, CycloneRiskInputs> = {
  'crz-puri-landfall': {
    windSpeedKmh:                     210,
    rainfallMmPerDay:                 320,
    stormSurgeMetres:                 4.8,
    distanceFromTrackKm:              12,
    exposedPopulation:                340000,
    elevationMetres:                  2,
    historicalCycloneFrequency:       8.5,
    infrastructureVulnerabilityIndex: 0.85,
  },
  'crz-paradip-port': {
    windSpeedKmh:                     185,
    rainfallMmPerDay:                 285,
    stormSurgeMetres:                 3.9,
    distanceFromTrackKm:              35,
    exposedPopulation:                210000,
    elevationMetres:                  4,
    historicalCycloneFrequency:       9.0,
    infrastructureVulnerabilityIndex: 0.72,
  },
  'crz-kendrapara-coast': {
    windSpeedKmh:                     155,
    rainfallMmPerDay:                 230,
    stormSurgeMetres:                 2.6,
    distanceFromTrackKm:              55,
    exposedPopulation:                160000,
    elevationMetres:                  3,
    historicalCycloneFrequency:       7.0,
    infrastructureVulnerabilityIndex: 0.65,
  },
  'crz-gopalpur-south': {
    windSpeedKmh:                     130,
    rainfallMmPerDay:                 190,
    stormSurgeMetres:                 1.8,
    distanceFromTrackKm:              90,
    exposedPopulation:                88000,
    elevationMetres:                  6,
    historicalCycloneFrequency:       5.5,
    infrastructureVulnerabilityIndex: 0.55,
  },
  'crz-visakha-cyclone': {
    windSpeedKmh:                     175,
    rainfallMmPerDay:                 260,
    stormSurgeMetres:                 3.2,
    distanceFromTrackKm:              45,
    exposedPopulation:                580000,
    elevationMetres:                  5,
    historicalCycloneFrequency:       6.5,
    infrastructureVulnerabilityIndex: 0.60,
  },
  'crz-chilika-surge': {
    windSpeedKmh:                     100,
    rainfallMmPerDay:                 140,
    stormSurgeMetres:                 1.2,
    distanceFromTrackKm:              130,
    exposedPopulation:                95000,
    elevationMetres:                  1,
    historicalCycloneFrequency:       4.0,
    infrastructureVulnerabilityIndex: 0.40,
  },
};
