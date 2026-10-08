/**
 * Historical Disaster Analysis — Types
 *
 * Future-ready: designed to be replaced by real government datasets,
 * PostGIS queries, or external disaster-record APIs without changing
 * the analysis engine or UI components.
 */

import type { HazardType, Severity } from '@/types';

// ── Raw historical event record ───────────────────────────────────────────────

export interface HistoricalDisasterEvent {
  id: string;
  /** Disaster type */
  type: HazardType;
  /** Human-readable event name, e.g. "Cyclone Phailin (Demo)" */
  name: string;
  /** Full calendar year, e.g. 2013 */
  year: number;
  /** ISO date string if known, otherwise null */
  date: string | null;
  /** Severity classification */
  severity: Severity;
  /** State/district/region label */
  regionName: string;
  /** Region code matching existing risk zone / district codes */
  regionCode: string;
  /** Representative [lng, lat] point for map placement */
  coordinates: [number, number];
  /** Approximate population affected */
  affectedPopulation: number;
  /** Estimated buildings damaged or destroyed */
  buildingsAffected: number;
  /** Road length disrupted in km */
  roadsAffectedKm: number;
  /** Number of schools affected */
  schoolsAffected: number;
  /** Number of hospitals / health facilities affected */
  hospitalsAffected: number;
  /** Number of shelters activated or damaged */
  sheltersAffected: number;
  /** mm total rainfall during event (null if not applicable) */
  totalRainfallMm: number | null;
  /** Peak wind speed in km/h (null if not applicable) */
  peakWindKmh: number | null;
  /** Plain-language description */
  description: string;
  /**
   * Source attribution label.
   * Always clearly labelled as demo/prototype — not a real record citation.
   */
  sourceLabel: string;
}

// ── Analysis outputs ──────────────────────────────────────────────────────────

/** Aggregated summary across a set of historical events */
export interface HistoricalSummary {
  /** Total number of events in the dataset */
  totalEvents: number;
  /** Count per hazard type */
  byType: Record<string, number>;
  /** Count per severity level */
  bySeverity: Record<string, number>;
  /** Average events per year across the date range */
  eventsPerYear: number;
  /** Year span covered: [earliest, latest] */
  yearRange: [number, number];
  /** Event with the highest affected population */
  mostImpactfulEvent: HistoricalDisasterEvent | null;
  /** Event with the highest severity score */
  mostSevereEvent: HistoricalDisasterEvent | null;
  /** Average affected population per event */
  avgAffectedPopulation: number;
  /** Maximum affected population in a single event */
  maxAffectedPopulation: number;
  /** Total buildings affected across all events */
  totalBuildingsAffected: number;
  /** Total roads affected (km) across all events */
  totalRoadsAffectedKm: number;
  /** Total schools affected across all events */
  totalSchoolsAffected: number;
  /** Total hospitals affected across all events */
  totalHospitalsAffected: number;
  /** Dominant hazard type (most frequent) */
  dominantHazardType: HazardType;
  /** Human-readable pattern note */
  patternNote: string;
}

/** Result of a location-specific historical lookup */
export interface LocationHistoricalContext {
  regionCode: string;
  regionName: string;
  events: HistoricalDisasterEvent[];
  summary: HistoricalSummary;
  /** Risk context note connecting history to current risk */
  riskContextNote: string;
}
