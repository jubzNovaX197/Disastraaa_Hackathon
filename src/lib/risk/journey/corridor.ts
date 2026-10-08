/**
 * Journey Risk Corridor Analyzer (Task 15)
 *
 * ⚠️  PROTOTYPE GEOSPATIAL ANALYSIS — DETERMINISTIC DEMO CORRIDOR
 *
 * Geographically inspects route polylines and segment coordinates against:
 *  - Flood hazard zones (inundation, river basins)
 *  - Cyclone hazard belts & wind swaths
 *  - Multi-hazard vulnerability zones
 *  - Roadway operational conditions & blockages
 *  - Active disaster alerts
 *  - Ground citizen reports & evidence
 *  - Emergency shelters & resource depots
 */

import type { LngLat } from '@/data/types';
import type { Severity } from '@/types';
import type { RouteResult } from '@/lib/routing/types';
import {
  demoDataset,
  demoCycloneZones,
  computedMultiHazardRisks,
  ZONE_TO_MULTI_HAZARD_ID,
} from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoShelters } from '@/data/demo/shelters';
import type {
  HazardCorridorItem,
  RoadConditionBreakdown,
  JourneyAlertItem,
  JourneyGroundIntelligence,
  JourneyEmergencyContext,
} from './types';

// ── Great-Circle Distance ───────────────────────────────────────────────────

export function haversineDistanceKm(a: LngLat, b: LngLat): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aHarv =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
  return Math.round(R * c * 10) / 10;
}

/** Minimum distance from a point to a polyline */
export function minDistanceToPolylineKm(point: LngLat, polyline: LngLat[]): number {
  if (!polyline || polyline.length === 0) return Infinity;
  let min = Infinity;
  for (const c of polyline) {
    const d = haversineDistanceKm(point, c);
    if (d < min) min = d;
  }
  return min;
}

// ── 1. Hazard Corridor Analysis ─────────────────────────────────────────────

export function analyzeHazardCorridor(
  route: RouteResult | null | undefined,
  destinationCoords: LngLat
): HazardCorridorItem[] {
  const corridorItems: HazardCorridorItem[] = [];

  if (!route || !route.found || route.segments.length === 0) {
    return corridorItems;
  }

  const routeCoords = route.mapCoordinates;

  // 1. Inspect Route Segments for Blockages / Caution
  for (const seg of route.segments) {
    if (seg.isBlocked || seg.status === 'BLOCKED' || seg.status === 'CLOSED') {
      corridorItems.push({
        id: `corridor-road-${seg.edgeId}`,
        segmentName: seg.roadName || 'Corridor Segment',
        hazardType: 'ROAD_BLOCKAGE',
        risk: 'CRITICAL',
        exposureKm: Math.round(seg.distanceKm * 10) / 10,
        reason: seg.hazardNote || 'Roadway is completely blocked or closed by civil authorities.',
        coordinates: seg.coordinates[0],
      });
    } else if (seg.status === 'PARTIALLY_BLOCKED') {
      corridorItems.push({
        id: `corridor-road-${seg.edgeId}`,
        segmentName: seg.roadName || 'Corridor Segment',
        hazardType: 'ROAD_BLOCKAGE',
        risk: 'HIGH',
        exposureKm: Math.round(seg.distanceKm * 10) / 10,
        reason: seg.hazardNote || 'Partial blockage: single-lane alternating transit bottleneck.',
        coordinates: seg.coordinates[0],
      });
    } else if (seg.status === 'CAUTION') {
      corridorItems.push({
        id: `corridor-road-${seg.edgeId}`,
        segmentName: seg.roadName || 'Corridor Segment',
        hazardType: 'ROAD_BLOCKAGE',
        risk: 'MODERATE',
        exposureKm: Math.round(seg.distanceKm * 10) / 10,
        reason: seg.hazardNote || 'Hazard alert active on corridor; slow speed restrictions.',
        coordinates: seg.coordinates[0],
      });
    }
  }

  // 2. Intersect with Flood Areas & River Basins
  for (const flood of demoDataset.floodAreas) {
    const center: LngLat = flood.coordinates[0]?.[0] ?? [85.8, 20.3];
    const dist = minDistanceToPolylineKm(center, routeCoords);
    if (dist <= 8.0) {
      const radiusKm = flood.areaKm2 ? Math.sqrt(flood.areaKm2 / Math.PI) : 4.0;
      const approxExposureKm = Math.min(
        route.totalDistanceKm,
        Math.round((radiusKm * 1.4) * 10) / 10
      );
      corridorItems.push({
        id: `corridor-flood-${flood.id}`,
        segmentName: flood.name,
        hazardType: 'FLOOD',
        risk: flood.severity,
        exposureKm: Math.max(1.5, approxExposureKm),
        reason: `Route corridor passes within ${dist} km of ${flood.name} (${flood.severity} inundation zone).`,
        coordinates: center,
      });
    }
  }

  // 3. Intersect with Cyclone Zones
  for (const cz of demoCycloneZones) {
    const center: LngLat = cz.coordinates[0]?.[0] ?? [85.8, 19.8];
    const dist = minDistanceToPolylineKm(center, routeCoords);
    if (dist <= 15.0) {
      corridorItems.push({
        id: `corridor-cyclone-${cz.id}`,
        segmentName: cz.name,
        hazardType: 'CYCLONE',
        risk: cz.severity,
        exposureKm: Math.round(Math.min(route.totalDistanceKm, 12.0) * 10) / 10,
        reason: `Route traverses ${cz.name} (Risk score: ${cz.riskScore}/100, ${cz.description || 'gale wind buffer'}).`,
        coordinates: center,
      });
    }
  }

  // 4. Intersect with Multi-Hazard Risk Zones
  for (const [zoneId, mhExplanation] of Object.entries(computedMultiHazardRisks)) {
    const matchingZone = demoDataset.riskZones.find((z) => {
      const canonicalId = ZONE_TO_MULTI_HAZARD_ID[z.id];
      return canonicalId === zoneId || z.id === zoneId;
    });

    if (matchingZone) {
      const center: LngLat = matchingZone.coordinates[0]?.[0] ?? [85.8, 20.2];
      const dist = minDistanceToPolylineKm(center, routeCoords);
      if (dist <= 6.0 && (mhExplanation.result.severity === 'HIGH' || mhExplanation.result.severity === 'CRITICAL')) {
        if (!corridorItems.some((c) => c.segmentName.includes(matchingZone.name))) {
          corridorItems.push({
            id: `corridor-multihazard-${zoneId}`,
            segmentName: matchingZone.name,
            hazardType: 'MULTI_HAZARD',
            risk: mhExplanation.result.severity,
            exposureKm: Math.round(Math.min(route.totalDistanceKm, 8.5) * 10) / 10,
            reason: `Composite hazard index ${mhExplanation.result.score}/100. Dominant threat: ${mhExplanation.result.dominantHazard}.`,
            coordinates: center,
          });
        }
      }
    }
  }

  return corridorItems;
}

