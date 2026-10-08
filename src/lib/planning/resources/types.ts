/**
 * Resource Requirement Planning — Types
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * Deterministic planning estimates for disaster response decision-support.
 * NOT official government resource standards. Do not use for real emergency operations.
 *
 * Extensible architecture: ready for integration with:
 *  - Real-time inventory / warehouse APIs
 *  - PostGIS logistics routing
 *  - Operations research / optimization algorithms (OR-Tools)
 *  - ML-driven demand forecasting
 */

import type { HazardType, Severity } from '@/types';

// ── Resource Category ─────────────────────────────────────────────────────────

export type ResourceCategory =
  | 'SHELTER'       // Emergency Shelter Capacity (person-slots)
  | 'FOOD'          // Food / Meal Support (meals / ration packets)
  | 'WATER'         // Drinking Water (liters)
  | 'MEDICAL'       // Medical Support (emergency medical teams / aid units)
  | 'RESCUE'        // Rescue Teams (NDRF / SDRF / ODRAF personnel teams)
  | 'VEHICLES'      // Emergency Vehicles (ambulances, transport trucks, 4x4s)
  | 'BOATS'         // Boats / Water Rescue Units (motorized boats, rafts)
  | 'KITS';         // Emergency Kits (relief family packs, tarpaulins, hygiene)

// ── Status ────────────────────────────────────────────────────────────────────

export type ResourceStatus =
  | 'SUFFICIENT'          // Coverage >= 100%
  | 'NEAR_CAPACITY'       // Coverage 80% – 99%
  | 'SHORTAGE'            // Coverage 50% – 79%
  | 'CRITICAL_SHORTAGE';  // Coverage < 50%

// ── Per-Resource Planning Item ────────────────────────────────────────────────

export interface ResourceRequirementItem {
  /** Identifier e.g. 'food', 'water', 'shelter', 'medical', 'rescue', 'vehicles', 'boats', 'kits' */
  id: string;
  /** Display label */
  name: string;
  /** Category */
  category: ResourceCategory;
  /** Icon representation */
  icon: string;
  /** Estimated quantity required for response */
  required: number;
  /** Currently available quantity in local/district stockpile */
  available: number;
  /** Net deficit: Math.max(0, required - available) */
  gap: number;
  /** Net surplus: Math.max(0, available - required) */
  surplus: number;
  /** Coverage percentage (available / required * 100), clamped 0–100+ */
  coveragePct: number;
  /** Shortage percentage ((required - available) / required * 100), clamped 0–100 */
  shortagePct: number;
  /** Resource health status */
  status: ResourceStatus;
  /** Physical unit of measurement (e.g. 'meals/day', 'liters/day', 'teams', 'units') */
  unit: string;
  /** Hazard-specific multiplier applied */
  hazardMultiplier: number;
  /** Transparent explanation of how demand was calculated */
  calculationBasis: string;
}

// ── Zone Inventory Shape ──────────────────────────────────────────────────────

export interface ZoneResourceInventory {
  shelterCapacity:   number; // available shelter slots
  foodMeals:         number; // emergency meal packs / rations
  waterLiters:       number; // potable drinking water (liters)
  medicalTeams:      number; // active emergency medical teams
  rescueTeams:       number; // NDRF / SDRF / ODRAF rescue teams
  emergencyVehicles: number; // transport trucks, ambulances, 4x4s
  rescueBoats:       number; // motorized rescue boats / inflatables
  emergencyKits:     number; // family relief & hygiene kits
}

// ── Inputs to Planning Engine ─────────────────────────────────────────────────

export interface ResourcePlanningInputs {
  /** Geographic zone identifier */
  zoneId: string;
  /** Human-readable location / zone name */
  zoneName: string;
  /** Dominant hazard triggering the resource demand */
  dominantHazard: HazardType;
  /** Risk score 0–100 */
  riskScore: number;
  /** Severity category */
  severity: Severity;
  /** Total affected population in the zone */
  affectedPopulation: number;
  /** Exposed population (optional, defaults to affected) */
  exposedPopulation?: number;
  /** Estimated damaged or affected buildings (optional) */
  buildingsAffected?: number;
  /** Estimated submerged or blocked road length in km (optional) */
  roadsAffectedKm?: number;
  /** Number of affected schools (optional) */
  schoolsAffected?: number;
  /** Number of affected hospitals (optional) */
  hospitalsAffected?: number;
  /** Shelter available slots (optional, from shelter engine) */
  shelterAvailableSlots?: number;
  /** Historical average affected population (optional) */
  historicalAvgAffectedPop?: number;
  /** Vulnerability factor 0.0–1.0 (optional) */
  vulnerabilityFactor?: number;
  /** Explicit inventory stock (optional; if omitted, resolved from demo inventory) */
  inventory?: ZoneResourceInventory;
}

// ── Categorized Priority Summary ──────────────────────────────────────────────

export interface ResourcePrioritySummary {
  criticalShortages: ResourceRequirementItem[];
  majorShortages:    ResourceRequirementItem[];
  nearCapacity:      ResourceRequirementItem[];
  sufficient:        ResourceRequirementItem[];
}

// ── Recommendation ────────────────────────────────────────────────────────────

export interface ResourceRecommendation {
  id:               string;
  priority:         'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  category:         ResourceCategory;
  title:            string;
  action:           string;
  rationale:        string;
}

// ── Full Planning Result ──────────────────────────────────────────────────────

export interface ResourcePlanningResult {
  zoneId:                        string;
  zoneName:                      string;
  dominantHazard:                HazardType;
  riskScore:                     number;
  severity:                      Severity;
  affectedPopulation:            number;
  /** Population estimated to need immediate proactive relief support */
  estimatedAssistancePopulation: number;

  /** Comprehensive list of resource items */
  resources:                     ResourceRequirementItem[];

  /** Priority categorization */
  prioritySummary:               ResourcePrioritySummary;

  /** Overall status (worst status across all critical resources) */
  overallStatus:                 ResourceStatus;

  /** Deterministic operational recommendations */
  recommendations:               ResourceRecommendation[];

  /** Explicitly labelled prototype assumptions */
  assumptions:                   string[];

  /** Historical context note (empty string if none) */
  historicalNote:                string;

  /** Timestamp of calculation */
  calculatedAt:                  string;
}
