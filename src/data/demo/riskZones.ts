/**
 * DEMO DATA — Risk Zones
 *
 * ⚠️  SIMULATED DATA ONLY. Not real government data. For prototype demonstration.
 *
 * Locations are based on real Odisha/Andhra Pradesh geography but all
 * risk assessments are entirely fictional.
 */

import type { RiskZone } from '@/data/types';

export const demoRiskZones: RiskZone[] = [
  {
    id: 'rz-puri-coast',
    name: 'Puri Coastal Belt',
    severity: 'CRITICAL',
    primaryHazard: 'CYCLONE',
    riskScore: 92,
    affectedPopulation: 285000,
    description: 'High-exposure coastal strip vulnerable to cyclone storm surge and coastal flooding.',
    coordinates: [[
      [85.65, 19.95],
      [85.95, 19.95],
      [85.95, 19.75],
      [85.65, 19.75],
      [85.65, 19.95],
    ]],
  },
  {
    id: 'rz-mahanadi-delta',
    name: 'Mahanadi Delta Flood Plain',
    severity: 'HIGH',
    primaryHazard: 'FLOOD',
    riskScore: 78,
    affectedPopulation: 410000,
    description: 'Low-lying delta region with recurring flood events during monsoon season.',
    coordinates: [[
      [86.10, 20.35],
      [86.55, 20.35],
      [86.55, 20.05],
      [86.10, 20.05],
      [86.10, 20.35],
    ]],
  },
  {
    id: 'rz-bhubaneswar-urban',
    name: 'Bhubaneswar Urban Fringe',
    severity: 'MODERATE',
    primaryHazard: 'FLOOD',
    riskScore: 54,
    affectedPopulation: 920000,
    description: 'Rapidly urbanising area with inadequate stormwater drainage; flash-flood risk.',
    coordinates: [[
      [85.70, 20.38],
      [85.95, 20.38],
      [85.95, 20.18],
      [85.70, 20.18],
      [85.70, 20.38],
    ]],
  },
  {
    id: 'rz-godavari-ap',
    name: 'Godavari Floodplain (AP)',
    severity: 'HIGH',
    primaryHazard: 'FLOOD',
    riskScore: 81,
    affectedPopulation: 340000,
    description: 'River basin prone to seasonal flooding; embankment breach risk.',
    coordinates: [[
      [81.55, 17.05],
      [81.95, 17.05],
      [81.95, 16.75],
      [81.55, 16.75],
      [81.55, 17.05],
    ]],
  },
  {
    id: 'rz-visakha-hills',
    name: 'Visakhapatnam Eastern Ghats',
    severity: 'MODERATE',
    primaryHazard: 'LANDSLIDE',
    riskScore: 61,
    affectedPopulation: 55000,
    description: 'Steep hilly terrain susceptible to landslides during heavy rainfall.',
    coordinates: [[
      [83.10, 18.30],
      [83.40, 18.30],
      [83.40, 18.05],
      [83.10, 18.05],
      [83.10, 18.30],
    ]],
  },
  {
    id: 'rz-chilika-south',
    name: 'Chilika Lake Southern Shore',
    severity: 'LOW',
    primaryHazard: 'STORM_SURGE',
    riskScore: 35,
    affectedPopulation: 72000,
    description: 'Low-lying shoreline exposed to storm surge; moderate risk in off-season.',
    coordinates: [[
      [85.28, 19.62],
      [85.52, 19.62],
      [85.52, 19.42],
      [85.28, 19.42],
      [85.28, 19.62],
    ]],
  },
];
