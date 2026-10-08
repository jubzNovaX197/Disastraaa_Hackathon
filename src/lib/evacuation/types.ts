/**
 * Evacuation Management — Types
 *
 * Architecture is future-ready for real GIS integration, PostGIS queries,
 * and authoritative government evacuation data.
 */

import type { HazardType, Severity } from '@/types';

// ── Evacuation status lifecycle ───────────────────────────────────────────────

export const EVACUATION_STATUS = {
  MONITORING:           'MONITORING',
  PREPARE:              'PREPARE',
  EVACUATION_ADVISED:   'EVACUATION_ADVISED',
  EVACUATION_ACTIVE:    'EVACUATION_ACTIVE',
  EVACUATION_COMPLETED: 'EVACUATION_COMPLETED',
} as const;

export type EvacuationStatus = (typeof EVACUATION_STATUS)[keyof typeof EVACUATION_STATUS];

// ── Route / shelter sub-types ─────────────────────────────────────────────────

export type RouteStatus    = 'CLEAR' | 'CAUTION' | 'BLOCKED' | 'UNKNOWN';
export type ShelterPressure = 'AVAILABLE' | 'FILLING' | 'NEAR_CAPACITY' | 'OVER_CAPACITY' | 'UNAVAILABLE';

export interface EvacuationRoute {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
  estimatedMinutes: number;
  status: RouteStatus;
  isPrimary: boolean;
  blockedSegments: string[];
  via: string[];
}

export interface ShelterAssignment {
  shelterId: string;
  shelterName: string;
  capacity: number;
  occupancy: number;
  allocatedSlots: number;
  distanceKm: number;
  pressure: ShelterPressure;
  hasMedical: boolean;
  hasFood: boolean;
  hasPower: boolean;
  accessible: boolean;
}

// ── Core evacuation zone model ────────────────────────────────────────────────

export interface EvacuationZone {
  id: string;
  name: string;
  regionName: string;
  regionCode: string;
  coordinates: [number, number];
  hazardType: HazardType;
  riskLevel: Severity;
  riskScore: number;
  evacuationStatus: EvacuationStatus;
  priority: 1 | 2 | 3 | 4;
  priorityLabel: string;
  priorityReason: string;
  estimatedPopulation: number;
  evacuationRequired: number;
  evacuated: number;
  assignedShelters: ShelterAssignment[];
  totalAllocatedCapacity: number;
  capacityGap: number;
  routes: EvacuationRoute[];
  activeAlertIds: string[];
  relatedIncidentId?: string;
  resourceNote: string;
  source: 'SIMULATED' | 'PREDICTED' | 'FIELD_REPORTED';
  createdAt: string;
  updatedAt: string;
}

// ── Aggregated dashboard summary ──────────────────────────────────────────────

export interface EvacuationSummary {
  totalZones: number;
  activeZones: number;
  advisoryZones: number;
  completedZones: number;
  totalPopulationAtRisk: number;
  totalEvacuationRequired: number;
  totalEvacuated: number;
  totalRemaining: number;
  progressPct: number;
  totalAllocatedCapacity: number;
  totalCapacityGap: number;
  sheltersUnderPressure: number;
  blockedPrimaryRoutes: number;
}
