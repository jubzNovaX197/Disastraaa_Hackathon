/**
 * Flood Risk Engine — Factor Weights
 *
 * ⚠️  PROTOTYPE WEIGHTS ONLY — not calibrated to real scientific models.
 *
 * Weights must sum to 1.0.
 * Adjust here to retune the model without touching calculation logic.
 */

import type { FloodFactorScores } from './types';

export const FLOOD_WEIGHTS: Record<keyof FloodFactorScores, number> = {
  rainfall:                    0.25,
  riverLevel:                  0.22,
  elevation:                   0.18,
  distanceFromRiver:           0.12,
  population:                  0.10,
  historicalFrequency:         0.08,
  infrastructureVulnerability: 0.05,
};

// Verify at module load — catches weight-sum drift at dev time
const weightSum = Object.values(FLOOD_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1.0) > 0.001) {
  throw new Error(
    `[FloodRiskEngine] Weights must sum to 1.0, got ${weightSum.toFixed(4)}`,
  );
}
