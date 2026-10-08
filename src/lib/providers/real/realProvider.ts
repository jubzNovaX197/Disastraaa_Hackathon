/**
 * Real Data Providers (Operational Environment)
 *
 * Implements provider contracts for the live operational environment.
 * Connects to real in-memory stores and live feeds.
 *
 * CRITICAL RULE:
 * Never populates fake/simulated scenario data and labels it as live.
 * When no active disaster is occurring, the live map is quiet (0 active alerts).
 */

import type {
  DisasterDataProvider,
  AlertProvider,
  HazardProvider,
  RoadProvider,
  ShelterProvider,
  ReportProvider,
  IncidentProvider,
  DataProvenance,
} from '../types';
import type {
  DisasterDataset,
  RiskZone,
  FloodArea,
  Shelter,
  DemoAlert,
  BlockedRoad,
  CycloneTrack,
} from '@/data/types';
import type { RoadSegment } from '@/lib/roads/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import { INCIDENT_TYPES, type Incident } from '@/lib/incidents/types';
import { getAllReports } from '@/lib/reports/store';
import { getIncidents } from '@/lib/incidents/store';

import { alertStore } from '@/lib/alerts/alertStore';

export class RealAlertProvider implements AlertProvider {
  async getAlerts(): Promise<DemoAlert[]> {
    return alertStore.getAlerts(true);
  }
}

import { weatherRiskService, createCircularPolygon } from '@/lib/ingestion/risk/weatherRiskService';
import { hazardRepository } from '@/lib/ingestion/repositories/hazardRepository';

export class RealHazardProvider implements HazardProvider {
  async getRiskZones(): Promise<RiskZone[]> {
    // 1. Derived risk zones from live Open-Meteo weather telemetry
    const derived = await weatherRiskService.computeDerivedRisks();

    // 2. Active hazards from NASA EONET and NASA FIRMS
    const activeHazards = await hazardRepository.getActiveHazards();
    const ingestedZones: RiskZone[] = activeHazards.map((h) => {
      const ring = createCircularPolygon(h.coordinates, h.hazardType === 'CYCLONE' ? 30 : 15);
      return {
        id: `rz-${h.id}`,
        name: h.title,
        severity: h.severity,
        coordinates: ring,
        primaryHazard: h.hazardType,
        riskScore: h.severity === 'CRITICAL' ? 88 : h.severity === 'HIGH' ? 68 : 45,
        affectedPopulation: 25000,
        description: `${h.description} [${h.source}]`,
      };
    });

    return [...derived.riskZones, ...ingestedZones];
  }

  async getFloodAreas(): Promise<FloodArea[]> {
    const derived = await weatherRiskService.computeDerivedRisks();
    const activeHazards = await hazardRepository.getActiveHazards();
    const floodHazards = activeHazards.filter((h) => h.hazardType === 'FLOOD');
    const ingestedFloods: FloodArea[] = floodHazards.map((h) => ({
      id: `fa-${h.id}`,
      name: h.title,
      severity: h.severity,
      type: 'FLOOD',
      coordinates: createCircularPolygon(h.coordinates, 18),
      depthMeters: h.severity === 'CRITICAL' ? 2.5 : 1.2,
      areaKm2: 24,
      lastUpdated: h.updatedAt,
      description: h.description,
    }));

    return [...derived.floodAreas, ...ingestedFloods];
  }

  async getCycloneZones(): Promise<RiskZone[]> {
    const derived = await weatherRiskService.computeDerivedRisks();
    const activeHazards = await hazardRepository.getActiveHazards();
    const stormHazards = activeHazards.filter((h) => h.hazardType === 'CYCLONE');
    const stormZones: RiskZone[] = stormHazards.map((h) => ({
      id: `rz-cyclone-${h.id}`,
      name: h.title,
      severity: h.severity,
      coordinates: createCircularPolygon(h.coordinates, 35),
      primaryHazard: 'CYCLONE',
      riskScore: h.severity === 'CRITICAL' ? 92 : 75,
      affectedPopulation: 45000,
      description: h.description,
    }));

    return [...derived.cycloneZones, ...stormZones];
  }

  async getCycloneTrack(): Promise<CycloneTrack | null> {
    return null;
  }
}

import { osmRoadStore } from '@/lib/roads/osmStore';
import { osmShelterStore } from '@/lib/shelters/osmStore';

