/**
 * DEMO DATA — Pre-computed Cyclone Risk Results
 *
 * ⚠️  PROTOTYPE / DEMO ONLY — Not real risk assessments.
 *
 * Runs the cyclone risk engine over all demo cyclone zones at module init.
 * In a real app, this would be computed server-side or on a schedule.
 *
 * Keyed by CycloneRiskZone id — same key space as demoCycloneRiskInputs.
 */

import { calculateCycloneRisk, explainCycloneRisk } from '@/lib/risk/cyclone';
import type { CycloneRiskExplanation } from '@/lib/risk/cyclone';
import { demoCycloneRiskInputs } from './cycloneRiskInputs';

export const computedCycloneRisks: Record<string, CycloneRiskExplanation> =
  Object.fromEntries(
    Object.entries(demoCycloneRiskInputs).map(([id, inputs]) => [
      id,
      explainCycloneRisk(calculateCycloneRisk(inputs, false)),
    ]),
  );
