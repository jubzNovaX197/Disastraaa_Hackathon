/**
 * DEMO DATA — Pre-computed Flood Risk Results
 *
 * ⚠️  PROTOTYPE / DEMO ONLY — Not real risk assessments.
 *
 * Runs the flood risk engine over all demo risk zones at module init.
 * In a real app, this would be computed server-side or on a schedule.
 *
 * Keyed by RiskZone id — same key space as demoFloodRiskInputs.
 */

import { calculateFloodRisk, explainFloodRisk } from '@/lib/risk/flood';
import type { FloodRiskExplanation } from '@/lib/risk/flood';
import { demoFloodRiskInputs } from './floodRiskInputs';

export const computedFloodRisks: Record<string, FloodRiskExplanation> =
  Object.fromEntries(
    Object.entries(demoFloodRiskInputs).map(([id, inputs]) => [
      id,
      explainFloodRisk(calculateFloodRisk(inputs, false)),
    ]),
  );
