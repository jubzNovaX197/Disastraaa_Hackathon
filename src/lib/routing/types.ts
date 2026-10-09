/**
 * Routing System — Types
 *
 * ⚠️  PROTOTYPE ROUTE INTELLIGENCE — deterministic demo only.
 * Not live traffic, not official evacuation routes.
 * Replace the engine with OSRM / GraphHopper / pgRouting when ready.
 */

import type { LngLat } from '@/data/types';
import type { Severity } from '@/types';

// ── Graph primitives ──────────────────────────────────────────────────────────

/** A named point that can act as origin, destination, or waypoint */
export interface RouteNode {
  id:          string;
  name:        string;
  coordinates: LngLat;
  /** Tag for display: shelter / hospital / junction / landmark */
  type: 'SHELTER' | 'HOSPITAL' | 'JUNCTION' | 'LANDMARK' | 'EOC';
}

/** A directed edge in the routing graph */
export interface RouteEdge {
  id:         string;
  /** Source node id */
  from:       string;
  /** Target node id */
  to:         string;
  /** Human-readable road name */
  roadName:   string;
  /** Optional road code, e.g. "NH-16" */
  roadCode?:  string;
  /** Physical distance in km */
  distanceKm: number;
  /** Road type (drives base speed) */
  roadType:   'HIGHWAY' | 'MAJOR_ROAD' | 'DISTRICT_ROAD' | 'LOCAL_ROAD' | 'VILLAGE_ROAD';
  /** Current operational status */
  status:     'OPEN' | 'CAUTION' | 'PARTIALLY_BLOCKED' | 'BLOCKED' | 'CLOSED' | 'UNKNOWN';
  /** Pre-computed travel risk score 0–100 from road engine */
  riskScore:  number;
  /** Reference to a demoRoadSegments id (if any) */
  roadSegmentId?: string;
  /** [lng, lat] polyline used for map display */
  coordinates: LngLat[];
}

// ── Route request + options ───────────────────────────────────────────────────

export type RouteMode = 'SHORTEST' | 'SAFEST' | 'ALTERNATIVE';

export interface RouteRequest {
  originNodeId:      string;
  destinationNodeId: string;
}

// ── Route segment (one edge in a computed route) ──────────────────────────────

export interface RouteSegment {
  edgeId:           string;
  roadName:         string;
  roadCode?:        string;
  distanceKm:       number;
  /** Base speed km/h (road type + status adjusted) */
  effectiveSpeedKmh: number;
  /** Minutes for this segment */
  travelMinutes:    number;
  status:           RouteEdge['status'];
  riskScore:        number;
  riskSeverity:     Severity;
  /** True when completely blocked — should not appear in SAFEST route */
  isBlocked:        boolean;
  hazardNote?:      string;
  coordinates:      LngLat[];
}

// ── Computed route ────────────────────────────────────────────────────────────

export interface RouteResult {
  mode:           RouteMode;
  /** Ordered list of node ids from origin to destination */
  nodePath:       string[];
  segments:       RouteSegment[];
  totalDistanceKm:   number;
  totalMinutes:      number;
  /** Aggregate risk 0–100 */
  riskScore:      number;
  riskSeverity:   Severity;
  /** Summary explanation of key risks on this route */
  riskExplanation: string;
  /** Number of blocked roads this route avoids (SAFEST vs SHORTEST delta) */
  blockedAvoided: number;
  /** Notable hazards encountered */
  hazardsEncountered: string[];
  /** Safety / planning summary sentence */
  summary: string;
  /** Edge coordinates flattened for MapLibre LineString */
  mapCoordinates: LngLat[];
  /** Was a valid route found? */
  found: boolean;
  /** Reason when found === false */
  notFoundReason?: string;
}

// ── Route comparison output ───────────────────────────────────────────────────

export interface RouteComparison {
  shortest:     RouteResult;
  safest:       RouteResult;
  alternative:  RouteResult;
}
