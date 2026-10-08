/**
 * Situation Analytics & Disaster Intelligence — Types
 *
 * Multi-hazard intelligence, impact trends and operational conditions.
 * Converts existing intelligence engines into actionable analytical views.
 *
 * Decision-support only · No autonomous emergency control
 */

import type { HazardType, Severity, ReportStatus } from '@/types';
import type { RoadStatus, RoadSegment } from '@/lib/roads/types';
import type { DemoAlert } from '@/data/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { HistoricalDisasterEvent, HistoricalSummary } from '@/lib/historical/types';
import type { ShelterPlanningStatus } from '@/lib/planning/shelter/types';
import type { ResourceStatus } from '@/lib/planning/resources/types';

// ── Overview KPIs ────────────────────────────────────────────────────────────

export interface AnalyticsOverviewKpis {
  activeHazardsCount: number;
  highRiskAreasCount: number;
  populationExposed: number;
  activeAlertsCount: number;
  verifiedFieldReportsCount: number;
  blockedRoadsCount: number;
  sheltersUnderPressureCount: number;
  resourceShortagesCount: number;
}

// ── Hazard Analytics Comparison ──────────────────────────────────────────────

export interface HazardMetricProfile {
  hazard: HazardType | 'MULTI_HAZARD';
  title: string;
  description: string;
  affectedAreasCount: number;
  averageRisk: number;
  highestRisk: number;
  highestRiskLocation: string;
  exposedPopulation: number;
  activeAlertsCount: number;
  impactedInfrastructure: {
    buildings: number;
    roadsKm: number;
    hospitals: number;
    schools: number;
  };
  dominantSeverity: Severity;
}

export interface HazardAnalyticsComparison {
  flood: HazardMetricProfile;
  cyclone: HazardMetricProfile;
  multiHazard: HazardMetricProfile;
}

// ── Risk Distribution ────────────────────────────────────────────────────────

export interface SeverityDistributionBucket {
  severity: Severity;
  count: number;
  percentage: number;
  locations: string[];
}

export interface RiskDistributionData {
  buckets: SeverityDistributionBucket[];
  totalLocations: number;
  averageScore: number;
}

// ── Impact Analytics ─────────────────────────────────────────────────────────

export interface ImpactAnalyticsMetric {
  label: string;
  unit: string;
  projectedValue: number;
  verifiedValue: number | null;
  confidenceRating: 'HIGH' | 'MODERATE' | 'PRELIMINARY';
  note: string;
}

export interface ImpactAnalyticsData {
  population: ImpactAnalyticsMetric;
  buildings: ImpactAnalyticsMetric;
  roadsKm: ImpactAnalyticsMetric;
  hospitals: ImpactAnalyticsMetric;
  schools: ImpactAnalyticsMetric;
  shelters: ImpactAnalyticsMetric;
  synthesisNote: string;
}

// ── Alert Analytics ──────────────────────────────────────────────────────────

export interface AlertSeverityCount {
  severity: Severity;
  count: number;
}

export interface AlertHazardCount {
  hazard: HazardType | 'STORM_SURGE' | 'LIGHTNING';
  count: number;
  label: string;
}

export interface AlertRegionCount {
  region: string;
  count: number;
}

export interface AlertAnalyticsData {
  totalAlerts: number;
  activeAlerts: number;
  expiredAlerts: number;
  bySeverity: AlertSeverityCount[];
  byHazard: AlertHazardCount[];
  byRegion: AlertRegionCount[];
  recentAlerts: DemoAlert[];
}

// ── Field Intelligence Analytics ─────────────────────────────────────────────

export interface ReportCategoryCount {
  category: 'FLOODING' | 'BLOCKED_ROAD' | 'INFRASTRUCTURE' | 'SHELTER' | 'OTHER';
  label: string;
  count: number;
  verifiedCount: number;
}

export interface FieldIntelligenceAnalyticsData {
  totalReports: number;
  verifiedReports: number;
  pendingReports: number;
  underReviewReports: number;
  rejectedReports: number;
  escalatedReports: number;
  evidenceBackedReports: number;
  verificationRatePct: number;
  byCategory: ReportCategoryCount[];
  recentReports: CitizenReportItem[];
  verificationDisclaimer: string;
}

