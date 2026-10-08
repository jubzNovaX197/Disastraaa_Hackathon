/**
 * Emergency Operations Command Center — Types
 *
 * ⚠️ PROTOTYPE / DECISION SUPPORT ONLY
 * Aggregates intelligence across Tasks 2–15:
 * SITUATION → RISK → IMPACT → RESOURCES → ALERTS → GROUND REPORTS → RESPONSE
 */

import type { HazardType, Severity, ReportStatus } from '@/types';
import type { RoadStatus, RoadBlockageType, RoadSegment } from '@/lib/roads/types';
import type { DemoAlert } from '@/data/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { ResourceCategory, ResourceStatus } from '@/lib/planning/resources/types';
import type { ShelterPlanningStatus } from '@/lib/planning/shelter/types';

// ── Operational KPI Groups ───────────────────────────────────────────────────

export interface RiskKpis {
  highestCurrentRisk: {
    score: number;
    zoneName: string;
    dominantHazard: HazardType | 'MULTI_HAZARD';
    severity: Severity;
  };
  highRiskLocationsCount: number;
  floodRiskLocationsCount: number;
  cycloneRiskLocationsCount: number;
  multiHazardLocationsCount: number;
}

export interface ImpactKpis {
  populationExposed: number;
  estimatedBuildingsAffected: number;
  affectedRoadsKm: number;
  affectedHospitals: number;
  affectedSchools: number;
}

export interface ResponseKpis {
  activeAlertsCount: number;
  verifiedCitizenReportsCount: number;
  blockedRoadsCount: number;
  sheltersUnderPressureCount: number;
  resourceShortagesCount: number;
}

export interface CommandOverviewKpis {
  risk: RiskKpis;
  impact: ImpactKpis;
  response: ResponseKpis;
}

// ── Priority Location ────────────────────────────────────────────────────────

export interface PriorityLocation {
  id: string;
  name: string;
  district: string;
  coordinates: [number, number];
  riskScore: number;
  severity: Severity;
  dominantHazard: HazardType | 'MULTI_HAZARD';
  populationExposed: number;
  floodRiskScore?: number;
  cycloneRiskScore?: number;
  activeAlertCount: number;
  activeAlertStatus: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'CLEAR';
  roadAccessibility: 'OPEN' | 'PARTIAL' | 'BLOCKED';
  shelterStatus: ShelterPlanningStatus;
  shelterCapacity: number;
  shelterDemand: number;
  shelterGap: number;
  shelterPressureLabel: string;
  resourceShortageCount: number;
  resourceGapSummary: string;
  rankScore: number;
  impact: {
    buildings: number;
    roadsKm: number;
    hospitals: number;
    schools: number;
  };
  groundReportsCount: number;
  evidenceReportsCount: number;
}

// ── Response Situation Panel (Dynamic Structured Narrative) ──────────────────

export interface OperationalSummaryNarrative {
  situation: string;
  impact: string;
  access: string;
  shelters: string;
  resources: string;
  statusLevel: 'CRITICAL' | 'ELEVATED' | 'MONITORED';
}

// ── Hazard Breakdown ─────────────────────────────────────────────────────────

export interface HazardBreakdownItem {
  hazard: HazardType | 'MULTI_HAZARD';
  title: string;
  description: string;
  affectedLocationsCount: number;
  highRiskLocationsCount: number;
  averageRisk: number;
  highestRisk: number;
  highestRiskLocation: string;
  affectedPopulation: number;
  activeAlertsCount: number;
  icon: string;
}

// ── Situation Timeline Trend ─────────────────────────────────────────────────

export interface SituationTimelinePoint {
  timeLabel: string; // e.g. 'T-12h', 'T-6h', 'T0 (Now)', 'T+6h', 'T+12h', 'T+24h'
  hourOffset: number;
  riskScore: number;
  activeAlertsCount: number;
  shelterPressurePct: number;
  note: string;
  isForecast?: boolean;
}

// ── Citizen Ground Intelligence Breakdown ───────────────────────────────────

export interface CitizenReportsIntelligence {
  totalReports: number;
  pendingReports: number;
  underReviewReports: number;
  verifiedReports: number;
  rejectedReports: number;
  escalatedReports: number;
  evidenceBackedReports: number;
  recentHighImpactReports: CitizenReportItem[];
}

// ── Blocked Road Operations Breakdown ────────────────────────────────────────

export interface RoadOperationsSummary {
  blockedCount: number;
  partiallyBlockedCount: number;
  closedCount: number;
  cautionCount: number;
  openCount: number;
  unknownCount: number;
  totalDisruptions: number;
  criticalSegments: RoadSegment[];
}

// ── Shelter Operations Breakdown ─────────────────────────────────────────────

export interface ShelterOperationsSummaryItem {
  id: string;
  name: string;
  location: string;
  capacity: number;
  occupancy: number;
  projectedDemand: number;
  gapOrSurplus: number;
  utilizationPct: number;
  status: 'AVAILABLE' | 'PRESSURE' | 'SHORTAGE';
  hasMedical: boolean;
  hasFood: boolean;
}

export interface ShelterOperationsSummary {
  totalShelters: number;
  availableShelters: number;
  highUtilizationShelters: number;
  totalCapacityGap: number;
  totalProjectedDemand: number;
  totalProjectedSurplus: number;
  items: ShelterOperationsSummaryItem[];
}

// ── Resource Operations Breakdown ────────────────────────────────────────────

export interface ResourceOperationsItem {
  id: string;
  category: ResourceCategory;
  name: string;
  icon: string;
  required: number;
  available: number;
  gap: number;
  coveragePct: number;
  status: ResourceStatus | 'SHORTAGE' | 'CRITICAL' | 'ADEQUATE';
  unit: string;
}

export interface ResourceOperationsSummary {
  categories: ResourceOperationsItem[];
  totalDeficitCategories: number;
  criticalDeficitCategories: number;
}

// ── Operations Filters ───────────────────────────────────────────────────────

export interface OperationsFilters {
  hazard: 'ALL' | HazardType | 'MULTI_HAZARD';
  severity: 'ALL' | Severity;
  district: string;
  roadStatus: 'ALL' | RoadStatus;
  reportStatus: 'ALL' | ReportStatus | 'EVIDENCE_BACKED';
}

// ── Aggregated Command Center State ──────────────────────────────────────────

export interface CommandCenterData {
  overview: {
    activeDisasters: { id: string; name: string; type: HazardType; severity: Severity }[];
    affectedRegions: string[];
    highestRiskLocation: string;
  };
  kpis: CommandOverviewKpis;
  priorityLocations: PriorityLocation[];
  activeAlerts: DemoAlert[];
  citizenIntelligence: CitizenReportsIntelligence;
  roadOperations: RoadOperationsSummary;
  shelterOperations: ShelterOperationsSummary;
  resourceOperations: ResourceOperationsSummary;
  narrative: OperationalSummaryNarrative;
  hazardBreakdown: HazardBreakdownItem[];
  timelineTrend: SituationTimelinePoint[];
}
