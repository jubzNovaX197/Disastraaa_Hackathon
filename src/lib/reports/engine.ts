/**
 * Citizen Disaster Reporting & Ground Intelligence — Core Engine
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * Deterministic automated triage and verification logic.
 *
 * All formulas are fully explainable, transparent, and reproducible.
 * "Preliminary Automated Analysis" — clearly labeled as non-AI decision support.
 */

import type { BlockedRoad, DemoAlert, DisasterDataset, LngLat, RiskZone, Shelter } from '@/data/types';
import type { HazardType, ReportStatus, Severity } from '@/types';
import { assessPreliminaryEvidence } from './evidence';
import {
  canTransitionStatus,
  REPORT_TO_HAZARD_MAP,
  WORKFLOW_CONSTANTS,
} from './rules';
import type {
  CitizenReportItem,
  CreateReportInput,
  LinkedGroundIntelligence,
  PreliminaryAnalysis,
  PreliminaryConfidence,
  ReportEvidence,
  ReportType,
} from './types';

// ── Geographic Helpers ────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;

/**
 * Calculates great-circle distance between two [lng, lat] coordinates in kilometres.
 */
export function calculateDistanceKm(
  coord1: LngLat,
  coord2: LngLat,
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const r = 6371; // Earth's mean radius in km
  return Math.round(r * c * 10) / 10;
}

/**
 * Approximates centroid of a polygon ring
 */
function getPolygonCentroid(ring: LngLat[]): LngLat {
  if (ring.length === 0) return [0, 0];
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / ring.length, sumLat / ring.length];
}

// ── Link Ground Intelligence ──────────────────────────────────────────────────

export function linkGroundIntelligence(
  coords: LngLat,
  dataset?: Partial<DisasterDataset> | null,
): LinkedGroundIntelligence {
  const result: LinkedGroundIntelligence = {};
  if (!dataset) return result;

  // 1. Closest Risk Zone
  if (dataset.riskZones && dataset.riskZones.length > 0) {
    let closestZone: RiskZone | null = null;
    let minZoneDist = Infinity;

    for (const z of dataset.riskZones) {
      if (!z.coordinates?.[0]) continue;
      const centroid = getPolygonCentroid(z.coordinates[0]);
      const dist = calculateDistanceKm(coords, centroid);
      if (dist < minZoneDist) {
        minZoneDist = dist;
        closestZone = z;
      }
    }

    if (closestZone && minZoneDist <= WORKFLOW_CONSTANTS.MAX_NEARBY_KM) {
      result.nearbyRiskZone = {
        id: closestZone.id,
        name: closestZone.name,
        severity: closestZone.severity,
        score: closestZone.riskScore,
        primaryHazard: closestZone.primaryHazard,
        distanceKm: minZoneDist,
      };
    }
  }

  // 2. Closest Active Alert
  if (dataset.alerts && dataset.alerts.length > 0) {
    let closestAlert: DemoAlert | null = null;
    let minAlertDist = Infinity;

    for (const a of dataset.alerts) {
      if (!a.isActive || !a.coordinates) continue;
      const dist = calculateDistanceKm(coords, a.coordinates);
      if (dist < minAlertDist) {
        minAlertDist = dist;
        closestAlert = a;
      }
    }

    if (closestAlert && minAlertDist <= WORKFLOW_CONSTANTS.MAX_NEARBY_KM) {
      result.nearbyAlert = {
        id: closestAlert.id,
        title: closestAlert.title,
        severity: closestAlert.severity,
        type: closestAlert.type,
        distanceKm: minAlertDist,
      };
    }
  }

  // 3. Closest Shelter
  if (dataset.shelters && dataset.shelters.length > 0) {
    let closestShelter: Shelter | null = null;
    let minShelterDist = Infinity;

    for (const s of dataset.shelters) {
      if (!s.coordinates) continue;
      const dist = calculateDistanceKm(coords, s.coordinates);
      if (dist < minShelterDist) {
        minShelterDist = dist;
        closestShelter = s;
      }
    }

    if (closestShelter && minShelterDist <= WORKFLOW_CONSTANTS.MAX_NEARBY_KM) {
      result.nearbyShelter = {
        id: closestShelter.id,
        name: closestShelter.name,
        status: closestShelter.status,
        capacity: closestShelter.capacity,
        occupancy: closestShelter.occupancy,
        distanceKm: minShelterDist,
      };
    }
  }

  // 4. Closest Blocked Road
  if (dataset.blockedRoads && dataset.blockedRoads.length > 0) {
    let closestRoad: BlockedRoad | null = null;
    let minRoadDist = Infinity;

    for (const r of dataset.blockedRoads) {
      if (!r.coordinates?.[0]) continue;
      // Use midpoint of polyline
      const midIdx = Math.floor(r.coordinates.length / 2);
      const dist = calculateDistanceKm(coords, r.coordinates[midIdx]);
      if (dist < minRoadDist) {
        minRoadDist = dist;
        closestRoad = r;
      }
    }

    if (closestRoad && minRoadDist <= WORKFLOW_CONSTANTS.MAX_NEARBY_KM) {
      result.nearbyBlockedRoad = {
        id: closestRoad.id,
        name: closestRoad.name,
        severity: closestRoad.severity,
        reason: closestRoad.reason,
        distanceKm: minRoadDist,
      };
    }
  }

  return result;
}

