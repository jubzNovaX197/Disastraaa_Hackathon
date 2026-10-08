/**
 * Road Intelligence — Status & Travel Risk Engine
 *
 * ⚠️  PROTOTYPE / DEMO DETERMINISTIC DECISION SUPPORT
 * Correlates citizen reports, authority verifications, and hazard risk without external routing APIs.
 */

import type {
  RoadSegment,
  RoadStatus,
  RoadTravelRisk,
  RoadAuthorityVerification,
} from './types';
import { getRoadRiskSeverity, ROAD_STATUS_CONFIG } from './rules';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { LngLat } from '@/data/types';

// ── Great-Circle Distance (Haversine Formula) ────────────────────────────────

function haversineDistanceKm(coord1: LngLat, coord2: LngLat): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Calculate Distance from Point to Road Polyline ────────────────────────────

export function distanceToRoadKm(point: LngLat, roadCoords: LngLat[]): number {
  if (!roadCoords || roadCoords.length === 0) return Infinity;

  let minDistance = Infinity;
  for (const coord of roadCoords) {
    const dist = haversineDistanceKm(point, coord);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return Math.round(minDistance * 10) / 10;
}

// ── Calculate Road Travel Risk (Score 0–100) ──────────────────────────────────

export function calculateRoadTravelRisk(road: {
  status: RoadStatus;
  roadType: RoadSegment['roadType'];
  blockageType?: RoadSegment['blockageType'];
  hazardExposure?: RoadSegment['hazardExposure'];
  isVerified?: boolean;
}): RoadTravelRisk {
  const factors: string[] = [];
  let score = 10; // Baseline ambient road risk

  // 1. Status Factor
  switch (road.status) {
    case 'CLOSED':
      score += 75;
      factors.push('Officially closed by Disaster Management Authority');
      break;
    case 'BLOCKED':
      score += 65;
      factors.push('Physical blockage impassable to regular transit');
      break;
    case 'PARTIALLY_BLOCKED':
      score += 45;
      factors.push('Single lane or shoulder obstruction causing severe bottlenecks');
      break;
    case 'CAUTION':
      score += 25;
      factors.push('Active hazard advisory; reduced visibility and wet roadway');
      break;
    case 'OPEN':
      score += 0;
      factors.push('Clear of physical obstructions');
      break;
    case 'UNKNOWN':
      score += 15;
      factors.push('Unconfirmed field reports; conditions pending inspection');
      break;
  }

  // 2. Hazard Exposure Factor
  if (road.hazardExposure) {
    if (road.hazardExposure.riskScore && road.hazardExposure.riskScore > 70) {
      score += 15;
      factors.push(`Inside elevated disaster hazard zone: ${road.hazardExposure.riskZoneName ?? 'Sector'}`);
    }
    if (road.hazardExposure.alertSeverity === 'CRITICAL') {
      score += 15;
      factors.push(`Active RED alert in sector: ${road.hazardExposure.alertTitle ?? 'Severe Warning'}`);
    } else if (road.hazardExposure.alertSeverity === 'HIGH') {
      score += 10;
      factors.push(`Active Emergency warning in sector: ${road.hazardExposure.alertTitle ?? 'Weather Warning'}`);
    }
  }

  // 3. Road Vulnerability by Type
  if (road.roadType === 'VILLAGE_ROAD') {
    score += 10;
    factors.push('Narrow rural roadbed susceptible to water washouts and soft shoulders');
  } else if (road.roadType === 'LOCAL_ROAD') {
    score += 5;
    factors.push('Urban street prone to localized stormwater accumulation');
  } else if (road.roadType === 'HIGHWAY') {
    score -= 5;
    factors.push('Elevated multi-lane engineering provides higher stormwater resilience');
  }

  // Bound score
  score = Math.max(5, Math.min(100, Math.round(score)));
  const severity = getRoadRiskSeverity(score);
  const cfg = ROAD_STATUS_CONFIG[road.status];

  let explanation = '';
  if (road.status === 'BLOCKED' || road.status === 'CLOSED') {
    explanation = `${road.status === 'CLOSED' ? 'Officially barricaded' : 'Completely impassable'} due to active physical obstructions. Travel prohibited.`;
  } else if (road.status === 'PARTIALLY_BLOCKED') {
    explanation = 'Passable with severe delays. One lane operating under alternating control. High-clearance vehicles advised.';
  } else if (road.status === 'CAUTION') {
    explanation = 'Passable under active weather advisory. Exercise extreme caution near low-lying crossings and trees.';
  } else {
    explanation = 'Route observed clear. Safe for emergency logistics, supply distribution, and general transit.';
  }

  return {
    score,
    severity,
    factors,
    explanation,
    travelAdvice: cfg.publicGuidance,
    safeToTravel: score < 50 && road.status === 'OPEN',
  };
}

// ── Determine Road Status from Citizen Reports & Overrides ───────────────────

export function determineRoadStatus(
  baseRoad: RoadSegment,
  relatedReports: CitizenReportItem[] = [],
): RoadStatus {
  // 1. Authority overrides take absolute precedence
  if (baseRoad.authorityVerification.status === 'OVERRIDDEN_OPEN') {
    return 'OPEN';
  }
  if (baseRoad.authorityVerification.status === 'OVERRIDDEN_CLOSED') {
    return 'CLOSED';
  }
  if (baseRoad.authorityVerification.status === 'VERIFIED') {
    // If authority verified a blockage, respect the designated blockage severity
    return baseRoad.severity === 'CRITICAL' || baseRoad.severity === 'HIGH'
      ? 'BLOCKED'
      : 'PARTIALLY_BLOCKED';
  }

  // 2. Correlate verified citizen reports
  const verifiedReports = relatedReports.filter((r) => r.status === 'VERIFIED');
  const fullBlockageVerified = verifiedReports.some(
    (r) => r.blockedRoadInfo?.severity === 'FULL',
  );
  if (fullBlockageVerified) {
    return 'BLOCKED';
  }

  const partialBlockageVerified = verifiedReports.some(
    (r) => r.blockedRoadInfo?.severity === 'PARTIAL',
  );
  if (partialBlockageVerified) {
    return 'PARTIALLY_BLOCKED';
  }

  // 3. Correlate community confirmed reports
  const communityConfirmed = relatedReports.filter(
    (r) => r.status === 'COMMUNITY_CONFIRMED' || r.confirmCount >= 10,
  );
  if (communityConfirmed.some((r) => r.blockedRoadInfo?.severity === 'FULL')) {
    return 'PARTIALLY_BLOCKED'; // Unverified community report defaults to partial/caution until authority confirms
  }
  if (communityConfirmed.length > 0) {
    return 'CAUTION';
  }

  // 4. Default back to base road status
  return baseRoad.status;
}

// ── Associate Citizen Report with Nearest Road ───────────────────────────────

export function associateReportWithRoad(
  reportCoords: LngLat,
  roads: RoadSegment[],
  maxDistanceKm = 5.0,
): { road: RoadSegment; distanceKm: number } | null {
  let closestRoad: RoadSegment | null = null;
  let minDistance = Infinity;

  for (const road of roads) {
    const dist = distanceToRoadKm(reportCoords, road.coordinates);
    if (dist < minDistance) {
      minDistance = dist;
      closestRoad = road;
    }
  }

  if (closestRoad && minDistance <= maxDistanceKm) {
    return { road: closestRoad, distanceKm: minDistance };
  }

  return null;
}

// ── Authority Verification Actions on Roads ──────────────────────────────────

export function applyAuthorityRoadAction(
  road: RoadSegment,
  action: 'VERIFY_BLOCKAGE' | 'MARK_OPEN' | 'MARK_PARTIALLY_BLOCKED' | 'MARK_CLOSED' | 'ESCALATE',
  reviewer: { name: string; notes?: string },
): RoadSegment {
  const reviewedAt = new Date().toISOString();
  let updatedStatus: RoadStatus = road.status;
  let updatedVerification: RoadAuthorityVerification = {
    isVerified: true,
    reviewedBy: reviewer.name,
    reviewedAt,
    notes: reviewer.notes || `Authority operational action: ${action}`,
    status: 'VERIFIED',
    actionTaken: '',
  };

  switch (action) {
    case 'VERIFY_BLOCKAGE':
      updatedStatus = 'BLOCKED';
      updatedVerification.actionTaken = 'Blockage verified by field authority. Route flagged as impassable.';
      break;

    case 'MARK_OPEN':
      updatedStatus = 'OPEN';
      updatedVerification.status = 'OVERRIDDEN_OPEN';
      updatedVerification.actionTaken = 'Road inspected and declared open. Debris cleared / water subsided.';
      break;

    case 'MARK_PARTIALLY_BLOCKED':
      updatedStatus = 'PARTIALLY_BLOCKED';
      updatedVerification.actionTaken = 'Single-lane transit permitted under escort or caution.';
      break;

    case 'MARK_CLOSED':
      updatedStatus = 'CLOSED';
      updatedVerification.status = 'OVERRIDDEN_CLOSED';
      updatedVerification.actionTaken = 'Emergency closure enacted. Police barricades deployed.';
      break;

    case 'ESCALATE':
      updatedStatus = 'BLOCKED';
      updatedVerification.actionTaken = 'Escalated to State Emergency Operations Centre for heavy machinery dispatch.';
      break;
  }

  // Recalculate road travel risk with updated status
  const updatedTravelRisk = calculateRoadTravelRisk({
    status: updatedStatus,
    roadType: road.roadType,
    blockageType: road.blockageType,
    hazardExposure: road.hazardExposure,
    isVerified: true,
  });

  return {
    ...road,
    status: updatedStatus,
    isVerified: true,
    lastUpdated: reviewedAt,
    authorityVerification: updatedVerification,
    travelRisk: updatedTravelRisk,
  };
}

// ── Road Filter Function ─────────────────────────────────────────────────────

export function filterRoads(
  roads: RoadSegment[],
  filter: string,
  searchQuery = '',
): RoadSegment[] {
  let result = [...roads];

  // Status / Risk filter
  if (filter === 'OPEN') {
    result = result.filter((r) => r.status === 'OPEN');
  } else if (filter === 'CAUTION') {
    result = result.filter((r) => r.status === 'CAUTION');
  } else if (filter === 'PARTIALLY_BLOCKED') {
    result = result.filter((r) => r.status === 'PARTIALLY_BLOCKED');
  } else if (filter === 'BLOCKED') {
    result = result.filter((r) => r.status === 'BLOCKED');
  } else if (filter === 'CLOSED') {
    result = result.filter((r) => r.status === 'CLOSED');
  } else if (filter === 'HIGH_RISK') {
    result = result.filter((r) => r.travelRisk.severity === 'HIGH' || r.travelRisk.severity === 'CRITICAL');
  } else if (filter === 'CRITICAL_RISK') {
    result = result.filter((r) => r.travelRisk.severity === 'CRITICAL');
  }

  // Text search query (name, route code, administrative area)
  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.code && r.code.toLowerCase().includes(q)) ||
        r.administrativeArea.toLowerCase().includes(q) ||
        (r.blockageType && r.blockageType.toLowerCase().includes(q)),
    );
  }

  return result;
}
