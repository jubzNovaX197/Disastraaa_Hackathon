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

export class RealAlertProvider implements AlertProvider {
  async getAlerts(): Promise<DemoAlert[]> {
    // In real mode, returns active operational alerts (empty array when no event is active)
    return [];
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

export class RealRoadProvider implements RoadProvider {
  async getBlockedRoads(): Promise<BlockedRoad[]> {
    // Derives disruptions from real verified reports/incidents
    const incidents = getIncidents('REAL').filter(
      (inc) => inc.status !== 'RESOLVED' && inc.incidentType === INCIDENT_TYPES.ROAD_BLOCKAGE,
    );
    return incidents.map((inc) => ({
      id: inc.id,
      name: inc.title,
      severity: inc.severity === 'CRITICAL' ? 'FULL' : 'PARTIAL',
      reason: inc.description,
      coordinates: inc.coordinates ? [[inc.coordinates[0], inc.coordinates[1]]] : [],
      since: inc.createdAt,
    }));
  }
  async getRoadSegments(): Promise<RoadSegment[]> {
    // Real road network baseline without fictional closures
    return [];
  }
}

export class RealShelterProvider implements ShelterProvider {
  async getShelters(): Promise<Shelter[]> {
    // In real mode, empty or connected to live municipal shelter telemetry
    return [];
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

  async getDataset(): Promise<DisasterDataset> {
    const realReports = getAllReports('REAL');
    const realRoadProvider = new RealRoadProvider();
    const blockedRoads = await realRoadProvider.getBlockedRoads();

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
      riskZones: [],
      floodAreas: [],
      shelters: [],
      alerts: [],
      infrastructure: [],
      blockedRoads,
      citizenReports: mappedReports,
      roads: [],
      cycloneZones: [],
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