// ── Preliminary Automated Analysis ───────────────────────────────────────────

export function analyzePreliminaryReport(
  input: {
    reportType: ReportType;
    hazardType?: HazardType;
    title: string;
    description: string;
    coordinates: LngLat;
    address: string;
    severity: Severity;
    evidenceCount?: number;
    evidence?: ReportEvidence[];
  },
  intelligence: LinkedGroundIntelligence,
): PreliminaryAnalysis {
  const indicators: string[] = [];

  // Run Preliminary Evidence Assessment
  const evidenceList = input.evidence ?? [];
  const hazardType = input.hazardType ?? REPORT_TO_HAZARD_MAP[input.reportType];
  const evidenceAssessment = assessPreliminaryEvidence(evidenceList, {
    reportType: input.reportType,
    hazardType,
    severity: input.severity,
    description: input.description,
    address: input.address,
    coordinates: input.coordinates,
    hasNearbyRisk: !!intelligence.nearbyRiskZone,
    hasNearbyAlert: !!intelligence.nearbyAlert,
  });

  // 1. Completeness Score (0–100)
  let completeness = 20;
  if (input.title.trim().length >= 8) completeness += 20;
  if (input.description.trim().length >= 25) completeness += 30;
  if (input.address.trim().length >= 6) completeness += 20;
  if (Math.abs(input.coordinates[0]) > 0 && Math.abs(input.coordinates[1]) > 0) completeness += 10;
  completeness = Math.min(100, completeness);

  if (completeness >= 80) {
    indicators.push('High report completeness with detailed field observations');
  } else if (completeness < 50) {
    indicators.push('Low detail provided in initial description');
  }

  // 2. Evidence Score (0–100) — driven directly by preliminary evidence assessment
  const evidenceScore = evidenceAssessment.score;
  indicators.push(...evidenceAssessment.indicators);

  // 3. Risk Proximity Score (0–100)
  let riskProximityScore = 20;
  if (intelligence.nearbyRiskZone) {
    const dist = intelligence.nearbyRiskZone.distanceKm;
    if (dist <= 3) {
      riskProximityScore = 100;
      indicators.push(`Directly inside / within 3km of ${intelligence.nearbyRiskZone.name} (Risk Score: ${intelligence.nearbyRiskZone.score})`);
    } else if (dist <= 10) {
      riskProximityScore = 75;
      indicators.push(`Within ${dist}km of ${intelligence.nearbyRiskZone.name}`);
    } else {
      riskProximityScore = 45;
      indicators.push(`Within ${dist}km of known disaster risk zone`);
    }
  } else {
    indicators.push('Outside primary designated high-risk zones');
  }

  // 4. Alert Proximity Score (0–100)
  let alertProximityScore = 15;
  if (intelligence.nearbyAlert) {
    const dist = intelligence.nearbyAlert.distanceKm;
    if (dist <= 5) {
      alertProximityScore = 100;
      indicators.push(`Within ${dist}km of active alert: "${intelligence.nearbyAlert.title}"`);
    } else if (dist <= 15) {
      alertProximityScore = 70;
      indicators.push(`Within ${dist}km of active alert region`);
    } else {
      alertProximityScore = 40;
    }
  }

  // 5. Urgency Calculation
  let urgency: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (
    input.severity === 'CRITICAL' ||
    input.reportType === 'MEDICAL_EMERGENCY' ||
    input.reportType === 'DAMAGED_BUILDING'
  ) {
    urgency = 'CRITICAL';
    indicators.push('Life-safety risk or critical urgency flagged');
  } else if (
    input.severity === 'HIGH' ||
    input.reportType === 'BLOCKED_ROAD' ||
    input.reportType === 'FLOOD'
  ) {
    urgency = 'HIGH';
  } else if (input.severity === 'MODERATE') {
    urgency = 'MODERATE';
  }

  // 6. Composite Score (Weighted)
  const compositeScore = Math.round(
    completeness * 0.3 +
    evidenceScore * 0.25 +
    riskProximityScore * 0.25 +
    alertProximityScore * 0.2
  );

  // 7. Confidence Classification
  let confidence: PreliminaryConfidence = 'LOW_CONFIDENCE';
  if (urgency === 'CRITICAL' && compositeScore >= 60) {
    confidence = 'URGENT';
  } else if (compositeScore >= 75) {
    confidence = 'HIGH_CONFIDENCE';
  } else if (compositeScore >= 45) {
    confidence = 'MEDIUM_CONFIDENCE';
  } else {
    confidence = 'LOW_CONFIDENCE';
  }

  // 8. Potential Alert Trigger Flag
  const potentialAlertTrigger =
    (urgency === 'CRITICAL' || input.severity === 'CRITICAL') &&
    (compositeScore >= 65 || (intelligence.nearbyRiskZone?.score ?? 0) >= 70);

  if (potentialAlertTrigger) {
    indicators.push('⚠️ Requires Authority Review — Potential Public Alert Trigger');
  }

  const summary = `Preliminary Automated Analysis: ${confidence.replace('_', ' ')} (Score ${compositeScore}/100, Urgency: ${urgency}). Not an official government verification.`;

  return {
    confidence,
    score: compositeScore,
    completenessScore: completeness,
    evidenceScore,
    riskProximityScore,
    alertProximityScore,
    urgency,
    indicators,
    summary,
    potentialAlertTrigger,
    duplicateIndicator: false,
    analyzedAt: new Date().toISOString(),
    evidenceAssessment,
  };
}

