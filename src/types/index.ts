export * from './roles';

// ── Hazard types ──────────────────────────────────────────────────────────────

export const HAZARD_TYPES = {
  FLOOD:       'FLOOD',
  CYCLONE:     'CYCLONE',
  HEATWAVE:    'HEATWAVE',
  LIGHTNING:   'LIGHTNING',
  LANDSLIDE:   'LANDSLIDE',
  DROUGHT:     'DROUGHT',
  STORM_SURGE: 'STORM_SURGE',
} as const;

export type HazardType = (typeof HAZARD_TYPES)[keyof typeof HAZARD_TYPES];

// ── Severity ──────────────────────────────────────────────────────────────────

export const SEVERITY = {
  LOW:      'LOW',
  MODERATE: 'MODERATE',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

// ── Geographic region ─────────────────────────────────────────────────────────

export interface Region {
  code: string;
  name: string;
  level: 'STATE' | 'DISTRICT' | 'BLOCK' | 'VILLAGE';
  parentCode?: string;
  /** Representative point [lng, lat] */
  coordinates?: [number, number];
  /** Bounding box [minLng, minLat, maxLng, maxLat] */
  bbox?: [number, number, number, number];
}

// ── Hazard event ──────────────────────────────────────────────────────────────

export interface HazardEvent {
  id: string;
  type: HazardType;
  severity: Severity;
  title: string;
  description?: string;
  regionCode: string;
  regionName: string;
  startedAt: string; // ISO-8601
  updatedAt: string;
  isActive: boolean;
  affectedPopulation?: number;
  coordinates?: [number, number];
  geojson?: GeoJSON.Feature;
}

// ── Alert ─────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  type: HazardType;
  severity: Severity;
  title: string;
  message: string;
  issuedAt: string;
  expiresAt?: string;
  regionCode: string;
  regionName: string;
  isActive: boolean;
}

// ── Citizen report ────────────────────────────────────────────────────────────

export type ReportStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'COMMUNITY_CONFIRMED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ESCALATED';

export interface CitizenReport {
  id: string;
  type: HazardType;
  title: string;
  description: string;
  /** [lng, lat] */
  coordinates: [number, number];
  address?: string;
  status: ReportStatus;
  createdAt: string;
  confirmCount: number;
}
