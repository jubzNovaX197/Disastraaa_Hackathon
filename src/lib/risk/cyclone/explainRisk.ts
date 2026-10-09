/**
 * Cyclone Risk Engine — Explainability Layer
 *
 * Converts a CycloneRiskResult into human-readable explanations.
 * All text is generated from actual calculated values, not hardcoded strings.
 */

import type {
  CycloneFactorScores,
  CycloneRiskExplanation,
  CycloneRiskResult,
  CycloneSeverity,
} from './types';

// ── Labels ────────────────────────────────────────────────────────────────────

export const CYCLONE_FACTOR_LABELS: Record<keyof CycloneFactorScores, string> = {
  windSpeed:                   'Wind Speed',
  rainfall:                    'Rainfall',
  stormSurge:                  'Storm Surge',
  trackProximity:              'Track Proximity',
  population:                  'Population Exposure',
  elevation:                   'Coastal Elevation',
  historicalFrequency:         'Historical Frequency',
  infrastructureVulnerability: 'Infrastructure Vuln.',
};

const SEVERITY_SUMMARY: Record<CycloneSeverity, string> = {
  LOW:      'Low cyclone risk — standard preparedness monitoring advised.',
  MODERATE: 'Moderate cyclone risk — precautionary evacuation planning recommended.',
  HIGH:     'High cyclone risk — active evacuation and emergency response required.',
  CRITICAL: 'Critical cyclone risk — immediate emergency response and mass evacuation required.',
};

// ── Driver narrative ──────────────────────────────────────────────────────────

function topDrivers(
  factors: CycloneFactorScores,
  n = 3,
): (keyof CycloneFactorScores)[] {
  return (Object.keys(factors) as (keyof CycloneFactorScores)[])
    .sort((a, b) => factors[b] - factors[a])
    .slice(0, n);
}

function driverSentence(key: keyof CycloneFactorScores, score: number): string {
  const label   = CYCLONE_FACTOR_LABELS[key];
  const rounded = Math.round(score);
  if (score >= 80) return `${label} is critically elevated (${rounded}/100)`;
  if (score >= 60) return `${label} is significantly elevated (${rounded}/100)`;
  if (score >= 40) return `${label} is a moderate contributor (${rounded}/100)`;
  return `${label} is a minor factor (${rounded}/100)`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function explainCycloneRisk(result: CycloneRiskResult): CycloneRiskExplanation {
  const drivers         = topDrivers(result.factors);
  const driverNarrative =
    drivers.map((k) => driverSentence(k, result.factors[k])).join('. ') + '.';

  return {
    result,
    summary:       SEVERITY_SUMMARY[result.severity],
    driverNarrative,
    factorLabels:  CYCLONE_FACTOR_LABELS,
  };
}
