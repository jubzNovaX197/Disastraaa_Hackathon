/**
 * Impact Prediction Engine — Types
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * All estimates are deterministic demo calculations, NOT calibrated to
 * official disaster-impact standards. Do not use for real emergency decisions.
 *
 * Architecture is intentionally thin so it can be replaced later with:
 *  - GIS overlay calculations (PostGIS / Turf.js)
 *  - Real population / building datasets (WorldPop, OSM)
 *  - ML models
 * without rewriting the UI.
 */

import type { HazardType, Severity } from '@/types';

// ── Exposure inputs ───────────────────────────────────────────────────────────

/**
 * Zone-level exposure data.
 * Represents what exists in a geographic area (people, infrastructure, etc.).
 * Future: derive from GIS / PostGIS queries.
 */
export interface ZoneExposure {
  /** Total resident population in the zone */
  totalPopulation: number;
  /** Estimated building count */
  totalBuildings: number;
  /** Total road network length in km */
  totalRoadKm: number;
  /** Number of schools in or near the zone */
  totalSchools: number;
  /** Number of hospitals / health facilities */
  totalHospitals: number;
  /** Number of emergency shelters */
  totalShelters: number;
  /** Optional: area of zone in km² */
  areaKm2?: number;
}

// ── Impact inputs ─────────────────────────────────────────────────────────────

/** Inputs to the impact engine — consumed from existing risk results. */
export interface ImpactInputs {
  /** Composite risk score 0–100 (from MultiHazardRiskResult.score) */
  riskScore: number;
  /** Severity bucket */
  severity: Severity;
  /** Dominant hazard driving the impact */
  dominantHazard: HazardType;
  /** Zone exposure */
  exposure: ZoneExposure;
  /** Optional: specific flood depth multiplier (0–1 for none→severe) */
  floodDepthFactor?: number;
  /** Optional: cyclone wind speed category (1–5) */
  cycloneCategory?: number;
}

// ── Impact results ────────────────────────────────────────────────────────────

/** Estimated impact for a single category. */
export interface ImpactMetric {
  /** Human-readable category name */
  label: string;
  /** Numeric estimate */
  value: number;
  /** Display unit, e.g. "people", "buildings", "km", "schools" */
  unit: string;
  /** Short note about how this was estimated */
  note: string;
  /** 0–1 confidence level for this specific metric */
  confidence: number;
}

/** Full impact prediction result for a zone. */
export interface ImpactResult {
  /** Zone / location identifier */
  zoneId: string;
  /** Human-readable zone name */
  zoneName: string;

  // ── Estimated impact metrics ──────────────────────────────────────────────
  population: ImpactMetric;
  buildings:  ImpactMetric;
  roads:      ImpactMetric;
  schools:    ImpactMetric;
  hospitals:  ImpactMetric;
  shelters:   ImpactMetric;

  // ── Context ───────────────────────────────────────────────────────────────
  primaryDriver:   HazardType;
  riskLevel:       Severity;
  riskScore:       number;
  /** Top exposure factors explaining the impact estimate */
  exposureFactors: string[];
  /** One-sentence summary of the predicted impact */
  summary:         string;

  /** ISO-8601 calculation timestamp */
  calculatedAt: string;
}
