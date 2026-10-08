/**
 * Impact Prediction Engine — Core calculation
 *
 * ⚠️  PROTOTYPE / DEMO — deterministic estimates only.
 * These are NOT official disaster-impact formulas.
 * They use simple severity-scaled fractions of zone exposure as demo logic.
 *
 * Replace this module with GIS overlays / ML without touching the UI.
 */

import type { ImpactInputs, ImpactResult, ImpactMetric } from './types';

// ── Severity-based impact fractions ──────────────────────────────────────────
// These represent approximate "fraction of the zone that may be affected"
// at each severity level. Values are illustrative, not scientific.

const POPULATION_FRACTION = { LOW: 0.05, MODERATE: 0.18, HIGH: 0.42, CRITICAL: 0.75 } as const;
const BUILDING_FRACTION   = { LOW: 0.03, MODERATE: 0.12, HIGH: 0.35, CRITICAL: 0.65 } as const;
const ROAD_FRACTION       = { LOW: 0.06, MODERATE: 0.22, HIGH: 0.48, CRITICAL: 0.72 } as const;
const SCHOOL_FRACTION     = { LOW: 0.04, MODERATE: 0.15, HIGH: 0.38, CRITICAL: 0.70 } as const;
const HOSPITAL_FRACTION   = { LOW: 0.02, MODERATE: 0.10, HIGH: 0.28, CRITICAL: 0.55 } as const;
const SHELTER_FRACTION    = { LOW: 0.05, MODERATE: 0.20, HIGH: 0.45, CRITICAL: 0.80 } as const;

// ── Hazard-specific modifiers ─────────────────────────────────────────────────
// Flood increases road/building impact; cyclone increases population displacement.

const HAZARD_ROAD_MOD: Partial<Record<string, number>> = {
  FLOOD:       1.30,
  STORM_SURGE: 1.25,
  CYCLONE:     1.10,
  LANDSLIDE:   1.40,
};

const HAZARD_POP_MOD: Partial<Record<string, number>> = {
  CYCLONE:     1.20,  // larger evacuation footprint
  STORM_SURGE: 1.15,
  FLOOD:       1.05,
  LANDSLIDE:   0.85,  // typically smaller zone
};

const HAZARD_BLDG_MOD: Partial<Record<string, number>> = {
  CYCLONE:     1.25,
  FLOOD:       1.10,
  STORM_SURGE: 1.15,
  LANDSLIDE:   1.35,
};

// ── Risk score micro-adjustment (adds nuance beyond severity bucket) ───────────
// Maps 0–100 score to a 0.85–1.15 multiplier so mid-bucket scores feel different.

function scoreMultiplier(riskScore: number): number {
  return 0.85 + (riskScore / 100) * 0.30;
}

// ── Metric builder ────────────────────────────────────────────────────────────

function buildMetric(
  label: string,
  total: number,
  fraction: number,
  hazardMod: number,
  scoreAdj: number,
  unit: string,
  note: string,
  baseConfidence: number,
): ImpactMetric {
  const raw   = total * fraction * hazardMod * scoreAdj;
  const value = Math.round(Math.max(0, Math.min(raw, total)));
  return { label, value, unit, note, confidence: Math.min(baseConfidence, 0.95) };
}

// ── Exposure factors ──────────────────────────────────────────────────────────

