/**
 * Multi-Hazard Risk Engine — Public API
 */

export { calculateMultiHazardRisk } from './calculate';
export type { MultiHazardInputs } from './calculate';
export { DATA_QUALITY_LABEL, HAZARD_LABEL, explainMultiHazardRisk } from './explain';
export type {
  DataQuality, HazardContribution, MultiHazardRiskExplanation, MultiHazardRiskResult
} from './types';
export { MULTI_HAZARD_WEIGHTS } from './weights';
