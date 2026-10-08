/**
 * Road Intelligence & Blocked Road Management — Types
 *
 * ⚠️  PROTOTYPE / DEMO MODEL
 * Deterministic road network status, disaster travel risk, and citizen report correlation.
 * Prepares clean architecture for future routing engines (OSRM, GraphHopper).
 */

import type { Severity } from '@/types';
import type { LngLat } from '@/data/types';

// ── Road Classification ──────────────────────────────────────────────────────

export const ROAD_TYPES = {
  HIGHWAY:       'HIGHWAY',       // National / State Expressway / Arterial
  MAJOR_ROAD:    'MAJOR_ROAD',    // State Highway / Key Trunk Corridor
  DISTRICT_ROAD: 'DISTRICT_ROAD', // Inter-district connecting routes
  LOCAL_ROAD:    'LOCAL_ROAD',    // Municipal / Urban Streets
  VILLAGE_ROAD:  'VILLAGE_ROAD',  // Rural Roads / Embankment Bunds
} as const;

export type RoadType = (typeof ROAD_TYPES)[keyof typeof ROAD_TYPES];

// ── Operational Road Status ──────────────────────────────────────────────────

export const ROAD_STATUSES = {
  OPEN:              'OPEN',              // Passable, normal driving conditions
  CAUTION:           'CAUTION',           // Active weather/hazard alert; drive with high caution
  PARTIALLY_BLOCKED: 'PARTIALLY_BLOCKED', // One lane passable; severe bottleneck
  BLOCKED:           'BLOCKED',           // Impassable due to debris/flood/collapse
  CLOSED:            'CLOSED',            // Off-limits by order of Disaster Management Authority
  UNKNOWN:           'UNKNOWN',           // Condition unconfirmed
} as const;

export type RoadStatus = (typeof ROAD_STATUSES)[keyof typeof ROAD_STATUSES];

// ── Road Blockage Types ──────────────────────────────────────────────────────

export const ROAD_BLOCKAGE_TYPES = {
  FLOODING:              'FLOODING',              // Deep standing or flowing water
  DEBRIS:                'DEBRIS',                // Uprooted trees, power lines, structural rubble
  LANDSLIDE:             'LANDSLIDE',             // Rockfall, mudflow on slopes
  COLLAPSED_ROAD:        'COLLAPSED_ROAD',        // Culvert or bridge washed away, roadbed collapse
  WATERLOGGING:          'WATERLOGGING',          // Urban underpass or shallow inundation
  CYCLONE_DAMAGE:        'CYCLONE_DAMAGE',        // Wind-swept destruction / transformer collapse
  ACCIDENT:              'ACCIDENT',              // Multi-vehicle crash / halted heavy transports
  INFRASTRUCTURE_DAMAGE: 'INFRASTRUCTURE_DAMAGE', // Cracked bridge pier or damaged barrier
  UNKNOWN:               'UNKNOWN',               // General obstruction
} as const;

export type RoadBlockageType = (typeof ROAD_BLOCKAGE_TYPES)[keyof typeof ROAD_BLOCKAGE_TYPES];

// ── Travel Risk Assessment ───────────────────────────────────────────────────

export interface RoadTravelRisk {
  /** Composite travel risk score (0–100) */
  score: number;
  /** Risk classification matching Disastraaa thresholds */
  severity: Severity;
  /** Key factors elevating road danger */
  factors: string[];
  /** Concise plain-language advisory explanation */
  explanation: string;
  /** Plain-language public travel guidance */
  travelAdvice: string;
  /** Binary flag for quick public decision support */
  safeToTravel: boolean;
}

// ── Hazard & Proximity Exposure ──────────────────────────────────────────────

export interface RoadHazardExposure {
  primaryHazard: 'FLOOD' | 'CYCLONE' | 'LANDSLIDE' | 'NONE';
  riskZoneName?: string;
  riskScore?: number;
  alertTitle?: string;
  alertSeverity?: Severity;
  distanceKm?: number;
}

// ── Authority Verification Record ────────────────────────────────────────────

export interface RoadAuthorityVerification {
  isVerified: boolean;
  status: 'UNVERIFIED' | 'VERIFIED' | 'DISPUTED' | 'OVERRIDDEN_OPEN' | 'OVERRIDDEN_CLOSED';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  actionTaken?: string;
}

// ── Master Road Segment Model ────────────────────────────────────────────────

export interface RoadSegment {
  id: string;
  name: string;
  code?: string; // e.g. "NH-16", "SH-39", "OD-RD-04"
  roadType: RoadType;
  administrativeArea: string; // District / Sub-division / State
  /** Coordinates of the polyline [[lng, lat], [lng, lat], ...] */
  coordinates: LngLat[];
  status: RoadStatus;
  blockageType: RoadBlockageType;
  severity: Severity;
  isVerified: boolean;
  source: 'CITIZEN_REPORT' | 'FIELD_PATROL' | 'TRAFFIC_CONTROL' | 'GOVERNMENT_DISPATCH' | 'PREDICTIVE_RISK';
  lastUpdated: string; // ISO-8601
  relatedReportIds: string[]; // Linked citizen reports (cr-001, etc.)
  hazardExposure: RoadHazardExposure;
  travelRisk: RoadTravelRisk;
  authorityVerification: RoadAuthorityVerification;
  alternateRoute?: string;
  estimatedDelayMinutes?: number;
  lengthKm?: number;
  connectsShelters?: string[];  // Shelter IDs accessible/affected by this road
  connectsHospitals?: string[]; // Critical medical centers serviced by this road
}

// ── Future Routing Architecture Placeholder ──────────────────────────────────

/**
 * Architecture contract for future GraphHopper / OSRM / pgRouting engine.
 * DO NOT implement routing calculations in Task 12.
 */
export interface FutureRoutingSegment {
  segmentId: string;
  lengthMeters: number;
  passable: boolean;
  penaltyMultiplier: number; // 1.0 = normal, 2.5 = caution, Infinity = blocked
  allowedVehicleTypes: ('ALL' | 'FOUR_BY_FOUR_ONLY' | 'EMERGENCY_ONLY' | 'NONE')[];
  sourceNodeId: string;
  targetNodeId: string;
}
