/**
 * Shelter Requirement Planning — Types
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * Deterministic planning estimates — NOT official government shelter standards.
 * Do not use for real emergency decisions.
 *
 * Future-ready: designed for replacement with:
 *  - Real shelter databases
 *  - Real population / evacuation models
 *  - PostGIS / road-network routing
 *  - Optimization algorithms
 *  - ML forecasting
 */

import type { Severity } from '@/types';

// ── Planning status ───────────────────────────────────────────────────────────

export type ShelterPlanningStatus =
  | 'SUFFICIENT'      // capacity meets or exceeds demand
  | 'NEAR_CAPACITY'   // capacity within 20% of demand
  | 'SHORTAGE';       // demand exceeds capacity

// ── Per-shelter summary ───────────────────────────────────────────────────────

export interface ShelterSummaryItem {
  id:             string;
  name:           string;
  capacity:       number;
  occupancy:      number;
  availableSlots: number;
  /** 0–100 utilization percentage */
  utilizationPct: number;
  status:         string;
  hasMedical:     boolean;
  hasFood:        boolean;
  location?:      string;
  coordinates?:   [number, number];
}

// ── Planning inputs ───────────────────────────────────────────────────────────

export interface ShelterPlanningInputs {
  /** Zone / location identifier */
  zoneId:   string;
  zoneName: string;

  /** Estimated affected population (from ImpactResult.population.value) */
  affectedPopulation: number;

  /** Overall risk severity */
  severity: Severity;

  /** Composite risk score 0–100 */
  riskScore: number;

  /**
   * Historical average affected population for this zone.
   * 0 if no historical data available.
   */
  historicalAvgAffectedPop: number;

  /** Shelters to consider for this zone (pre-filtered by proximity) */
  shelters: ShelterSummaryItem[];
}

// ── Planning result ───────────────────────────────────────────────────────────

export interface ShelterPlanningResult {
  zoneId:   string;
  zoneName: string;

  // ── Demand ─────────────────────────────────────────────────────────────────
  /** Prototype estimate of people who will need shelter */
  projectedDemand: number;
  /** Breakdown: how the demand was derived */
  demandBreakdown: {
    baseEvacuationFraction:  number;   // 0–1: fraction of affected pop needing shelter
    historicalAdjustment:    number;   // 0–1: multiplier from historical data
    severityMultiplier:      number;   // 0–1: extra weighting by severity
    finalDemand:             number;
  };

  // ── Capacity ────────────────────────────────────────────────────────────────
  /** Total capacity across all zone shelters */
  totalCapacity:   number;
  /** Capacity already occupied (current demo occupancy) */
  occupiedCapacity: number;
  /** Capacity actually available right now */
  availableCapacity: number;
  /** Per-shelter breakdown */
  shelterItems:    ShelterSummaryItem[];

  // ── Gap analysis ────────────────────────────────────────────────────────────
  /** Positive = shortage, negative = surplus */
  capacityGap:   number;
  /** 0–100+; >100 means shortage */
  utilizationPct: number;
  /** How many additional shelters (at avg capacity) would fill the gap */
  additionalSheltersNeeded: number;
  /** Avg capacity per existing shelter (used for "additional shelters needed") */
  avgShelterCapacity: number;

  // ── Status + planning ──────────────────────────────────────────────────────
  status:          ShelterPlanningStatus;
  recommendations: string[];

  // ── Assumptions ────────────────────────────────────────────────────────────
  /** Explicitly labelled prototype assumptions used in the calculation */
  assumptions: string[];

  /** Historical context note (empty string if no data) */
  historicalNote: string;

  calculatedAt: string;
}
