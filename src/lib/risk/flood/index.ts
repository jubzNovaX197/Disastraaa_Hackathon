/**
 * Flood Risk Engine — Public API
 */

export { calculateFloodRisk } from './calculateFloodRisk';
export { explainFloodRisk, FACTOR_LABELS } from './explainRisk';
export { FLOOD_WEIGHTS } from './weights';
export type {
  FloodRiskInputs,
  FloodFactorScores,
  FloodRiskResult,
  FloodRiskExplanation,
  FloodSeverity,
} from './types';
