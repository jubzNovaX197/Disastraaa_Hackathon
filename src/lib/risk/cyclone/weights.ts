/**
 * Cyclone Risk Engine — Factor Weights
 *
 * ⚠️  PROTOTYPE WEIGHTS ONLY — not calibrated to real scientific models.
 *
 * Weights must sum to 1.0.
 * Adjust here to retune the model without touching calculation logic.
 */

import type { CycloneFactorScores } from './types';

export const CYCLONE_WEIGHTS: Record<keyof CycloneFactorScores, number> = {
  windSpeed:                   0.25,
  stormSurge:                  0.20,
  trackProximity:              0.18,
  rainfall:                    0.14,
  elevation:                   0.10,
  historicalFrequency:         0.07,
  population:                  0.04,
  infrastructureVulnerability: 0.02,
};

// Verify at module load — catches weight-sum drift at dev time
const weightSum = Object.values(CYCLONE_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1.0) > 0.001) {
  throw new Error(
    `[CycloneRiskEngine] Weights must sum to 1.0, got ${weightSum.toFixed(4)}`,
  );
}