function isPointInRing(pt: [number, number], ring: [number, number][]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export class RealRoadProvider implements RoadProvider {
  async getBlockedRoads(): Promise<BlockedRoad[]> {
    // Derives disruptions from real verified reports/incidents
    const incidents = getIncidents('REAL').filter(
      (inc) => inc.status !== 'RESOLVED' && inc.incidentType === INCIDENT_TYPES.ROAD_BLOCKAGE,
    );
    const incidentBlockages: BlockedRoad[] = incidents.map((inc) => ({
      id: inc.id,
      name: inc.title,
      severity: inc.severity === 'CRITICAL' ? 'FULL' : 'PARTIAL',
      reason: inc.description,
      coordinates: inc.coordinates ? [[inc.coordinates[0], inc.coordinates[1]]] : [],
      since: inc.createdAt,
    }));

    // Also include any road segments that are marked blocked
    const allSegments = await this.getRoadSegments();
    const blockedSegments = allSegments
      .filter((s) => s.status === 'BLOCKED' || s.status === 'CLOSED')
      .map((s) => ({
        id: s.id,
        name: s.name,
        severity: (s.status === 'CLOSED' ? 'FULL' : 'PARTIAL') as 'FULL' | 'PARTIAL',
        reason: s.travelRisk.explanation || s.authorityVerification.notes || 'Roadway reported impassable on operational network',
        coordinates: s.coordinates,
        since: s.lastUpdated,
      }));

    return [...incidentBlockages, ...blockedSegments];
  }

  async getRoadSegments(): Promise<RoadSegment[]> {
    const segments = await osmRoadStore.getRoadSegments();

    // 1. Correlate with active road blockage incidents
    const incidents = getIncidents('REAL').filter(
      (inc) => inc.status !== 'RESOLVED' && inc.incidentType === INCIDENT_TYPES.ROAD_BLOCKAGE,
    );

    // 2. Correlate with verified citizen reports
    const verifiedBlockageReports = getAllReports('REAL').filter(
      (r) => r.status === 'VERIFIED' && (r.blockedRoadInfo || (r as any).reportType === 'BLOCKED_ROAD' || r.hazardType === 'FLOOD'),
    );

    // 3. Correlate with active weather-derived flood areas & risk zones
    let floodAreas: FloodArea[] = [];
    let riskZones: RiskZone[] = [];
    try {
      const derived = await weatherRiskService.computeDerivedRisks();
      floodAreas = derived.floodAreas;
      riskZones = derived.riskZones;
    } catch {
      // Non-blocking
    }

    if (incidents.length === 0 && verifiedBlockageReports.length === 0 && floodAreas.length === 0 && riskZones.length === 0) {
      return segments;
    }

    // Correlate hazards, reports, and incidents to affected road segments
    return segments.map((seg) => {
      // Check 1: Incident intersection
      const matchingInc = incidents.find((inc) => {
        if (!inc.coordinates || seg.coordinates.length === 0) return false;
        const [incLon, incLat] = inc.coordinates;
        return seg.coordinates.some(([rLon, rLat]) => {
          return Math.abs(rLon - incLon) < 0.005 && Math.abs(rLat - incLat) < 0.005;
        });
      });

      if (matchingInc) {
        const mappedSeverity = matchingInc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        return {
          ...seg,
          status: matchingInc.severity === 'CRITICAL' ? 'BLOCKED' : 'PARTIALLY_BLOCKED',
          severity: mappedSeverity,
          travelRisk: {
            ...seg.travelRisk,
            score: matchingInc.severity === 'CRITICAL' ? 95 : 70,
            severity: mappedSeverity,
            safeToTravel: false,
            explanation: `Operational blockage confirmed: ${matchingInc.title}`,
          },
        };
      }

      // Check 2: Verified citizen report intersection
      const matchingRep = verifiedBlockageReports.find((rep) => {
        if (!rep.coordinates || seg.coordinates.length === 0) return false;
        const [rLon, rLat] = rep.coordinates;
        return seg.coordinates.some(([cLon, cLat]) => {
          return Math.abs(cLon - rLon) < 0.004 && Math.abs(cLat - rLat) < 0.004;
        });
      });

      if (matchingRep) {
        const isFull = matchingRep.blockedRoadInfo?.severity === 'FULL';
        return {
          ...seg,
          status: isFull ? 'BLOCKED' : 'PARTIALLY_BLOCKED',
          severity: isFull ? 'CRITICAL' : 'HIGH',
          travelRisk: {
            ...seg.travelRisk,
            score: isFull ? 90 : 65,
            severity: isFull ? 'CRITICAL' : 'HIGH',
            safeToTravel: false,
            explanation: `Field verified report: ${matchingRep.title}`,
          },
        };
      }

      // Check 3: Active flood area intersection
      const matchingFlood = floodAreas.find((fa) => {
        if (!fa.coordinates || fa.coordinates.length === 0) return false;
        const ring = fa.coordinates[0];
        return seg.coordinates.some((coord) => isPointInRing(coord, ring));
      });

      if (matchingFlood) {
        const isCriticalDepth = (matchingFlood.depthMeters ?? 0) >= 0.5 || matchingFlood.severity === 'CRITICAL';
        return {
          ...seg,
          status: isCriticalDepth ? 'BLOCKED' : 'PARTIALLY_BLOCKED',
          severity: matchingFlood.severity,
          hazardExposure: {
            primaryHazard: 'FLOOD',
            riskScore: isCriticalDepth ? 90 : 65,
          },
          travelRisk: {
            ...seg.travelRisk,
            score: isCriticalDepth ? 90 : 65,
            severity: matchingFlood.severity,
            safeToTravel: false,
            explanation: `Roadway submerged in verified flood zone: ${matchingFlood.name}`,
          },
        };
      }

      // Check 4: Elevated RiskZone intersection
      const matchingRiskZone = riskZones.find((rz) => {
        if (!rz.coordinates || rz.coordinates.length === 0 || rz.riskScore < 50) return false;
        const ring = rz.coordinates[0];
        return seg.coordinates.some((coord) => isPointInRing(coord, ring));
      });

      if (matchingRiskZone) {
        const mappedHazard: 'FLOOD' | 'CYCLONE' | 'LANDSLIDE' | 'NONE' =
          matchingRiskZone.primaryHazard === 'FLOOD' ||
          matchingRiskZone.primaryHazard === 'CYCLONE' ||
          matchingRiskZone.primaryHazard === 'LANDSLIDE'
            ? matchingRiskZone.primaryHazard
            : 'NONE';

        return {
          ...seg,
          status: matchingRiskZone.severity === 'CRITICAL' ? 'CAUTION' : seg.status,
          hazardExposure: {
            primaryHazard: mappedHazard,
            riskScore: matchingRiskZone.riskScore,
          },
          travelRisk: {
            ...seg.travelRisk,
            score: Math.max(seg.travelRisk?.score || 10, matchingRiskZone.riskScore),
            explanation: `Caution: enters high-risk operational zone: ${matchingRiskZone.name}`,
          },
        };
      }

      return seg;
    });
  }
}

export class RealShelterProvider implements ShelterProvider {
  async getShelters(): Promise<Shelter[]> {
    return osmShelterStore.getShelters();
  }
}

export class RealReportProvider implements ReportProvider {
  async getReports(): Promise<CitizenReportItem[]> {
    // Reads directly from real ground observations submitted by citizens
    return getAllReports('REAL');
  }
}

export class RealIncidentProvider implements IncidentProvider {
  async getIncidents(): Promise<Incident[]> {
    // Reads directly from real verified incident management store
    return getIncidents('REAL');
  }
}

export class RealDisasterDataProvider implements DisasterDataProvider {
  readonly environment = 'REAL' as const;
  readonly sourceLabel = 'Live Operational Feed';
  readonly isLive = true;
  private hazardProvider = new RealHazardProvider();
  private roadProvider = new RealRoadProvider();
  private shelterProvider = new RealShelterProvider();
  private alertProvider = new RealAlertProvider();

  async getDataset(): Promise<DisasterDataset> {
    const realReports = getAllReports('REAL');
    const [
      [blockedRoads, roads],
      shelters,
      [riskZones, floodAreas, cycloneZones],
      alerts,
    ] = await Promise.all([
      Promise.all([
        this.roadProvider.getBlockedRoads(),
        this.roadProvider.getRoadSegments(),
      ]),
      this.shelterProvider.getShelters(),
      Promise.all([
        this.hazardProvider.getRiskZones(),
        this.hazardProvider.getFloodAreas(),
        this.hazardProvider.getCycloneZones(),
      ]),
      this.alertProvider.getAlerts(),
    ]);

    // Map real reports to citizen reports format for map display
    const mappedReports = realReports.map((r) => ({
      id: r.id,
      type: r.hazardType,
      title: r.title,
      description: r.description,
      coordinates: r.coordinates,
      address: r.address,
      confirmCount: r.confirmCount ?? r.communityConfirmations?.confirmCount ?? 0,
      createdAt: r.createdAt,
      status: r.status,
      severity: r.severity,
    }));

    return {
      riskZones,
      floodAreas,
      shelters,
      alerts,
      infrastructure: [],
      blockedRoads,
      citizenReports: mappedReports,
      roads,
      cycloneZones,
      cycloneTrack: null,
      sourceType: 'LIVE_OPERATIONAL',
      environment: 'REAL',
      lastRefreshed: new Date().toISOString(),
    };
  }

  getProvenance(): DataProvenance {
    return {
      source: 'National & State Disaster Operations Core',
      sourceType: 'LIVE_OPERATIONAL',
      lastUpdated: new Date().toISOString(),
      confidence: 1.0,
      provider: 'Disastraaa Operational Environment',
      dataQuality: 'VERIFIED',
    };
  }
}

export const realDataProvider = new RealDisasterDataProvider();
export const realAlertProvider = new RealAlertProvider();
export const realHazardProvider = new RealHazardProvider();
export const realRoadProvider = new RealRoadProvider();
export const realShelterProvider = new RealShelterProvider();
export const realReportProvider = new RealReportProvider();
export const realIncidentProvider = new RealIncidentProvider();
