/**
 * DEMO DATA — Active Flood / Hazard Areas
 *
 * ⚠️  SIMULATED DATA ONLY. Not real government data. For prototype demonstration.
 */

import type { FloodArea } from '@/data/types';

export const demoFloodAreas: FloodArea[] = [
  {
    id: 'fa-cuttack-north',
    name: 'Cuttack North Inundation',
    severity: 'CRITICAL',
    type: 'FLOOD',
    depthMeters: 2.4,
    areaKm2: 18.5,
    lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    description: 'Active flood — Mahanadi upstream release causing inundation of low-lying wards.',
    coordinates: [[
      [85.85, 20.52],
      [85.98, 20.52],
      [85.98, 20.42],
      [85.85, 20.42],
      [85.85, 20.52],
    ]],
  },
  {
    id: 'fa-kendrapara',
    name: 'Kendrapara District Flooding',
    severity: 'HIGH',
    type: 'FLOOD',
    depthMeters: 1.8,
    areaKm2: 42.0,
    lastUpdated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    description: 'Widespread flooding across Kendrapara district; 12 villages isolated.',
    coordinates: [[
      [86.40, 20.55],
      [86.65, 20.55],
      [86.65, 20.38],
      [86.40, 20.38],
      [86.40, 20.55],
    ]],
  },
  {
    id: 'fa-puri-surge',
    name: 'Puri Storm Surge Zone',
    severity: 'CRITICAL',
    type: 'STORM_SURGE',
    depthMeters: 3.1,
    areaKm2: 9.2,
    lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    description: 'Active storm surge inundation — cyclone landfall imminent. Evacuation in progress.',
    coordinates: [[
      [85.78, 19.82],
      [85.92, 19.82],
      [85.92, 19.72],
      [85.78, 19.72],
      [85.78, 19.82],
    ]],
  },
  {
    id: 'fa-bhadrak',
    name: 'Bhadrak Riverine Flood',
    severity: 'HIGH',
    type: 'FLOOD',
    depthMeters: 1.2,
    areaKm2: 28.0,
    lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    description: 'Baitarani river overflow affecting agricultural land and riverside habitations.',
    coordinates: [[
      [86.48, 21.10],
      [86.72, 21.10],
      [86.72, 20.90],
      [86.48, 20.90],
      [86.48, 21.10],
    ]],
  },
  {
    id: 'fa-vizag-heavy-rain',
    name: 'Visakhapatnam Urban Waterlogging',
    severity: 'MODERATE',
    type: 'FLOOD',
    depthMeters: 0.6,
    areaKm2: 7.5,
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    description: 'Heavy rainfall causing urban waterlogging; road access disrupted.',
    coordinates: [[
      [83.22, 17.76],
      [83.38, 17.76],
      [83.38, 17.64],
      [83.22, 17.64],
      [83.22, 17.76],
    ]],
  },
];