// ── Infrastructure Analytics ─────────────────────────────────────────────────

export interface RoadConditionAnalytics {
  open: number;
  caution: number;
  partiallyBlocked: number;
  blocked: number;
  closed: number;
  totalSegments: number;
  criticalSegments: RoadSegment[];
}

export interface ShelterConditionAnalytics {
  available: number;
  pressure: number;
  shortage: number;
  totalShelters: number;
  totalCapacity: number;
  currentOccupancy: number;
  projectedDemand: number;
  totalCapacityGap: number;
}

export interface ResourceConditionAnalytics {
  available: number;
  limited: number;
  shortage: number;
  totalCategories: number;
  criticalDeficits: string[];
}

export interface InfrastructureAnalyticsData {
  roads: RoadConditionAnalytics;
  shelters: ShelterConditionAnalytics;
  resources: ResourceConditionAnalytics;
}

// ── Regional Analytics Row ───────────────────────────────────────────────────

export interface RegionalAnalyticsRow {
  id: string;
  name: string;
  district: string;
  coordinates: [number, number];
  dominantHazard: HazardType | 'MULTI_HAZARD';
  riskScore: number;
  severity: Severity;
  populationExposed: number;
  activeAlertsCount: number;
  highestAlertSeverity: Severity | 'NONE';
  roadAccessStatus: 'OPEN' | 'CAUTION' | 'PARTIAL' | 'BLOCKED' | 'RESTRICTED';
  shelterStatus: ShelterPlanningStatus;
  shelterGap: number;
  shelterPressurePct: number;
  resourceStatus: ResourceStatus | 'SHORTAGE' | 'CRITICAL' | 'ADEQUATE';
  resourceShortagesCount: number;
  fieldReportsCount: number;
  verifiedReportsCount: number;
  impactEstimates: {
    buildings: number;
    roadsKm: number;
    hospitals: number;
    schools: number;
  };
}

// ── Trend Analysis Timeline Point ────────────────────────────────────────────

export interface TrendAnalysisPoint {
  timeLabel: string;
  hourOffset: number;
  riskScore: number;
  activeAlertsCount: number;
  fieldReportsCount: number;
  blockedRoadsCount: number;
  shelterPressurePct: number;
  isScenarioDerived: boolean;
  annotation: string;
}

// ── Historical Comparison ────────────────────────────────────────────────────

export interface HistoricalComparisonData {
  summary: HistoricalSummary;
  matchedEventsCount: number;
  historicalAnnualFrequency: number;
  historicalAverageSeverity: string;
  peakHistoricalEvent: HistoricalDisasterEvent | null;
  historicalAvgPopulation: number;
  historicalAvgBuildings: number;
  currentExposedVsHistoricalAvgRatio: number;
  currentRiskRelativeElevation: 'SIGNIFICANTLY_ELEVATED' | 'ELEVATED' | 'BASELINE' | 'BELOW_BASELINE';
  comparativeInsight: string;
}

// ── Filter State ─────────────────────────────────────────────────────────────

export interface AnalyticsFilterState {
  hazard: 'ALL' | HazardType | 'MULTI_HAZARD';
  region: string;
  severity: 'ALL' | Severity;
  timePeriod: 'CURRENT_CYCLE' | 'LAST_24H' | 'LAST_48H' | 'LAST_7D';
  alertStatus: 'ALL' | 'ACTIVE' | 'EXPIRED';
  searchQuery: string;
}

// ── Master Situation Analytics Dataset ───────────────────────────────────────

export interface SituationAnalyticsData {
  overviewKpis: AnalyticsOverviewKpis;
  hazardComparison: HazardAnalyticsComparison;
  riskDistribution: RiskDistributionData;
  impactAnalytics: ImpactAnalyticsData;
  alertAnalytics: AlertAnalyticsData;
  fieldIntelligence: FieldIntelligenceAnalyticsData;
  infrastructure: InfrastructureAnalyticsData;
  regionalRows: RegionalAnalyticsRow[];
  trendTimeline: TrendAnalysisPoint[];
  historicalComparison: HistoricalComparisonData;
}
