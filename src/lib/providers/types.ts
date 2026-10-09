/**
 * Data Provider Contracts
 *
 * Defines common interfaces for domain-level data providers.
 * Both REAL and DEMO environments satisfy these exact contracts.
 * Intelligence engines and UI components depend ONLY on these abstractions.
 */

import type {
  BlockedRoad,
  CycloneTrack,
  DemoAlert,
  DemoCitizenReport,
  DisasterDataset,
  FloodArea,
  RiskZone,
  Shelter
} from '@/data/types';
import type { AppEnvironment } from '@/lib/env';
import type { Incident } from '@/lib/incidents/types';
import type { CitizenReportItem } from '@/lib/reports/types';
import type { RoadSegment } from '@/lib/roads/types';

export interface DataProvenance {
  source: string;
  sourceType: 'LIVE_OPERATIONAL' | 'SIMULATION';
  lastUpdated: string;
  confidence?: number;
  provider?: string;
  dataQuality?: 'VERIFIED' | 'PRELIMINARY' | 'SIMULATED';
}

export interface AlertProvider {
  getAlerts(): Promise<DemoAlert[]>;
}

export interface HazardProvider {
  getRiskZones(): Promise<RiskZone[]>;
  getFloodAreas(): Promise<FloodArea[]>;
  getCycloneZones(): Promise<RiskZone[]>;
  getCycloneTrack(): Promise<CycloneTrack | null>;
}

export interface RoadProvider {
  getBlockedRoads(): Promise<BlockedRoad[]>;
  getRoadSegments(): Promise<RoadSegment[]>;
}

export interface ShelterProvider {
  getShelters(): Promise<Shelter[]>;
}

export interface ReportProvider {
  getReports(): Promise<CitizenReportItem[] | DemoCitizenReport[]>;
}

export interface IncidentProvider {
  getIncidents(): Promise<Incident[]>;
}

import type { NormalizedWeather } from '@/lib/weather/types';

export interface WeatherProvider {
  getWeather(lat: number, lon: number, locationName?: string): Promise<NormalizedWeather | null>;
  getRegionalWeather(state?: string, district?: string): Promise<NormalizedWeather[]>;
}

export interface DisasterDataProvider {
  readonly environment: AppEnvironment;
  readonly sourceLabel: string;
  readonly isLive: boolean;
  getDataset(): Promise<DisasterDataset>;
  getProvenance(): DataProvenance;
}
