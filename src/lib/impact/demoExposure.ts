/**
 * Demo Exposure Data — per multi-hazard zone
 *
 * ⚠️  SIMULATED / ILLUSTRATIVE DATA ONLY. Not real government data.
 *
 * Keys match MULTI_HAZARD_LOCATIONS ids from computedMultiHazardRisks.ts.
 * Replace with real GIS / PostGIS queries in production.
 */

import type { ZoneExposure } from './types';

export const DEMO_ZONE_EXPOSURE: Record<string, ZoneExposure> = {
  'mh-puri-coast': {
    totalPopulation: 340000,
    totalBuildings:  88000,
    totalRoadKm:     120,
    totalSchools:    42,
    totalHospitals:  4,
    totalShelters:   8,
    areaKm2:         310,
  },
  'mh-mahanadi-delta': {
    totalPopulation: 410000,
    totalBuildings:  105000,
    totalRoadKm:     180,
    totalSchools:    58,
    totalHospitals:  6,
    totalShelters:   10,
    areaKm2:         520,
  },
  'mh-bhubaneswar-urban': {
    totalPopulation: 920000,
    totalBuildings:  248000,
    totalRoadKm:     340,
    totalSchools:    120,
    totalHospitals:  18,
    totalShelters:   14,
    areaKm2:         135,
  },
  'mh-paradip-port': {
    totalPopulation: 210000,
    totalBuildings:  52000,
    totalRoadKm:     90,
    totalSchools:    28,
    totalHospitals:  3,
    totalShelters:   6,
    areaKm2:         180,
  },
  'mh-kendrapara-coast': {
    totalPopulation: 160000,
    totalBuildings:  40000,
    totalRoadKm:     75,
    totalSchools:    22,
    totalHospitals:  2,
    totalShelters:   5,
    areaKm2:         210,
  },
  'mh-visakhapatnam': {
    totalPopulation: 580000,
    totalBuildings:  148000,
    totalRoadKm:     220,
    totalSchools:    80,
    totalHospitals:  12,
    totalShelters:   9,
    areaKm2:         245,
  },
  'mh-godavari-ap': {
    totalPopulation: 340000,
    totalBuildings:  86000,
    totalRoadKm:     150,
    totalSchools:    45,
    totalHospitals:  5,
    totalShelters:   7,
    areaKm2:         380,
  },
  'mh-chilika': {
    totalPopulation: 95000,
    totalBuildings:  22000,
    totalRoadKm:     60,
    totalSchools:    14,
    totalHospitals:  1,
    totalShelters:   4,
    areaKm2:         160,
  },
  'mh-gopalpur-south': {
    totalPopulation: 88000,
    totalBuildings:  20000,
    totalRoadKm:     55,
    totalSchools:    12,
    totalHospitals:  1,
    totalShelters:   3,
    areaKm2:         140,
  },
};

/**
 * Fallback exposure for zones that don't have specific demo data.
 * Uses affectedPopulation from risk result and rough urban density estimates.
 */
export function fallbackExposure(affectedPopulation: number): ZoneExposure {
  // Rough density heuristics for demo purposes
  const buildings  = Math.round(affectedPopulation * 0.24);
  const roadKm     = Math.round(affectedPopulation / 3000);
  const schools    = Math.max(1, Math.round(affectedPopulation / 8000));
  const hospitals  = Math.max(1, Math.round(affectedPopulation / 80000));
  const shelters   = Math.max(1, Math.round(affectedPopulation / 25000));

  return {
    totalPopulation: affectedPopulation,
    totalBuildings:  buildings,
    totalRoadKm:     roadKm,
    totalSchools:    schools,
    totalHospitals:  hospitals,
    totalShelters:   shelters,
  };
}
