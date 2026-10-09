/**
 * Journey Risk Intelligence — Types (Task 15)
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY FORECAST
 *
 * Comprehensive disaster-aware journey assessment combining:
 *   Origin → Route → Destination → Time
 *
 * Provides objective, factual metrics across route risk, destination safety,
 * hazard corridor exposure, road conditions, active alerts, citizen intelligence,
 * and emergency shelter context.
 */

import type { LngLat } from '@/data/types';
import type {
  DestinationSafetyResult,
  ScenarioSlotKey
} from '@/lib/destination/types';
import type { RouteMode, RouteResult } from '@/lib/routing/types';
import type { Severity } from '@/types';

// ── Journey Risk Status ─────────────────────────────────────────────────────

export type JourneyRiskStatus = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

export const JOURNEY_STATUS_THRESHOLDS = {
  LOW: { min: 0, max: 24, label: 'LOW', color: 'text-safe', bg: 'bg-safe/10 border-safe/30' },
  MODERATE: { min: 25, max: 49, label: 'MODERATE', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  HIGH: { min: 50, max: 74, label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30' },
  VERY_HIGH: { min: 75, max: 100, label: 'VERY_HIGH', color: 'text-critical', bg: 'bg-critical/10 border-critical/30' },
} as const;

// ── Structured Journey Risk Factor ──────────────────────────────────────────

export interface JourneyRiskFactor {
  id: string;
  category: 'ROUTE' | 'DESTINATION' | 'HAZARD' | 'ROAD' | 'ALERT' | 'HISTORICAL';
  name: string;
  severity: Severity;
  statusLabel: string;
  weight: number; // 0.0 to 1.0
  score: number; // 0 to 100 (higher = riskier)
  weightedScore: number;
  explanation: string;
  metricValue?: string | number;
}

// ── Hazard Corridor Segment ─────────────────────────────────────────────────

export type HazardType =
  | 'FLOOD'
  | 'CYCLONE'
  | 'MULTI_HAZARD'
  | 'ROAD_BLOCKAGE'
  | 'ALERT'
  | 'INFRASTRUCTURE';

export interface HazardCorridorItem {
  id: string;
  segmentName: string;
  hazardType: HazardType;
  risk: Severity;
  exposureKm: number;
  reason: string;
  coordinates?: LngLat;
}

// ── Road Condition Impact Breakdown ─────────────────────────────────────────

export interface RoadConditionBreakdown {
  openKm: number;
  cautionKm: number;
  partiallyBlockedKm: number;
  blockedKm: number;
  unknownKm: number;
  totalKm: number;
  hasBlockedSegment: boolean;
  blockageNotes: string[];
}

// ── Active Alert Impact ─────────────────────────────────────────────────────

export interface JourneyAlertItem {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  summary: string;
  affectedArea: string;
  validPeriod: string;
  routeExposureKm: number;
  distanceToRouteKm: number;
}

// ── Citizen Ground Intelligence ─────────────────────────────────────────────

export interface JourneyGroundReportItem {
  id: string;
  title: string;
  hazardType: string;
  severity: Severity;
  status: string;
  isVerified: boolean;
  hasEvidence: boolean;
  distanceKm: number;
  createdAt: string;
}

export interface JourneyGroundIntelligence {
  totalReports: number;
  verifiedCount: number;
  blockedRoadCount: number;
  evidenceBackedCount: number;
  categories: Record<string, number>;
  reports: JourneyGroundReportItem[];
}

// ── Emergency & Shelter Context ─────────────────────────────────────────────

export interface JourneyEmergencyContext {
  nearbySheltersCount: number;
  availableCapacity: number;
  projectedDemand: number;
  capacityStatus: 'Available' | 'Strained' | 'At Capacity' | 'Critical Shortage';
  resourceShortage: string;
  emergencySupport: string;
  nearestShelterName?: string;
  nearestShelterDistanceKm?: number;
  isInformationalOnly: true;
}

// ── Route Comparison Item (Objective metrics, no subjective "best") ──────────

export interface RouteJourneyComparisonItem {
  mode: RouteMode;
  modeLabel: string;
  distanceKm: number;
  travelMinutes: number;
  routeRisk: number; // 0–100
  destinationRisk: number; // 0–100
  overallJourneyRisk: number; // 0–100
  status: JourneyRiskStatus;
  blockedRoadExposureKm: number;
  majorHazardExposure: string;
  found: boolean;
  notFoundReason?: string;
}

// ── Time Comparison Item (Scenario matrix) ──────────────────────────────────

export interface TimeJourneyComparisonItem {
  slotKey: string;
  time: string;
  date: string;
  label: string;
  journeyRisk: number;
  routeRisk: number;
  destinationRisk: number;
  status: JourneyRiskStatus;
  summary: string;
}

// ── Journey Risk Request & Result ───────────────────────────────────────────

export interface JourneyLocation {
  id: string;
  name: string;
  coordinates: LngLat;
}

export interface JourneyRiskRequest {
  originNodeId?: string;
  destinationNodeId?: string;
  origin?: JourneyLocation;
  destination?: JourneyLocation;
  selectedDate?: string;
  selectedTime?: string;
  scenarioSlot?: ScenarioSlotKey | string;
  selectedRoute?: RouteResult | null;
  destinationSafety?: DestinationSafetyResult | null;
  environment?: import('@/lib/env').AppEnvironment;
}

export interface JourneyRiskContributions {
  routeRisk: {
    raw: number;
    weight: number;
    contribution: number;
  };
  destinationRisk: {
    raw: number;
    weight: number;
    contribution: number;
  };
  hazardExposure: {
    raw: number;
    weight: number;
    contribution: number;
  };
  alertExposure: {
    raw: number;
    weight: number;
    contribution: number;
  };
  roadAccess: {
    raw: number;
    weight: number;
    contribution: number;
  };
}

export interface JourneyRiskResult {
  origin: JourneyLocation;
  destination: JourneyLocation;
  selectedDate: string;
  selectedTime: string;
  scenarioSlot: string;
  isPrototypeScenario: true;

  // Overall Score & Status
  overallJourneyRisk: number; // 0–100
  status: JourneyRiskStatus;
  contributions: JourneyRiskContributions;

  // Core metrics
  travelMinutes: number;
  distanceKm: number;

  // Destination vs Journey Disambiguation
  destinationSafetyScore: number; // 0–100 (higher = safer)
  destinationRiskScore: number; // 0–100 (higher = riskier = 100 - destinationSafetyScore)
  routeRiskScore: number; // 0–100 (higher = riskier)
  destinationVsJourneyExplanation: string;

  // Key factors & explanation
  riskFactors: JourneyRiskFactor[];
  supportingExplanation: string;

  // Corridor Analysis
  hazardCorridor: HazardCorridorItem[];
  roadBreakdown: RoadConditionBreakdown;
  alerts: JourneyAlertItem[];
  groundIntelligence: JourneyGroundIntelligence;
  emergencyContext: JourneyEmergencyContext;

  // Comparisons
  routeComparison: RouteJourneyComparisonItem[];
  timeComparison: TimeJourneyComparisonItem[];

  // Edge state detection
  edgeState?: {
    noRoute: boolean;
    allRoutesBlocked: boolean;
    outOfCoverage: boolean;
    missingDataReason?: string;
  };
}
