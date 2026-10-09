/**
 * Multi-Hazard Risk Engine — Explainability Layer
 *
 * Converts a MultiHazardRiskResult into human-readable explanations.
 * All text is generated from actual calculated values.
 */

import type { Severity } from '@/types';
import type {
  DataQuality,
  MultiHazardRiskExplanation,
  MultiHazardRiskResult,
} from './types';

// ── Label maps ────────────────────────────────────────────────────────────────

const HAZARD_LABEL: Record<string, string> = {
  FLOOD:       '🌊 Flood',
  CYCLONE:     '🌀 Cyclone',
  STORM_SURGE: '🌊 Storm Surge',
  LANDSLIDE:   '⛰️ Landslide',
  HEATWAVE:    '🌡️ Heatwave',
  LIGHTNING:   '⚡ Lightning',
  DROUGHT:     '🏜️ Drought',
};

const SEVERITY_OVERALL: Record<Severity, string> = {
  LOW:      'Overall risk is low — standard monitoring advised.',
  MODERATE: 'Overall risk is moderate — precautionary measures recommended.',
  HIGH:     'Overall risk is high — active monitoring and preparedness required.',
  CRITICAL: 'Overall risk is critical — immediate multi-agency response required.',
};

const DATA_QUALITY_LABEL: Record<DataQuality, { label: string; note: string }> = {
  GOOD:    { label: '✅ Good',    note: 'Multiple hazard assessments available with high confidence.' },
  PARTIAL: { label: '⚠️ Partial', note: 'Some hazard data is incomplete or covers only part of the area.' },
  LIMITED: { label: '🔴 Limited', note: 'Only one hazard assessment available; composite score may under-represent risk.' },
};

// ── Narrative builders ────────────────────────────────────────────────────────

function dominantNarrative(result: MultiHazardRiskResult): string {
  const dom = result.contributions.find((c) => c.hazard === result.dominantHazard);
  if (!dom) return '';

  const label   = HAZARD_LABEL[result.dominantHazard] ?? result.dominantHazard;
  const pct     = Math.round(dom.weight * 100);
  const drivers = dom.driverNarrative;

  return (
    `${label} is the dominant hazard, contributing ${pct}% of the composite score. ` +
    `Key drivers: ${drivers}`
  );
}

function hazardSummaries(
  result: MultiHazardRiskResult,
): Record<string, string> {
  return Object.fromEntries(
    result.contributions.map((c) => {
      const label = HAZARD_LABEL[c.hazard] ?? c.hazard;
      return [
        c.hazard,
        `${label} — Score ${c.score}/100 (${c.severity}), weighted contribution: ${Math.round(c.weightedScore)}/100.`,
      ];
    }),
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export function explainMultiHazardRisk(
  result: MultiHazardRiskResult,
): MultiHazardRiskExplanation {
  return {
    result,
    overallSummary:    SEVERITY_OVERALL[result.severity],
    dominantNarrative: dominantNarrative(result),
    hazardSummaries:   hazardSummaries(result),
  };
}

export { DATA_QUALITY_LABEL, HAZARD_LABEL };
