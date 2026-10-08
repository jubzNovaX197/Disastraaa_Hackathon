/**
 * Flood Risk Engine — Explainability Layer
 *
 * Converts a FloodRiskResult into human-readable explanations.
 * All text is generated from actual calculated values, not hardcoded strings.
 */

import type {
  FloodRiskResult,
  FloodRiskExplanation,
  FloodFactorScores,
  FloodSeverity,
} from './types';

// ── Labels ────────────────────────────────────────────────────────────────────

export const FACTOR_LABELS: Record<keyof FloodFactorScores, string> = {
  rainfall:                    'Rainfall Intensity',
  riverLevel:                  'River Level',
  elevation:                   'Terrain Elevation',
  distanceFromRiver:           'Distance from River',
  population:                  'Population Exposure',
  historicalFrequency:         'Historical Flood Freq.',
  infrastructureVulnerability: 'Infrastructure Vuln.',
};

const SEVERITY_SUMMARY: Record<FloodSeverity, string> = {
  LOW:      'Low flood risk — standard monitoring advised.',
  MODERATE: 'Moderate flood risk — precautionary measures recommended.',
  HIGH:     'High flood risk — active monitoring and evacuation preparation required.',
  CRITICAL: 'Critical flood risk — immediate emergency response required.',
};

// ── Driver narrative ──────────────────────────────────────────────────────────

function topDrivers(
  factors: FloodFactorScores,
  n = 3,
): (keyof FloodFactorScores)[] {
  return (Object.keys(factors) as (keyof FloodFactorScores)[])
    .sort((a, b) => factors[b] - factors[a])
    .slice(0, n);
}

function driverSentence(key: keyof FloodFactorScores, score: number): string {
  const label = FACTOR_LABELS[key];
  const rounded = Math.round(score);
  if (score >= 80) return `${label} is critically elevated (${rounded}/100)`;
  if (score >= 60) return `${label} is significantly elevated (${rounded}/100)`;
  if (score >= 40) return `${label} is a moderate contributor (${rounded}/100)`;
  return `${label} is a minor factor (${rounded}/100)`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function explainFloodRisk(result: FloodRiskResult): FloodRiskExplanation {
  const drivers        = topDrivers(result.factors);
  const driverNarrative =
    drivers.map((k) => driverSentence(k, result.factors[k])).join('. ') + '.';

  return {
    result,
    summary:       SEVERITY_SUMMARY[result.severity],
    driverNarrative,
    factorLabels:  FACTOR_LABELS,
  };
}
