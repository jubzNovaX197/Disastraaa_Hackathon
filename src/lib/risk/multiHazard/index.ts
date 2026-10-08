/**
 * Multi-Hazard Risk Engine — Public API
 */

export { calculateMultiHazardRisk } from './calculate';
export type { MultiHazardInputs } from './calculate';
export { explainMultiHazardRisk, DATA_QUALITY_LABEL, HAZARD_LABEL } from './explain';
export { MULTI_HAZARD_WEIGHTS } from './weights';
export type {
  HazardContribution,
  MultiHazardRiskResult,
  MultiHazardRiskExplanation,
  DataQuality,
} from './types';
