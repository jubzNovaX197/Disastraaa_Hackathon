/**
 * Response Simulator & Disaster Scenario Modeling — Types
 *
 * Deterministic decision-support simulation architecture:
 * "If conditions change, how could risk, impact, shelters, resources, roads and response requirements change?"
 *
 * Decision-support only · Not a live forecast · Does not alter real-world data
 */

import type { HazardType, Severity } from '@/types';

// ── Scenario Inputs ──────────────────────────────────────────────────────────

export type ScenarioHazard = 'FLOOD' | 'CYCLONE' | 'MULTI_HAZARD';

export type ScenarioIntensity = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export type ScenarioDuration = '6h' | '12h' | '24h' | '48h' | '72h';

export interface AdvancedScenarioConditions {
  /** Additional rainfall in mm over 24h (0–300 mm) */
  rainfallMm24h: number;
  /** Additional river gauge level / crest height in meters (0–4.0 m) */
  riverSurgeMeters: number;
  /** Peak sustained wind speed in km/h (0–220 km/h) */
  windSpeedKmh: number;
  /** Coastal tidal / storm surge height in meters (0–5.0 m) */
  stormSurgeMeters: number;
  /** Road disruption severity */
  roadDisruptionLevel: 'NORMAL' | 'ELEVATED' | 'SEVERE' | 'CRITICAL';
  /** Shelter demand pressure multiplier (0.8–2.5) */
  shelterPressureFactor: number;
  /** Local resource stockpile deficit percentage (0–50%) */
  resourceDeficitPct: number;
}

export interface ScenarioConfiguration {
  id: string;
  name: string;
  hazard: ScenarioHazard;
  intensity: ScenarioIntensity;
  duration: ScenarioDuration;
  targetRegionId: string; // 'ALL' or specific zone ID
  populationExposureMultiplier: number; // 0.6 – 2.0 (default 1.0)
  advanced: AdvancedScenarioConditions;
}

// ── Metric Comparison Structure ──────────────────────────────────────────────

export interface SimulationMetricChange<T = number> {
  baseline: T;
  simulated: T;
  delta: number;
  percentChange: number;
}

// ── Risk Simulation Results ──────────────────────────────────────────────────

export interface SimulatedRiskBreakdown {
  composite: SimulationMetricChange;
  flood: SimulationMetricChange;
  cyclone: SimulationMetricChange;
  multiHazard: SimulationMetricChange;
  baselineSeverity: Severity;
  simulatedSeverity: Severity;
  keyDrivers: string[];
}

// ── Impact Simulation Results ────────────────────────────────────────────────

export interface SimulatedImpactBreakdown {
  population: SimulationMetricChange;
  buildings: SimulationMetricChange;
  roadsKm: SimulationMetricChange;
  schools: SimulationMetricChange;
  hospitals: SimulationMetricChange;
  shelters: SimulationMetricChange;
}

// ── Shelter Simulation Results ───────────────────────────────────────────────

export interface SimulatedShelterItem {
  id: string;
  name: string;
  location: string;
  capacity: number;
  baselineDemand: number;
  simulatedDemand: number;
  projectedGap: number;
  baselineStatus: 'AVAILABLE' | 'PRESSURE' | 'SHORTAGE';
  simulatedStatus: 'AVAILABLE' | 'PRESSURE' | 'SHORTAGE';
  isNewPressure: boolean;
}

export interface SimulatedShelterSummary {
  totalCapacity: number;
  baselineDemand: number;
  simulatedDemand: number;
  demandDelta: number;
  projectedCapacityGap: number;
  highPressureCount: number;
  items: SimulatedShelterItem[];
}

// ── Resource Simulation Results ──────────────────────────────────────────────

export interface SimulatedResourceItem {
  category: string;
  name: string;
  unit: string;
  icon: string;
  baselineRequired: number;
  simulatedRequired: number;
  additionalRequired: number;
  availableStock: number;
  projectedGap: number;
  baselineStatus: string;
  simulatedStatus: string;
}

// ── Road Network Simulation Results ──────────────────────────────────────────

export interface ImpactedRoadSegment {
  id: string;
  name: string;
  code?: string;
  administrativeArea: string;
  baselineStatus: string;
  simulatedStatus: string;
  reason: string;
}

export interface SimulatedRoadStatus {
  open: SimulationMetricChange;
  caution: SimulationMetricChange;
  partiallyBlocked: SimulationMetricChange;
  blocked: SimulationMetricChange;
  closed: SimulationMetricChange;
  affectedSegmentsCount: number;
  impactedSegments: ImpactedRoadSegment[];
}

// ── Alert Simulation Results ─────────────────────────────────────────────────

export interface SimulatedAlertItem {
  id: string;
  title: string;
  severity: Severity;
  hazard: ScenarioHazard;
  thresholdReached: string;
  recommendedAction: string;
}

// ── Response Requirements Summary ────────────────────────────────────────────

export interface SimulatedResponseSummary {
  additionalWater: number;
  additionalFood: number;
  additionalMedical: number;
  additionalRescueTeams: number;
  additionalVehicles: number;
  additionalBoats: number;
  additionalShelterBeds: number;
  additionalEmergencyKits: number;
}

// ── Simulation Timeline ──────────────────────────────────────────────────────

export interface SimulatedTimelineStep {
  stepLabel: string; // 'T+0', 'T+6h', 'T+12h', 'T+24h', 'T+48h', 'T+72h'
  hourOffset: number;
  riskScore: number;
  populationExposed: number;
  shelterDemand: number;
  resourceDeficitCount: number;
  roadPassabilityPct: number;
  narrative: string;
}

// ── Master Simulation Result ─────────────────────────────────────────────────

export interface SimulationResult {
  scenario: ScenarioConfiguration;
  targetRegionName: string;
  risk: SimulatedRiskBreakdown;
  impact: SimulatedImpactBreakdown;
  shelters: SimulatedShelterSummary;
  resources: SimulatedResourceItem[];
  roads: SimulatedRoadStatus;
  alerts: SimulatedAlertItem[];
  responseRequirements: SimulatedResponseSummary;
  timeline: SimulatedTimelineStep[];
  synthesisNarrative: string;
  generatedAt: string;
}

// ── Preset Configuration ─────────────────────────────────────────────────────

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  hazard: ScenarioHazard;
  intensity: ScenarioIntensity;
  duration: ScenarioDuration;
  targetRegionId: string;
  advanced: AdvancedScenarioConditions;
}
