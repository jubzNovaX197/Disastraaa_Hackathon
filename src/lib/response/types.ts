/**
 * Response Coordination & Resource Operations — Types
 *
 * Professional emergency operations coordination architecture:
 * WHAT IS NEEDED → WHERE IT IS NEEDED → WHAT IS AVAILABLE → WHAT HAS A GAP
 *
 * Decision-support only · No autonomous emergency control
 */

import type { HazardType, Severity } from '@/types';
import type { ResourceCategory } from '@/lib/planning/resources/types';

// ── Operational Workflow Status ──────────────────────────────────────────────

export const OPERATIONAL_STATUSES = [
  'MONITORING',
  'ASSESSING',
  'RESPONSE PLANNED',
  'RESOURCE DEPLOYMENT',
  'ACTIVE RESPONSE',
  'RESOLVED',
] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

// ── Resource Availability Status ─────────────────────────────────────────────

export type ResourceAvailabilityStatus = 'AVAILABLE' | 'LIMITED' | 'SHORTAGE';

// ── Shelter Operational Status ───────────────────────────────────────────────

export type ShelterOperationalStatus = 'AVAILABLE' | 'PRESSURE' | 'SHORTAGE';

// ── Operational Overview Metrics ─────────────────────────────────────────────

export interface OperationalOverviewMetrics {
  activeIncidents: number;
  highPriorityAreas: number;
  resourceShortages: number;
  shelterPressure: number;
  roadBlockages: number;
  pendingFieldReports: number;
}

// ── Resource Allocation Breakdown per Zone ───────────────────────────────────

export interface ResourceZoneAllocation {
  zoneId: string;
  zoneName: string;
  district: string;
  required: number;
  available: number;
  gap: number;
  coveragePct: number;
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  operationalStatus: OperationalStatus;
}

// ── Master Resource Item ─────────────────────────────────────────────────────

export interface ResourceReadinessItem {
  id: string;
  category: ResourceCategory;
  name: string;
  icon: string;
  unit: string;
  required: number;
  available: number;
  gap: number;
  coveragePct: number;
  status: ResourceAvailabilityStatus;
  affectedZones: ResourceZoneAllocation[];
}

// ── Priority Index Breakdown ─────────────────────────────────────────────────

export interface PriorityFactorContribution {
  factor: string;
  weight: number;
  rawScore: number;
  contribution: number;
  explanation: string;
}

export interface ResponsePriorityIndex {
  score: number; // 0–100
  level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  factors: PriorityFactorContribution[];
}

// ── Response Timeline Step ───────────────────────────────────────────────────

export interface ResponseTimelineStep {
  id: string;
  step: string;
  timestamp: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  details: string;
}

// ── Operational Response Zone ────────────────────────────────────────────────

export interface ResponseZoneItem {
  id: string;
  name: string;
  district: string;
  coordinates: [number, number];
  riskScore: number;
  dominantHazard: HazardType | 'MULTI_HAZARD';
  populationExposed: number;
  impactEstimate: {
    buildings: number;
    roadsKm: number;
    hospitals: number;
    schools: number;
  };
  activeAlertCount: number;
  activeAlertSeverity: Severity | 'NONE';
  roadAccess: 'OPEN' | 'PARTIAL' | 'RESTRICTED';
  shelterCapacity: number;
  shelterOccupancy: number;
  shelterDemand: number;
  shelterGap: number;
  shelterStatus: ShelterOperationalStatus;
  resourceGaps: {
    category: ResourceCategory;
    name: string;
    gap: number;
    unit: string;
  }[];
  totalResourceGapCount: number;
  fieldReportsCount: number;
  verifiedReportsCount: number;
  evidenceReportsCount: number;
  priorityIndex: ResponsePriorityIndex;
  operationalStatus: OperationalStatus;
  timeline: ResponseTimelineStep[];
}

// ── Shelter Operations Overview ─────────────────────────────────────────────

export interface ShelterOperationalItem {
  id: string;
  name: string;
  district: string;
  capacity: number;
  currentOccupancy: number;
  projectedDemand: number;
  availableCapacity: number;
  gap: number;
  status: ShelterOperationalStatus;
  hasMedical: boolean;
  hasFood: boolean;
}

export interface ShelterOperationsData {
  totalShelters: number;
  availableCapacity: number;
  projectedDemand: number;
  capacityGap: number;
  highPressureShelters: number;
  shortageAreasCount: number;
  shelters: ShelterOperationalItem[];
}

// ── Response Filtering & Search ──────────────────────────────────────────────

export interface ResponseFilters {
  resourceType: 'ALL' | ResourceCategory;
  region: string;
  severity: 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  availabilityStatus: 'ALL' | ResourceAvailabilityStatus;
  searchQuery: string;
}

// ── Aggregated Response Coordination Dataset ─────────────────────────────────

export interface ResponseCoordinationData {
  overview: OperationalOverviewMetrics;
  resources: ResourceReadinessItem[];
  zones: ResponseZoneItem[];
  shelters: ShelterOperationsData;
}