// ── 2. Road Condition Impact Breakdown ──────────────────────────────────────

export function analyzeRoadConditions(route: RouteResult | null | undefined): RoadConditionBreakdown {
  if (!route || !route.found || route.segments.length === 0) {
    return {
      openKm: 0,
      cautionKm: 0,
      partiallyBlockedKm: 0,
      blockedKm: 0,
      unknownKm: 0,
      totalKm: 0,
      hasBlockedSegment: false,
      blockageNotes: [],
    };
  }

  let openKm = 0;
  let cautionKm = 0;
  let partiallyBlockedKm = 0;
  let blockedKm = 0;
  let unknownKm = 0;
  const blockageNotes: string[] = [];

  for (const seg of route.segments) {
    const km = seg.distanceKm;
    if (seg.isBlocked || seg.status === 'BLOCKED' || seg.status === 'CLOSED') {
      blockedKm += km;
      if (seg.hazardNote && !blockageNotes.includes(seg.hazardNote)) {
        blockageNotes.push(`${seg.roadName}: ${seg.hazardNote}`);
      }
    } else if (seg.status === 'PARTIALLY_BLOCKED') {
      partiallyBlockedKm += km;
      if (seg.hazardNote && !blockageNotes.includes(seg.hazardNote)) {
        blockageNotes.push(`${seg.roadName}: ${seg.hazardNote}`);
      }
    } else if (seg.status === 'CAUTION') {
      cautionKm += km;
    } else if (seg.status === 'OPEN') {
      openKm += km;
    } else {
      unknownKm += km;
    }
  }

  return {
    openKm: Math.round(openKm * 10) / 10,
    cautionKm: Math.round(cautionKm * 10) / 10,
    partiallyBlockedKm: Math.round(partiallyBlockedKm * 10) / 10,
    blockedKm: Math.round(blockedKm * 10) / 10,
    unknownKm: Math.round(unknownKm * 10) / 10,
    totalKm: Math.round(route.totalDistanceKm * 10) / 10,
    hasBlockedSegment: blockedKm > 0,
    blockageNotes,
  };
}

// ── 3. Active Alert Impact on Journey Corridor ──────────────────────────────

