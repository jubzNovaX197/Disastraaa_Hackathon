/**
 * Citizen Disaster Reporting & Ground Intelligence — Types
 *
 * ⚠️  PROTOTYPE / DEMO SYSTEM
 * Transparent verification workflow:
 * Citizen Report → Preliminary Automated Analysis → Community Confirmation → Authority Verification
 */

import type { LngLat } from '@/data/types';
import type { HazardType, ReportStatus, Severity } from '@/types';
import type {
  PreliminaryEvidenceAssessment,
  StructuredReportEvidence
} from './evidence/types';

export * from './evidence/types';

// ── Report Types ─────────────────────────────────────────────────────────────

export const REPORT_TYPES = {
  FLOOD:                 'FLOOD',
  CYCLONE:               'CYCLONE',
  WATER_LEVEL:           'WATER_LEVEL',
  BLOCKED_ROAD:          'BLOCKED_ROAD',
  DAMAGED_ROAD:          'DAMAGED_ROAD',
  DAMAGED_BUILDING:      'DAMAGED_BUILDING',
  INFRASTRUCTURE_DAMAGE: 'INFRASTRUCTURE_DAMAGE',
  FIRE:                  'FIRE',
  MEDICAL_EMERGENCY:     'MEDICAL_EMERGENCY',
  MISSING_PERSON:        'MISSING_PERSON',
  SHELTER_ISSUE:         'SHELTER_ISSUE',
  POWER_OUTAGE:          'POWER_OUTAGE',
  LANDSLIDE:             'LANDSLIDE',
  OTHER:                 'OTHER',
} as const;

export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];

// ── Blocked Road Details ─────────────────────────────────────────────────────

export const BLOCKAGE_TYPES = {
  FLOODING:         'FLOODING',
  DEBRIS:           'DEBRIS',
  LANDSLIDE:        'LANDSLIDE',
  COLLAPSED_ROAD:   'COLLAPSED_ROAD',
  VEHICLE_ACCIDENT: 'VEHICLE_ACCIDENT',
  UNKNOWN:          'UNKNOWN',
} as const;

export type BlockageType = (typeof BLOCKAGE_TYPES)[keyof typeof BLOCKAGE_TYPES];

export interface BlockedRoadInfo {
  roadName: string;
  blockageType: BlockageType;
  severity: 'FULL' | 'PARTIAL';
  description?: string;
}

// ── Evidence Metadata ────────────────────────────────────────────────────────

export type ReportEvidence = StructuredReportEvidence;

// ── Reporter Identity ────────────────────────────────────────────────────────

export interface ReporterInfo {
  isAnonymous: boolean;
  name?: string;
  contactHash?: string;
  role: 'CITIZEN' | 'VOLUNTEER' | 'FIRST_RESPONDER' | 'OFFICIAL';
}

// ── Community Confirmation ───────────────────────────────────────────────────

export interface CommunityConfirmations {
  confirmCount: number;
  suspiciousCount: number;
  userFeedback?: 'CONFIRMED' | 'SUSPICIOUS' | null;
}

// ── Preliminary Automated Analysis ───────────────────────────────────────────

export type PreliminaryConfidence =
  | 'LOW_CONFIDENCE'
  | 'MEDIUM_CONFIDENCE'
  | 'HIGH_CONFIDENCE'
  | 'URGENT';

export interface PreliminaryAnalysis {
  confidence: PreliminaryConfidence;
  /** Composite confidence score (0–100) */
  score: number;
  completenessScore: number;
  evidenceScore: number;
  riskProximityScore: number;
  alertProximityScore: number;
  urgency: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  indicators: string[];
  summary: string;
  /** Flags whether this report warrants potential alert evaluation */
  potentialAlertTrigger: boolean;
  duplicateIndicator: boolean;
  analyzedAt: string;
  evidenceAssessment?: PreliminaryEvidenceAssessment;
}

// ── Authority Verification ───────────────────────────────────────────────────

export interface AuthorityVerification {
  status: 'UNREVIEWED' | 'VERIFIED' | 'REJECTED' | 'ESCALATED';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  actionTaken?: string;
}

// ── Linked Ground Intelligence ───────────────────────────────────────────────

export interface LinkedGroundIntelligence {
  nearbyRiskZone?: {
    id: string;
    name: string;
    severity: Severity;
    score: number;
    primaryHazard: HazardType;
    distanceKm: number;
  };
  nearbyAlert?: {
    id: string;
    title: string;
    severity: Severity;
    type: HazardType;
    distanceKm: number;
  };
  nearbyShelter?: {
    id: string;
    name: string;
    status: string;
    capacity: number;
    occupancy: number;
    distanceKm: number;
  };
  nearbyBlockedRoad?: {
    id: string;
    name: string;
    severity: string;
    reason: string;
    distanceKm: number;
  };
}

// ── Comprehensive Citizen Report Item ────────────────────────────────────────

export interface CitizenReportItem {
  id: string;
  reportType: ReportType;
  hazardType: HazardType;
  title: string;
  description: string;
  /** [longitude, latitude] GeoJSON coordinate order */
  coordinates: LngLat;
  address: string;
  administrativeArea: string;
  reporter: ReporterInfo;
  createdAt: string;
  updatedAt: string;
  severity: Severity;
  status: ReportStatus;
  confirmCount: number; // backward-compatibility with DemoCitizenReport
  type: HazardType;     // backward-compatibility with DemoCitizenReport
  evidence: ReportEvidence[];
  blockedRoadInfo?: BlockedRoadInfo;
  communityConfirmations: CommunityConfirmations;
  preliminaryAnalysis: PreliminaryAnalysis;
  authorityVerification: AuthorityVerification;
  linkedIntelligence: LinkedGroundIntelligence;
}

// ── Input for Creating New Report ────────────────────────────────────────────

export interface CreateReportInput {
  reportType: ReportType;
  hazardType?: HazardType;
  title: string;
  description: string;
  coordinates: LngLat;
  address: string;
  administrativeArea?: string;
  severity: Severity;
  evidence?: ReportEvidence[];
  blockedRoadInfo?: BlockedRoadInfo;
  reporterName?: string;
  isAnonymous?: boolean;
}