// ── Create Report Item ────────────────────────────────────────────────────────

let reportSequence = 100;

export function createCitizenReport(
  input: CreateReportInput,
  dataset?: Partial<DisasterDataset> | null,
): CitizenReportItem {
  reportSequence += 1;
  const id = `cr-${String(reportSequence).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const hazardType = input.hazardType ?? REPORT_TO_HAZARD_MAP[input.reportType];

  const intelligence = linkGroundIntelligence(input.coordinates, dataset);

  const preliminaryAnalysis = analyzePreliminaryReport(
    {
      reportType: input.reportType,
      hazardType,
      title: input.title,
      description: input.description,
      coordinates: input.coordinates,
      address: input.address,
      severity: input.severity,
      evidenceCount: input.evidence?.length ?? 0,
      evidence: input.evidence,
    },
    intelligence,
  );

  // Initial status:
  // If urgent or critical, flagged as UNDER_REVIEW; otherwise PENDING
  const initialStatus: ReportStatus =
    preliminaryAnalysis.confidence === 'URGENT' ? 'UNDER_REVIEW' : 'PENDING';

  return {
    id,
    reportType: input.reportType,
    hazardType,
    title: input.title,
    description: input.description,
    coordinates: input.coordinates,
    address: input.address,
    administrativeArea: input.administrativeArea ?? 'Odisha Disaster Zone',
    reporter: {
      isAnonymous: input.isAnonymous ?? true,
      name: input.isAnonymous ? 'Anonymous Citizen' : (input.reporterName || 'Local Citizen'),
      role: 'CITIZEN',
    },
    createdAt: now,
    updatedAt: now,
    severity: input.severity,
    status: initialStatus,
    confirmCount: 0,
    type: hazardType,
    evidence: input.evidence ?? [],
    blockedRoadInfo: input.blockedRoadInfo,
    communityConfirmations: {
      confirmCount: 0,
      suspiciousCount: 0,
      userFeedback: null,
    },
    preliminaryAnalysis,
    authorityVerification: {
      status: 'UNREVIEWED',
    },
    linkedIntelligence: intelligence,
  };
}

// ── Community Confirmation Handler ───────────────────────────────────────────

export function updateCommunityFeedback(
  report: CitizenReportItem,
  action: 'CONFIRM' | 'SUSPICIOUS',
): CitizenReportItem {
  const current = report.communityConfirmations;
  const previousFeedback = current.userFeedback;

  let newConfirms = current.confirmCount;
  let newSuspicious = current.suspiciousCount;
  let newFeedback: 'CONFIRMED' | 'SUSPICIOUS' | null = null;

  // Toggle or switch
  if (action === 'CONFIRM') {
    if (previousFeedback === 'CONFIRMED') {
      newConfirms = Math.max(0, newConfirms - 1);
      newFeedback = null;
    } else {
      newConfirms += 1;
      if (previousFeedback === 'SUSPICIOUS') {
        newSuspicious = Math.max(0, newSuspicious - 1);
      }
      newFeedback = 'CONFIRMED';
    }
  } else {
    if (previousFeedback === 'SUSPICIOUS') {
      newSuspicious = Math.max(0, newSuspicious - 1);
      newFeedback = null;
    } else {
      newSuspicious += 1;
      if (previousFeedback === 'CONFIRMED') {
        newConfirms = Math.max(0, newConfirms - 1);
      }
      newFeedback = 'SUSPICIOUS';
    }
  }

  let updatedStatus = report.status;

  // Status transition based on community corroboration:
  // Cannot override VERIFIED, REJECTED, or ESCALATED
  if (report.status === 'PENDING' || report.status === 'UNDER_REVIEW') {
    if (
      newConfirms >= WORKFLOW_CONSTANTS.COMMUNITY_CONFIRM_THRESHOLD &&
      newConfirms >= newSuspicious * 2
    ) {
      updatedStatus = 'COMMUNITY_CONFIRMED';
    }
  }

  return {
    ...report,
    confirmCount: newConfirms,
    status: updatedStatus,
    updatedAt: new Date().toISOString(),
    communityConfirmations: {
      confirmCount: newConfirms,
      suspiciousCount: newSuspicious,
      userFeedback: newFeedback,
    },
  };
}

// ── Authority Verification Handler ───────────────────────────────────────────

export interface AuthorityVerificationAction {
  action: 'VERIFY' | 'REJECT' | 'ESCALATE';
  reviewerName: string;
  notes?: string;
  actionTaken?: string;
  isAuthority?: boolean;
}

export function applyAuthorityVerification(
  report: CitizenReportItem,
  params: AuthorityVerificationAction,
): { success: boolean; report: CitizenReportItem; error?: string } {
  const isAuthority = params.isAuthority ?? true;
  const targetStatus: ReportStatus =
    params.action === 'VERIFY'
      ? 'VERIFIED'
      : params.action === 'REJECT'
      ? 'REJECTED'
      : 'ESCALATED';

  const check = canTransitionStatus(report.status, targetStatus, isAuthority);
  if (!check.allowed) {
    return { success: false, report, error: check.reason };
  }

  const now = new Date().toISOString();
  const updatedReport: CitizenReportItem = {
    ...report,
    status: targetStatus,
    updatedAt: now,
    authorityVerification: {
      status: targetStatus,
      reviewedBy: params.reviewerName,
      reviewedAt: now,
      notes: params.notes ?? `Authority transitioned report to ${targetStatus}`,
      actionTaken: params.actionTaken,
    },
  };

  return { success: true, report: updatedReport };
}

// ── Filtering and Sorting Utilities ──────────────────────────────────────────

export interface ReportFilterOptions {
  category?: 'ALL' | ReportType | 'ROADS' | 'INFRASTRUCTURE' | 'MEDICAL' | 'SHELTER' | 'VERIFIED' | 'UNDER_REVIEW' | 'ESCALATED';
  status?: 'ALL' | ReportStatus;
  searchQuery?: string;
  sortBy?: 'NEWEST' | 'SEVERITY' | 'CONFIRMATIONS';
}

export function filterAndSortReports(
  reports: CitizenReportItem[],
  options: ReportFilterOptions,
): CitizenReportItem[] {
  let filtered = [...reports];

  // Category filter
  if (options.category && options.category !== 'ALL') {
    const cat = options.category;
    if (cat === 'VERIFIED') {
      filtered = filtered.filter((r) => r.status === 'VERIFIED');
    } else if (cat === 'UNDER_REVIEW') {
      filtered = filtered.filter((r) => r.status === 'UNDER_REVIEW' || r.status === 'PENDING');
    } else if (cat === 'ESCALATED') {
      filtered = filtered.filter((r) => r.status === 'ESCALATED');
    } else if (cat === 'ROADS') {
      filtered = filtered.filter((r) => r.reportType === 'BLOCKED_ROAD' || r.reportType === 'DAMAGED_ROAD');
    } else if (cat === 'INFRASTRUCTURE') {
      filtered = filtered.filter((r) => r.reportType === 'DAMAGED_BUILDING' || r.reportType === 'POWER_OUTAGE');
    } else if (cat === 'MEDICAL') {
      filtered = filtered.filter((r) => r.reportType === 'MEDICAL_EMERGENCY');
    } else if (cat === 'SHELTER') {
      filtered = filtered.filter((r) => r.reportType === 'SHELTER_ISSUE');
    } else {
      filtered = filtered.filter((r) => r.reportType === cat);
    }
  }

  // Status filter
  if (options.status && options.status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === options.status);
  }

  // Search keyword
  if (options.searchQuery && options.searchQuery.trim().length > 0) {
    const q = options.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.administrativeArea.toLowerCase().includes(q) ||
        (r.blockedRoadInfo?.roadName.toLowerCase().includes(q) ?? false)
    );
  }

  // Sorting
  const severityRank: Record<Severity, number> = {
    CRITICAL: 4,
    HIGH:     3,
    MODERATE: 2,
    LOW:      1,
  };

  filtered.sort((a, b) => {
    if (options.sortBy === 'SEVERITY') {
      const diff = severityRank[b.severity] - severityRank[a.severity];
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (options.sortBy === 'CONFIRMATIONS') {
      const diff = b.confirmCount - a.confirmCount;
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Default newest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return filtered;
}