export function analyzeCorridorAlerts(
  routeCoords: LngLat[],
  activeAlertIds?: string[]
): JourneyAlertItem[] {
  const result: JourneyAlertItem[] = [];
  const alertsPool = demoDataset.alerts.filter((a) => a.isActive);

  for (const alert of alertsPool) {
    const dist = minDistanceToPolylineKm(alert.coordinates, routeCoords);
    const isExplicitlyActive = activeAlertIds?.includes(alert.id);

    if (dist <= 14.0 || isExplicitlyActive) {
      result.push({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        summary: alert.message,
        affectedArea: alert.regionName,
        validPeriod: alert.expiresAt
          ? `Valid until ${new Date(alert.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Active 24h Advisory',
        routeExposureKm: Math.round(Math.max(1.2, 12.0 - dist) * 10) / 10,
        distanceToRouteKm: dist,
      });
    }
  }

  return result.sort((a, b) => {
    const rank: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 };
    return rank[b.severity] - rank[a.severity];
  });
}

// ── 4. Citizen Ground Intelligence ──────────────────────────────────────────

export function analyzeGroundIntelligence(
  routeCoords: LngLat[],
  customReports?: any[],
  environment: 'REAL' | 'DEMO' = 'DEMO',
): JourneyGroundIntelligence {
  const isReal = environment === 'REAL';
  const reportsPool = customReports ?? (isReal ? [] : demoCitizenReports);
  const nearbyReports: JourneyGroundIntelligence['reports'] = [];
  const categories: Record<string, number> = {};
  let verifiedCount = 0;
  let blockedRoadCount = 0;
  let evidenceBackedCount = 0;

  for (const rep of reportsPool) {
    const dist = minDistanceToPolylineKm(rep.coordinates, routeCoords);
    if (dist <= 10.0) {
      const isVerified =
        rep.status === 'VERIFIED' ||
        rep.status === 'COMMUNITY_CONFIRMED' ||
        rep.authorityVerification?.status === 'VERIFIED';

      const isBlockage =
        rep.reportType === 'BLOCKED_ROAD' ||
        rep.reportType === 'DAMAGED_ROAD' ||
        rep.description.toLowerCase().includes('block') ||
        rep.description.toLowerCase().includes('submerged');

      const hasEvidence = !!(rep.evidence && rep.evidence.length > 0);

      if (isVerified) verifiedCount++;
      if (isBlockage) blockedRoadCount++;
      if (hasEvidence) evidenceBackedCount++;

      const cat = String(rep.hazardType || rep.reportType || 'GENERAL');
      categories[cat] = (categories[cat] || 0) + 1;

      nearbyReports.push({
        id: rep.id,
        title: rep.title,
        hazardType: cat,
        severity: rep.severity,
        status: rep.status,
        isVerified,
        hasEvidence,
        distanceKm: dist,
        createdAt: rep.createdAt,
      });
    }
  }

  return {
    totalReports: nearbyReports.length,
    verifiedCount,
    blockedRoadCount,
    evidenceBackedCount,
    categories,
    reports: nearbyReports.slice(0, 6),
  };
}

// ── 5. Shelter & Resource Emergency Context ─────────────────────────────────

export function analyzeEmergencyContext(
  destinationCoords: LngLat,
  routeCoords: LngLat[]
): JourneyEmergencyContext {
  let totalCap = 0;
  let totalOcc = 0;
  let nearbyCount = 0;
  let nearestShelterName: string | undefined;
  let nearestDist = Infinity;

  for (const sh of demoShelters) {
    const dRoute = minDistanceToPolylineKm(sh.coordinates, routeCoords);
    const dDest = haversineDistanceKm(sh.coordinates, destinationCoords);
    const d = Math.min(dRoute, dDest);

    if (d <= 12.0) {
      nearbyCount++;
      totalCap += sh.capacity;
      totalOcc += sh.occupancy;
      if (d < nearestDist) {
        nearestDist = d;
        nearestShelterName = sh.name;
      }
    }
  }

  if (nearbyCount === 0 && demoShelters.length > 0) {
    const closest = demoShelters[0];
    nearestShelterName = closest.name;
    nearestDist = haversineDistanceKm(closest.coordinates, destinationCoords);
    totalCap = closest.capacity;
    totalOcc = closest.occupancy;
    nearbyCount = 1;
  }

  const availableCapacity = Math.max(0, totalCap - totalOcc);
  const projectedDemand = Math.round(totalOcc * 1.15 + 120);

  let capacityStatus: JourneyEmergencyContext['capacityStatus'] = 'Available';
  if (availableCapacity <= 0) {
    capacityStatus = 'At Capacity';
  } else if (availableCapacity < 250) {
    capacityStatus = 'Strained';
  }

  return {
    nearbySheltersCount: nearbyCount,
    availableCapacity,
    projectedDemand,
    capacityStatus,
    resourceShortage:
      availableCapacity < 200
        ? 'High shelter occupancy in corridor; standby relief camps advised.'
        : 'Emergency water, medical supplies, and shelter berths available in adjacent sector.',
    emergencySupport:
      'State Disaster Response Force (ODRAF) and NDRF standby units active on corridor.',
    nearestShelterName,
    nearestShelterDistanceKm: Math.round(nearestDist * 10) / 10,
    isInformationalOnly: true,
  };
}
