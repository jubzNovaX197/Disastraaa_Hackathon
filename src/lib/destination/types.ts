/**
 * Destination Safety & Date/Time Travel Risk Intelligence — Types
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY FORECAST
 *
 * Provides deterministic multi-factor destination safety analysis
 * combined with time-aware scenario projections and route travel risk.
 */

import type { LngLat } from '@/data/types';
import type { RouteResult } from '@/lib/routing/types';
import type { Severity } from '@/types';

// ── Destination Safety Status ───────────────────────────────────────────────

export type DestinationSafetyStatus = 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'CRITICAL';

// ── Individual Explainable Risk Factor ──────────────────────────────────────

export interface DestinationRiskFactor {
  id: string;
  name: string;
  weight: number; // 0.0 to 1.0 (all weights sum to 1.0)
  score: number; // 0 to 100, where 100 = completely safe, 0 = critical risk
  weightedScore: number; // weight * score
  severity: Severity;
  statusLabel: string;
  explanation: string;
  metricValue?: string | number;
}

// ── Time-Aware Risk Scenario ────────────────────────────────────────────────

export type ScenarioSlotKey =
  | 'NOW'
  | 'TODAY_12'
  | 'TODAY_15'
  | 'TODAY_18'
  | 'TODAY_21'
  | 'TOMORROW_06'
  | 'TOMORROW_12'
  | 'TOMORROW_18'
  | 'FUTURE_48H';

export interface TimeRiskScenario {
  id: string;
  label: string;
  timeSlotName: string;
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // HH:mm
  slotKey: ScenarioSlotKey;
  rainfallIntensityMmH: number;
  riverLevelMeters: number;
  cycloneWindKmh: number;
  stormSurgeMeters: number;
  scenarioSummary: string;
  activeAlertIds: string[];
  roadModifications?: Record<
    string,
    {
      status: 'OPEN' | 'CAUTION' | 'PARTIALLY_BLOCKED' | 'BLOCKED' | 'CLOSED';
      delayMinutes?: number;
      hazardNote?: string;
    }
  >;
  hazardMultipliers: {
    flood: number;
    cyclone: number;
  };
}

// ── Destination Safety Request ──────────────────────────────────────────────

export interface DestinationSafetyRequest {
  destinationId: string;
  destinationName?: string;
  coordinates?: LngLat;
  selectedDate?: string;
  selectedTime?: string;
  scenarioSlot?: ScenarioSlotKey | string;
  routeRiskScore?: number;
  environment?: import('@/lib/env').AppEnvironment;
  historicalEvents?: import('@/lib/historical/types').HistoricalDisasterEvent[];
}

// ── Destination Safety Result ───────────────────────────────────────────────

export interface DestinationWarningItem {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  message: string;
  affectedArea: string;
  validPeriod: string;
  category: string;
  recommendedAction: string;
}

export interface DestinationSafetyResult {
  destinationId: string;
  destinationName: string;
  coordinates: LngLat;
  selectedDate: string;
  selectedTime: string;
  scenario: TimeRiskScenario;
  isPrototypeScenario: true;
  safetyScore: number; // 0–100, HIGHER = SAFER (100 = completely safe, 0 = critical danger)
  riskScore: number; // 0–100, HIGHER = RISKIER (100 - safetyScore, for travel combined metrics)
  status: DestinationSafetyStatus;
  factors: DestinationRiskFactor[];
  reasons: string[]; // 3–5 concise explanations
  warnings: DestinationWarningItem[];
  supportingData: {
    rainfallMmH: number;
    windKmh: number;
    riverLevelMeters: number;
    riverStageStatus: string;
    nearestShelter?: {
      id: string;
      name: string;
      distanceKm: number;
      status: string;
      capacity: number;
      occupancy: number;
      occupancyPct: number;
      hasMedical: boolean;
    };
    roadAccessSummary: {
      totalNearby: number;
      open: number;
      caution: number;
      partiallyBlocked: number;
      blocked: number;
      status: string;
    };
    historicalContext: {
      eventCount: number;
      highestSeverity: Severity;
      summary: string;
    };
  };
  deltaFromCurrent?: {
    baselineScore: number;
    scoreDelta: number;
    summary: string;
  };
  timeline: Array<{
    time: string;
    date: string;
    score: number;
    status: DestinationSafetyStatus;
    summary: string;
  }>;
}

// ── Combined Route + Destination Travel Risk ────────────────────────────────

export interface RouteOptionMetrics {
  distanceKm: number;
  totalMinutes: number;
  routeRiskScore: number;
  destRiskScore: number;
  overallRiskScore: number;
  status: DestinationSafetyStatus;
}

export interface TravelRiskResult {
  hasRoute: boolean;
  routeMode?: RouteResult['mode'];
  routeRiskScore: number; // 0–100 (from Task 13 route engine, higher = riskier)
  routeRiskSeverity: Severity;
  destinationSafetyScore: number; // 0–100 (higher = safer)
  destinationRiskScore: number; // 0–100 (higher = riskier)
  destinationRiskSeverity: Severity;
  overallTravelRiskScore: number; // 0–100 (higher = riskier)
  overallTravelStatus: DestinationSafetyStatus;
  formulaExplanation: string;
  recommendation: string;
  routeComparison?: {
    shortest?: RouteOptionMetrics;
    safest?: RouteOptionMetrics;
    alternative?: RouteOptionMetrics;
  };
}

// ── Provider Contract for Future API Swaps ──────────────────────────────────

export interface RiskScenarioProvider {
  readonly providerName: string;
  readonly isDemo: boolean;
  getScenarios(): TimeRiskScenario[];
  getScenario(date: string, time: string): TimeRiskScenario;
  getScenarioById(id: string): TimeRiskScenario;
}
