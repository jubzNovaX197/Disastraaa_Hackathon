/**
 * DEMO DATA — Flood Risk Engine Inputs
 *
 * ⚠️  SIMULATED / PROTOTYPE DATA ONLY.
 *     NOT real sensor data. NOT official government thresholds.
 *     For demonstration of the flood risk calculation engine only.
 *
 * Keyed by RiskZone id.
 *
 * Future: replace values with live API adapters
 * (IMDAA rainfall, CWC river gauges, SRTM elevation, census population).
 */

import type { FloodRiskInputs } from '@/lib/risk/flood';

export const demoFloodRiskInputs: Record<string, FloodRiskInputs> = {
  'rz-puri-coast': {
    rainfallIntensityMmPerDay:        245,
    riverLevelMetres:                 3.8,
    elevationMetres:                  2,
    distanceFromRiverKm:              0.4,
    exposedPopulation:                285000,
    historicalFloodFrequency:         8.5,
    infrastructureVulnerabilityIndex: 0.82,
  },
  'rz-mahanadi-delta': {
    rainfallIntensityMmPerDay:        188,
    riverLevelMetres:                 4.2,
    elevationMetres:                  5,
    distanceFromRiverKm:              1.2,
    exposedPopulation:                410000,
    historicalFloodFrequency:         9.0,
    infrastructureVulnerabilityIndex: 0.68,
  },
  'rz-bhubaneswar-urban': {
    rainfallIntensityMmPerDay:        120,
    riverLevelMetres:                 1.5,
    elevationMetres:                  25,
    distanceFromRiverKm:              4.5,
    exposedPopulation:                920000,
    historicalFloodFrequency:         4.0,
    infrastructureVulnerabilityIndex: 0.45,
  },
  'rz-godavari-ap': {
    rainfallIntensityMmPerDay:        210,
    riverLevelMetres:                 3.5,
    elevationMetres:                  8,
    distanceFromRiverKm:              0.8,
    exposedPopulation:                340000,
    historicalFloodFrequency:         7.5,
    infrastructureVulnerabilityIndex: 0.72,
  },
  'rz-visakha-hills': {
    rainfallIntensityMmPerDay:        95,
    riverLevelMetres:                 0.5,
    elevationMetres:                  180,
    distanceFromRiverKm:              6.0,
    exposedPopulation:                55000,
    historicalFloodFrequency:         2.5,
    infrastructureVulnerabilityIndex: 0.38,
  },
  'rz-chilika-south': {
    rainfallIntensityMmPerDay:        65,
    riverLevelMetres:                 0.8,
    elevationMetres:                  1,
    distanceFromRiverKm:              0.2,
    exposedPopulation:                72000,
    historicalFloodFrequency:         3.5,
    infrastructureVulnerabilityIndex: 0.30,
  },
};
