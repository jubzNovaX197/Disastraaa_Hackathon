/**
 * DEMO DATA — Cyclone Risk Zones
 *
 * ⚠️  SIMULATED DATA ONLY. Not real government data. For prototype demonstration.
 *
 * Locations are based on real Odisha/Andhra Pradesh geography but all
 * risk assessments are entirely fictional.
 */

import type { RiskZone } from '@/data/types';

export const demoCycloneZones: RiskZone[] = [
  {
    id: 'crz-puri-landfall',
    name: 'Puri Landfall Zone',
    severity: 'CRITICAL',
    primaryHazard: 'CYCLONE',
    riskScore: 91,
    affectedPopulation: 340000,
    description: 'Projected cyclone landfall corridor — maximum wind and storm surge impact zone.',
    coordinates: [[
      [85.62, 20.00],
      [85.92, 20.00],
      [85.92, 19.70],
      [85.62, 19.70],
      [85.62, 20.00],
    ]],
  },
  {
    id: 'crz-paradip-port',
    name: 'Paradip Port Corridor',
    severity: 'HIGH',
    primaryHazard: 'CYCLONE',
    riskScore: 76,
    affectedPopulation: 210000,
    description: 'Major port city in the cyclone outer wind field; significant industrial exposure.',
    coordinates: [[
      [86.55, 20.40],
      [86.82, 20.40],
      [86.82, 20.15],
      [86.55, 20.15],
      [86.55, 20.40],
    ]],
  },
  {
    id: 'crz-kendrapara-coast',
    name: 'Kendrapara Coastal Fringe',
    severity: 'HIGH',
    primaryHazard: 'CYCLONE',
    riskScore: 65,
    affectedPopulation: 160000,
    description: 'Low-lying coastal fringe exposed to storm surge and cyclonic rainfall.',
    coordinates: [[
      [86.80, 20.60],
      [87.10, 20.60],
      [87.10, 20.35],
      [86.80, 20.35],
      [86.80, 20.60],
    ]],
  },
  {
    id: 'crz-gopalpur-south',
    name: 'Gopalpur South Coast',
    severity: 'MODERATE',
    primaryHazard: 'CYCLONE',
    riskScore: 48,
    affectedPopulation: 88000,
    description: 'Moderate exposure on southern Odisha coast; outer wind bands expected.',
    coordinates: [[
      [84.80, 19.30],
      [85.05, 19.30],
      [85.05, 19.10],
      [84.80, 19.10],
      [84.80, 19.30],
    ]],
  },
  {
    id: 'crz-visakha-cyclone',
    name: 'Visakhapatnam Cyclone Zone',
    severity: 'HIGH',
    primaryHazard: 'CYCLONE',
    riskScore: 72,
    affectedPopulation: 580000,
    description: 'Major urban coastal city exposed to cyclone winds and storm surge; dense population.',
    coordinates: [[
      [83.10, 17.80],
      [83.45, 17.80],
      [83.45, 17.55],
      [83.10, 17.55],
      [83.10, 17.80],
    ]],
  },
  {
    id: 'crz-chilika-surge',
    name: 'Chilika Storm Surge Zone',
    severity: 'MODERATE',
    primaryHazard: 'CYCLONE',
    riskScore: 36,
    affectedPopulation: 95000,
    description: 'Chilika lagoon shoreline — moderate storm surge risk from outer cyclone bands.',
    coordinates: [[
      [85.15, 19.68],
      [85.48, 19.68],
      [85.48, 19.45],
      [85.15, 19.45],
      [85.15, 19.68],
    ]],
  },
];

/**
 * DEMO cyclone track — simulated path of a Bay of Bengal cyclone
 * approaching Odisha coast.
 *
 * ⚠️  SIMULATED track. Not a real cyclone. For visualisation only.
 *
 * Coordinates: [longitude, latitude] — from deep sea to landfall.
 */
export const demoCycloneTrack = {
  id: 'demo-cyclone-track-01',
  name: 'DEMO Cyclone Track (Simulated)',
  /** Track waypoints from origin to projected landfall [lng, lat] */
  coordinates: [
    [87.50, 15.80],
    [87.00, 16.60],
    [86.50, 17.40],
    [86.10, 18.20],
    [85.90, 18.90],
    [85.80, 19.50],
    [85.75, 19.80],
  ] as [number, number][],
  /** Projected landfall point */
  landfallPoint: [85.75, 19.80] as [number, number],
};