function deriveExposureFactors(inputs: ImpactInputs): string[] {
  const { severity, dominantHazard, exposure, riskScore } = inputs;
  const factors: string[] = [];

  if (exposure.totalPopulation > 300_000) factors.push('High population density');
  else if (exposure.totalPopulation > 100_000) factors.push('Moderate population density');

  if (dominantHazard === 'FLOOD' || dominantHazard === 'STORM_SURGE') {
    factors.push('Low-lying flood-prone terrain');
  }
  if (dominantHazard === 'CYCLONE') factors.push('Coastal cyclone exposure');
  if (dominantHazard === 'LANDSLIDE') factors.push('Steep slope / hill terrain');

  if (severity === 'CRITICAL' || severity === 'HIGH') {
    factors.push('Elevated composite risk score (' + riskScore + '/100)');
  }

  if (exposure.totalRoadKm > 80) factors.push('Dense road network at risk');
  if (exposure.totalHospitals >= 2) factors.push('Critical health infrastructure in zone');
  if (inputs.floodDepthFactor && inputs.floodDepthFactor > 0.5) {
    factors.push('Significant flood inundation depth');
  }
  if (inputs.cycloneCategory && inputs.cycloneCategory >= 3) {
    factors.push(`Cyclone category ${inputs.cycloneCategory} wind field`);
  }

  return factors.slice(0, 4); // keep concise
}

// ── Summary ───────────────────────────────────────────────────────────────────

function buildSummary(inputs: ImpactInputs, affectedPop: number): string {
  const hazardLabel = inputs.dominantHazard.charAt(0) + inputs.dominantHazard.slice(1).toLowerCase();
  const popLabel    = affectedPop > 100_000
    ? `${(affectedPop / 100_000).toFixed(1)} lakh`
    : affectedPop.toLocaleString('en-IN');

  return `${inputs.severity} ${hazardLabel} risk may affect ~${popLabel} people and critical infrastructure in this zone.`;
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function calculateImpact(
  zoneId:   string,
  zoneName: string,
  inputs:   ImpactInputs,
): ImpactResult {
  const { severity, riskScore, dominantHazard, exposure } = inputs;

  const scoreMod  = scoreMultiplier(riskScore);
  const popMod    = HAZARD_POP_MOD[dominantHazard]  ?? 1.0;
  const bldgMod   = HAZARD_BLDG_MOD[dominantHazard] ?? 1.0;
  const roadMod   = HAZARD_ROAD_MOD[dominantHazard]  ?? 1.0;

  const popFrac  = POPULATION_FRACTION[severity];
  const bldgFrac = BUILDING_FRACTION[severity];
  const roadFrac = ROAD_FRACTION[severity];
  const schFrac  = SCHOOL_FRACTION[severity];
  const hospFrac = HOSPITAL_FRACTION[severity];
  const shelFrac = SHELTER_FRACTION[severity];

  const population = buildMetric(
    'Population', exposure.totalPopulation, popFrac, popMod, scoreMod,
    'people',
    'Estimated residents in affected area based on severity and hazard type.',
    0.55,
  );

  const buildings = buildMetric(
    'Buildings', exposure.totalBuildings, bldgFrac, bldgMod, scoreMod,
    'buildings',
    'Structures potentially affected (damaged or at-risk of inundation / wind damage).',
    0.45,
  );

  const roads = buildMetric(
    'Roads', exposure.totalRoadKm, roadFrac, roadMod, scoreMod,
    'km',
    'Estimated road network length disrupted, flooded, or damaged.',
    0.50,
  );

  const schools = buildMetric(
    'Schools', exposure.totalSchools, schFrac, 1.0, scoreMod,
    'schools',
    'Educational facilities in the affected zone.',
    0.60,
  );

  const hospitals = buildMetric(
    'Hospitals', exposure.totalHospitals, hospFrac, 1.0, scoreMod,
    'hospitals',
    'Health facilities potentially impacted or serving as triage points.',
    0.65,
  );

  const shelters = buildMetric(
    'Shelters', exposure.totalShelters, shelFrac, 1.0, scoreMod,
    'shelters',
    'Emergency shelters that may be activated or at risk.',
    0.70,
  );

  return {
    zoneId,
    zoneName,
    population,
    buildings,
    roads,
    schools,
    hospitals,
    shelters,
    primaryDriver:   dominantHazard,
    riskLevel:       severity,
    riskScore,
    exposureFactors: deriveExposureFactors(inputs),
    summary:         buildSummary(inputs, population.value),
    calculatedAt:    new Date().toISOString(),
  };
}
