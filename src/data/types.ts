/**
 * Data-layer types for disaster intelligence datasets.
 *
 * These types define the shape of data consumed by map layers and UI
 * components.  Real API adapters should transform their payloads into
 * these shapes so that map/UI components never need to change.
 *
 * All geographic coordinates are [longitude, latitude] (GeoJSON order).
 */

import type { RoadSegment } from '@/lib/roads/types';
import type { HazardType, ReportStatus, Severity } from '@/types';

// ── Shared ────────────────────────────────────────────────────────────────────

export type LngLat = [number, number];

/** GeoJSON polygon ring (array of LngLat, last point === first point) */
export type PolygonRing = LngLat[];

// ── Risk Zones ────────────────────────────────────────────────────────────────

export interface RiskZone {
  id: string;
  name: string;
  severity: Severity;
  /** Outer ring of the polygon */
  coordinates: PolygonRing[];
  /** Primary hazard driving the risk score */
  primaryHazard: HazardType;
  riskScore: number; // 0–100
  affectedPopulation: number;
  description?: string;
}

// ── Flood / Hazard Areas ──────────────────────────────────────────────────────

export interface FloodArea {
  id: string;
  name: string;
  severity: Severity;
  type: HazardType;
  coordinates: PolygonRing[];
  depthMeters?: number;
  areaKm2?: number;
  lastUpdated: string; // ISO-8601
  description?: string;
}

// ── Shelters ──────────────────────────────────────────────────────────────────

export type ShelterStatus = 'OPEN' | 'FULL' | 'CLOSED' | 'PREPARING';

export interface Shelter {
  id: string;
  name: string;
  coordinates: LngLat;
  status: ShelterStatus;
  capacity: number;
  occupancy: number;
  address: string;
  contactPhone?: string;
  hasMedical: boolean;
  hasFood: boolean;
  hasPower: boolean;
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface DemoAlert {
  id: string;
  type: HazardType;
  severity: Severity;
  title: string;
  message: string;
  coordinates: LngLat;
  regionName: string;
  issuedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

// ── Infrastructure ────────────────────────────────────────────────────────────

export type InfrastructureType =
  | 'HOSPITAL'
  | 'FIRE_STATION'
  | 'POLICE_STATION'
  | 'EMERGENCY_OPERATIONS_CENTER'
  | 'HELIPAD'
  | 'WATER_SUPPLY';

export interface Infrastructure {
  id: string;
  name: string;
  type: InfrastructureType;
  coordinates: LngLat;
  address: string;
  contactPhone?: string;
  isOperational: boolean;
  /** e.g. "120 beds", "2 helicopters" */
  capacity?: string;
}

// ── Blocked Roads ─────────────────────────────────────────────────────────────

export type BlockedRoadSeverity = 'PARTIAL' | 'FULL';

export interface BlockedRoad {
  id: string;
  name: string;
  severity: BlockedRoadSeverity;
  reason: string;
  /** Array of [lng, lat] points forming the road segment */
  coordinates: LngLat[];
  since: string;
  alternateRoute?: string;
}

// ── Citizen Reports ───────────────────────────────────────────────────────────

export interface DemoCitizenReport {
  id: string;
  type: HazardType;
  title: string;
  description: string;
  coordinates: LngLat;
  address: string;
  confirmCount: number;
  createdAt: string;
  status: ReportStatus;
  severity?: Severity;
}

export interface CycloneTrack {
  id: string;
  name: string;
  coordinates: LngLat[];
  landfallPoint: LngLat;
}

// ── Aggregate dataset ─────────────────────────────────────────────────────────

/** Top-level disaster dataset consumed by the map orchestrator and dashboards */
export interface DisasterDataset {
  riskZones: RiskZone[];
  floodAreas: FloodArea[];
  shelters: Shelter[];
  alerts: DemoAlert[];
  infrastructure: Infrastructure[];
  blockedRoads: BlockedRoad[];
  citizenReports: DemoCitizenReport[];
  roads?: RoadSegment[];
  cycloneZones?: RiskZone[];
  cycloneTrack?: CycloneTrack | null;
  /** ISO-8601 timestamp of last data refresh */
  lastRefreshed: string;
  sourceType?: 'LIVE_OPERATIONAL' | 'SIMULATION';
  environment?: 'REAL' | 'DEMO';
}
