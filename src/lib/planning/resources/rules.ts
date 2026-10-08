/**
 * Resource Requirement Planning — Rules & Constants
 *
 * ⚠️  PROTOTYPE / DEMO ASSUMPTIONS.
 * Deterministic planning thresholds, rates, and hazard-specific multipliers.
 * Centralized here to allow tuning without altering the engine or UI logic.
 */

import type { HazardType, Severity } from '@/types';
import type { ResourceCategory, ResourceStatus } from './types';

// ── Assistance Fraction of Affected Population ────────────────────────────────
// Deterministic fraction of affected people requiring active relief distribution
export const ASSISTANCE_FRACTION: Record<Severity, number> = {
  LOW:      0.15,
  MODERATE: 0.30,
  HIGH:     0.50,
  CRITICAL: 0.70,
};

// ── Base Planning Consumption Rates ───────────────────────────────────────────
export const BASE_RATES = {
  /** Meals required per assisted person per day (prototype assumes 2.5 meals/day) */
  MEALS_PER_PERSON_DAY: 2.5,

  /** Potable drinking water in liters per person per day (Sphere standard ~4.0 L) */
  WATER_LITERS_PER_PERSON_DAY: 4.0,

  /** Ratio: 1 medical team per N assisted persons */
  PERSONS_PER_MEDICAL_TEAM: 2500,

  /** Ratio: 1 NDRF/SDRF rescue team per N assisted persons */
  PERSONS_PER_RESCUE_TEAM: 1500,

  /** Ratio: 1 emergency response vehicle (ambulance/truck/4x4) per N assisted persons */
  PERSONS_PER_VEHICLE: 800,

  /** Ratio: 1 boat/water rescue unit per N assisted persons in waterlogged areas */
  PERSONS_PER_BOAT: 1200,

  /** Average household size in persons per relief kit (approx 4.5 persons/kit) */
  PERSONS_PER_EMERGENCY_KIT: 4.5,

  /** Fraction of assisted population needing formal emergency shelter slots */
  SHELTER_EVACUATION_FRACTION: 0.60,
} as const;

// ── Hazard-Specific Multipliers ───────────────────────────────────────────────
// Extensible dictionary: multipliers scale resource demands according to hazard characteristics
export const HAZARD_MULTIPLIERS: Partial<Record<HazardType, Record<ResourceCategory, number>>> = {
  FLOOD: {
    SHELTER:  1.25, // prolonged displacement due to standing water
    FOOD:     1.15, // cooking facilities submerged; cooked rations needed
    WATER:    1.45, // surface wells & pipes contaminated by floodwater
    MEDICAL:  1.35, // water-borne diseases, leptospirosis, skin infections
    RESCUE:   1.60, // wading and water rescue operations
    VEHICLES: 0.70, // submerged roads limit standard vehicular mobility
    BOATS:    3.50, // boats & inflatable rafts are the primary lifeline
    KITS:     1.30, // water purification tablets, dry bags, tarpaulins
  },
  CYCLONE: {
    SHELTER:  1.80, // widespread roof & structural damage forces mass evacuation
    FOOD:     1.30, // electrical grid collapse disables local refrigeration/shops
    WATER:    1.25, // pump stations shut down due to transmission line collapse
    MEDICAL:  1.40, // trauma from flying debris, falling trees, electrocution
    RESCUE:   1.50, // heavy tree clearing, route clearance, stranded evacuation
    VEHICLES: 1.40, // utility trucks and 4x4s required for road clearance & relief
    BOATS:    0.90, // primary focus is storm surge coastal areas; inland secondary
    KITS:     1.70, // heavy-duty tarpaulins, rope, nails, solar lanterns
  },
  STORM_SURGE: {
    SHELTER:  1.60,
    FOOD:     1.20,
    WATER:    1.40,
    MEDICAL:  1.30,
    RESCUE:   1.80,
    VEHICLES: 0.80,
    BOATS:    2.80,
    KITS:     1.40,
  },
  HEATWAVE: {
    SHELTER:  0.80,
    FOOD:     1.00,
    WATER:    2.20, // extreme hydration demand + oral rehydration solutions
    MEDICAL:  1.60, // heat stroke, dehydration triage
    RESCUE:   0.60,
    VEHICLES: 0.80,
    BOATS:    0.20,
    KITS:     0.90,
  },
  LANDSLIDE: {
    SHELTER:  1.40,
    FOOD:     1.10,
    WATER:    1.10,
    MEDICAL:  1.50, // crushing injuries, trauma care
    RESCUE:   2.00, // specialized debris excavation & canine search
    VEHICLES: 1.30, // earthmoving equipment and heavy haulers
    BOATS:    0.30,
    KITS:     1.20,
  },
  LIGHTNING: {
    SHELTER:  0.80,
    FOOD:     0.90,
    WATER:    0.90,
    MEDICAL:  1.50,
    RESCUE:   0.80,
    VEHICLES: 0.80,
    BOATS:    0.20,
    KITS:     0.80,
  },
  DROUGHT: {
    SHELTER:  0.50,
    FOOD:     1.60,
    WATER:    2.50,
    MEDICAL:  1.20,
    RESCUE:   0.50,
    VEHICLES: 1.20,
    BOATS:    0.10,
    KITS:     0.80,
  },
};

/** Default multipliers if a hazard type is unmapped */
export const DEFAULT_HAZARD_MULTIPLIERS: Record<ResourceCategory, number> = {
  SHELTER:  1.0,
  FOOD:     1.0,
  WATER:    1.0,
  MEDICAL:  1.0,
  RESCUE:   1.0,
  VEHICLES: 1.0,
  BOATS:    1.0,
  KITS:     1.0,
};

// ── Status Thresholds ─────────────────────────────────────────────────────────

export const STATUS_THRESHOLDS = {
  SUFFICIENT_MIN_COVERAGE: 100, // 100%+
  NEAR_CAPACITY_MIN_COVERAGE: 80, // 80% to 99%
  SHORTAGE_MIN_COVERAGE: 50, // 50% to 79%
  // Below 50% is CRITICAL_SHORTAGE
} as const;

/**
 * Deterministically derives status from coverage percentage (available / required * 100).
 */
export function deriveResourceStatus(coveragePct: number): ResourceStatus {
  if (coveragePct >= STATUS_THRESHOLDS.SUFFICIENT_MIN_COVERAGE) {
    return 'SUFFICIENT';
  }
  if (coveragePct >= STATUS_THRESHOLDS.NEAR_CAPACITY_MIN_COVERAGE) {
    return 'NEAR_CAPACITY';
  }
  if (coveragePct >= STATUS_THRESHOLDS.SHORTAGE_MIN_COVERAGE) {
    return 'SHORTAGE';
  }
  return 'CRITICAL_SHORTAGE';
}
