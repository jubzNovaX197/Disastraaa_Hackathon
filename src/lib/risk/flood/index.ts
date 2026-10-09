/**
 * Flood Risk Engine — Public API
 */

export { calculateFloodRisk } from './calculateFloodRisk';
export { FACTOR_LABELS, explainFloodRisk } from './explainRisk';
export type {
  FloodFactorScores, FloodRiskExplanation, FloodRiskInputs, FloodRiskResult, FloodSeverity
} from './types';
export { FLOOD_WEIGHTS } from './weights';
