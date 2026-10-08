/**
 * Resource Requirement Planning Engine — Public API
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * Deterministic decision-support model — not official government standards.
 */

import type { HazardType, Severity } from '@/types';
import type { HistoricalDisasterEvent } from '@/lib/historical/types';
import { getLocationHistory } from '@/lib/historical/engine';
import { ZONE_TO_REGION_CODE } from '@/lib/planning/shelter';
import type { ImpactResult } from '@/lib/impact/types';
import type { ShelterPlanningResult } from '@/lib/planning/shelter/types';
import { calculateResourceRequirement } from './engine';
import type {
  ResourceCategory,
  ResourcePlanningInputs,
  ResourcePlanningResult,
  ResourcePrioritySummary,
  ResourceRecommendation,
  ResourceRequirementItem,
  ResourceStatus,
  ZoneResourceInventory,
} from './types';

export type {
  ResourceCategory,
  ResourcePlanningInputs,
  ResourcePlanningResult,
  ResourcePrioritySummary,
  ResourceRecommendation,
  ResourceRequirementItem,
  ResourceStatus,
  ZoneResourceInventory,
};

export { calculateResourceRequirement };
export { HAZARD_MULTIPLIERS, BASE_RATES, STATUS_THRESHOLDS, deriveResourceStatus } from './rules';

export interface BuildResourcePlanningParams {
  zoneId:              string;
  zoneName:            string;
  affectedPopulation:  number;
  severity:            Severity;
  riskScore:           number;
  dominantHazard:      HazardType;
  impactResult?:       ImpactResult | null;
  shelterPlanning?:    ShelterPlanningResult | null;
  historicalEvents?:   HistoricalDisasterEvent[];
  customInventory?:    ZoneResourceInventory;
}

/**
 * Builds the complete resource requirement planning result for a given zone by
 * integrating intelligence from:
 * 1. Impact Prediction (buildings, roads, hospitals)
 * 2. Shelter Planning (available shelter slots & shelter gap)
 * 3. Historical Disaster Events (historical average impact)
 * 4. District Demo Inventories (local stockpiles)
 */
export function buildResourcePlanningForZone({
  zoneId,
  zoneName,
  affectedPopulation,
  severity,
  riskScore,
  dominantHazard,
  impactResult,
  shelterPlanning,
  historicalEvents = [],
  customInventory,
}: BuildResourcePlanningParams): ResourcePlanningResult {
  // 1. Resolve historical average if available
  const regionCode = ZONE_TO_REGION_CODE[zoneId];
  let historicalAvgAffectedPop = 0;
  if (regionCode && historicalEvents.length > 0) {
    const history = getLocationHistory(historicalEvents, regionCode, zoneName);
    historicalAvgAffectedPop = history.summary.avgAffectedPopulation;
  }

  // 2. Extract impact indicators if available
  const buildingsAffected = impactResult?.buildings.value ?? 0;
  const roadsAffectedKm   = impactResult?.roads.value ?? 0;
  const schoolsAffected   = impactResult?.schools.value ?? 0;
  const hospitalsAffected = impactResult?.hospitals.value ?? 0;

  // 3. Extract shelter capacity from Task 7 shelter engine if available
  const shelterAvailableSlots = shelterPlanning?.availableCapacity;

  // 4. Run calculation
  return calculateResourceRequirement({
    zoneId,
    zoneName,
    dominantHazard,
    riskScore,
    severity,
    affectedPopulation,
    buildingsAffected,
    roadsAffectedKm,
    schoolsAffected,
    hospitalsAffected,
    shelterAvailableSlots,
    historicalAvgAffectedPop,
    inventory: customInventory,
  });
}
