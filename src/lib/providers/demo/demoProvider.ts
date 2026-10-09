/**
 * Demo Data Providers (Simulation Environment)
 *
 * Implements the provider contracts using the static demo scenario dataset.
 * All records are marked sourceType = 'SIMULATION'.
 */

import { demoDataset, demoRoadSegments } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoCycloneTrack, demoCycloneZones } from '@/data/demo/cycloneZones';
import type {
  BlockedRoad,
  CycloneTrack,
  DemoAlert,
  DisasterDataset,
  FloodArea,
  RiskZone,
  Shelter,
} from '@/data/types';
import type { Incident } from '@/lib/incidents/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { RoadSegment } from '@/lib/roads/types';
import type {
  AlertProvider,
  DataProvenance,
  DisasterDataProvider,
  HazardProvider,
  IncidentProvider,
  ReportProvider,
  RoadProvider,
  ShelterProvider,
} from '../types';

export class DemoAlertProvider implements AlertProvider {
  async getAlerts(): Promise<DemoAlert[]> {
    return demoDataset.alerts;
  }
}

export class DemoHazardProvider implements HazardProvider {
  async getRiskZones(): Promise<RiskZone[]> {
    return demoDataset.riskZones;
  }
  async getFloodAreas(): Promise<FloodArea[]> {
    return demoDataset.floodAreas;
  }
  async getCycloneZones(): Promise<RiskZone[]> {
    return demoCycloneZones;
  }
  async getCycloneTrack(): Promise<CycloneTrack | null> {
    return demoCycloneTrack;
  }
}

export class DemoRoadProvider implements RoadProvider {
  async getBlockedRoads(): Promise<BlockedRoad[]> {
    return demoDataset.blockedRoads;
  }
  async getRoadSegments(): Promise<RoadSegment[]> {
    return demoRoadSegments;
  }
}

export class DemoShelterProvider implements ShelterProvider {
  async getShelters(): Promise<Shelter[]> {
    return demoDataset.shelters;
  }
}

export class DemoReportProvider implements ReportProvider {
  async getReports(): Promise<CitizenReportItem[]> {
    return demoCitizenReports;
  }
}

export class DemoIncidentProvider implements IncidentProvider {
  async getIncidents(): Promise<Incident[]> {
    // In demo mode, return any simulated incidents
    return [];
  }
}

export class DemoDisasterDataProvider implements DisasterDataProvider {
  readonly environment = 'DEMO' as const;
  readonly sourceLabel = 'Simulation / Scenario Data';
  readonly isLive = false;

  async getDataset(): Promise<DisasterDataset> {
    return {
      ...demoDataset,
      cycloneZones: demoCycloneZones,
      cycloneTrack: demoCycloneTrack,
      sourceType: 'SIMULATION',
      environment: 'DEMO',
      lastRefreshed: new Date().toISOString(),
    };
  }

  getProvenance(): DataProvenance {
    return {
      source: 'Simulated Cyclone Scenario Feed',
      sourceType: 'SIMULATION',
      lastUpdated: new Date().toISOString(),
      confidence: 1.0,
      provider: 'Disastraaa Simulation Engine',
      dataQuality: 'SIMULATED',
    };
  }
}

export const demoDataProvider = new DemoDisasterDataProvider();
export const demoAlertProvider = new DemoAlertProvider();
export const demoHazardProvider = new DemoHazardProvider();
export const demoRoadProvider = new DemoRoadProvider();
export const demoShelterProvider = new DemoShelterProvider();
export const demoReportProvider = new DemoReportProvider();
export const demoIncidentProvider = new DemoIncidentProvider();
