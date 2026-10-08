/**
 * DEMO DATA — Aggregate export
 *
 * ⚠️  ALL DATA IS SIMULATED. For prototype demonstration only.
 *
 * Replace individual imports with real API adapters to swap out demo data
 * without changing any map or UI component.
 */

import { demoRiskZones }      from './riskZones';
import { demoFloodAreas }     from './floodAreas';
import { demoShelters }       from './shelters';
import { demoAlerts }         from './alerts';
import { demoInfrastructure } from './infrastructure';
import { demoBlockedRoads }   from './blockedRoads';
import { demoCitizenReports } from './citizenReports';
import { demoRoadSegments }   from './roads';
import type { DisasterDataset } from '@/data/types';

export const demoDataset: DisasterDataset = {
  riskZones:      demoRiskZones,
  floodAreas:     demoFloodAreas,
  shelters:       demoShelters,
  alerts:         demoAlerts,
  infrastructure: demoInfrastructure,
  blockedRoads:   demoBlockedRoads,
  citizenReports: demoCitizenReports,
  roads:          demoRoadSegments,
  lastRefreshed:  new Date().toISOString(),
};

// Re-export individual collections for components that only need one type
export {
  demoRiskZones,
  demoFloodAreas,
  demoShelters,
  demoAlerts,
  demoInfrastructure,
  demoBlockedRoads,
  demoCitizenReports,
  demoRoadSegments,
};

export type { DisasterDataset };

// Cyclone-specific exports
export { demoCycloneZones, demoCycloneTrack } from './cycloneZones';
export { demoCycloneRiskInputs } from './cycloneRiskInputs';
export { computedCycloneRisks } from './computedCycloneRisks';

// Flood risk computed results
export { computedFloodRisks } from './computedFloodRisks';

// Multi-hazard composite results
export { computedMultiHazardRisks, ZONE_TO_MULTI_HAZARD_ID } from './computedMultiHazardRisks';

// Resource inventory exports (Task 8)
export { DEMO_ZONE_INVENTORIES, getZoneResourceInventory } from './resources';
