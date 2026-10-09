/**
 * Historical Disaster Analysis Engine
 *
 * Pure, deterministic functions — no ML, no side-effects.
 * Replace the input dataset with real records; outputs remain identical.
 */

import type { HazardType, Severity } from '@/types';
import type {
  HistoricalDisasterEvent,
  HistoricalSummary,
  LocationHistoricalContext,
} from './types';

// ── Severity rank (higher = worse) ───────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = {
  LOW:      1,
  MODERATE: 2,
  HIGH:     3,
  CRITICAL: 4,
};

// ── Core summary calculation ──────────────────────────────────────────────────

/**
 * Compute a full HistoricalSummary from an array of events.
 * Works on any subset (all events, or a location-filtered subset).
 */
export function summariseEvents(events: HistoricalDisasterEvent[]): HistoricalSummary {
  if (events.length === 0) {
    return {
      totalEvents:            0,
      byType:                 {},
      bySeverity:             {},
      eventsPerYear:          0,
      yearRange:              [0, 0],
      mostImpactfulEvent:     null,
      mostSevereEvent:        null,
      avgAffectedPopulation:  0,
      maxAffectedPopulation:  0,
      totalBuildingsAffected: 0,
      totalRoadsAffectedKm:   0,
      totalSchoolsAffected:   0,
      totalHospitalsAffected: 0,
      dominantHazardType:     'FLOOD',
      patternNote:            'No historical records in this dataset.',
    };
  }

  // ── Type + severity tallies ──────────────────────────────────────────────
  const byType: Record<string, number>     = {};
  const bySeverity: Record<string, number> = {};
  for (const ev of events) {
    byType[ev.type]         = (byType[ev.type]         ?? 0) + 1;
    bySeverity[ev.severity] = (bySeverity[ev.severity] ?? 0) + 1;
  }

  // ── Year span ────────────────────────────────────────────────────────────
  const years        = events.map((e) => e.year);
  const minYear      = Math.min(...years);
  const maxYear      = Math.max(...years);
  const spanYears    = Math.max(maxYear - minYear, 1);
  const eventsPerYear = events.length / spanYears;

  // ── Impact extremes ──────────────────────────────────────────────────────
  let mostImpactful = events[0];
  let mostSevere    = events[0];
  for (const ev of events) {
    if (ev.affectedPopulation > mostImpactful.affectedPopulation) mostImpactful = ev;
    if (SEVERITY_RANK[ev.severity] > SEVERITY_RANK[mostSevere.severity]) mostSevere = ev;
  }

  // ── Aggregate infrastructure ─────────────────────────────────────────────
  const totalPop       = events.reduce((s, e) => s + e.affectedPopulation,  0);
  const totalBuildings = events.reduce((s, e) => s + e.buildingsAffected,   0);
  const totalRoads     = events.reduce((s, e) => s + e.roadsAffectedKm,     0);
  const totalSchools   = events.reduce((s, e) => s + e.schoolsAffected,     0);
  const totalHospitals = events.reduce((s, e) => s + e.hospitalsAffected,   0);
  const maxPop         = Math.max(...events.map((e) => e.affectedPopulation));

  // ── Dominant hazard type ─────────────────────────────────────────────────
  const dominantHazardType = (
    Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'FLOOD'
  ) as HazardType;

  // ── Pattern note ─────────────────────────────────────────────────────────
  const patternNote = buildPatternNote(events, byType, eventsPerYear, dominantHazardType);

  return {
    totalEvents:            events.length,
    byType,
    bySeverity,
    eventsPerYear:          Math.round(eventsPerYear * 10) / 10,
    yearRange:              [minYear, maxYear],
    mostImpactfulEvent:     mostImpactful,
    mostSevereEvent:        mostSevere,
    avgAffectedPopulation:  Math.round(totalPop / events.length),
    maxAffectedPopulation:  maxPop,
    totalBuildingsAffected: totalBuildings,
    totalRoadsAffectedKm:   Math.round(totalRoads * 10) / 10,
    totalSchoolsAffected:   totalSchools,
    totalHospitalsAffected: totalHospitals,
    dominantHazardType,
    patternNote,
  };
}

// ── Pattern note builder ──────────────────────────────────────────────────────

function buildPatternNote(
  events: HistoricalDisasterEvent[],
  byType: Record<string, number>,
  eventsPerYear: number,
  dominant: HazardType,
): string {
  const parts: string[] = [];

  // Frequency assessment
  if (eventsPerYear >= 1.5) {
    parts.push(`High repeat-event frequency (~${eventsPerYear.toFixed(1)}/yr in demo data).`);
  } else if (eventsPerYear >= 0.5) {
    parts.push(`Moderate event frequency (~${eventsPerYear.toFixed(1)}/yr in demo data).`);
  } else {
    parts.push(`Lower event frequency (~${eventsPerYear.toFixed(1)}/yr in demo data).`);
  }

  // Dominant hazard
  const dominantCount = byType[dominant] ?? 0;
  const typeLabel     = dominant.charAt(0) + dominant.slice(1).toLowerCase().replace('_', ' ');
  parts.push(`${typeLabel} is the dominant hazard (${dominantCount} of ${events.length} events in demo data).`);

  // Multi-hazard note
  const uniqueTypes = Object.keys(byType).length;
  if (uniqueTypes > 1) {
    parts.push(`${uniqueTypes} distinct hazard types recorded — multi-hazard exposure indicated.`);
  }

  // Recency note
  const recent = events.filter((e) => e.year >= 2015).length;
  if (recent > 0) {
    parts.push(`${recent} event${recent > 1 ? 's' : ''} recorded since 2015.`);
  }

  return parts.join(' ');
}

// ── Location-based lookup ─────────────────────────────────────────────────────

/**
 * Returns a LocationHistoricalContext for a given region code.
 * Matches events where regionCode starts with or equals the query code
 * (supports both exact district match and broader state-level matches).
 */
export function getLocationHistory(
  allEvents: HistoricalDisasterEvent[],
  regionCode: string,
  regionName: string,
): LocationHistoricalContext {
  // Match on prefix so 'OD-PURI' matches 'OD-PURI-SADAR' and 'OD-PURI'
  const matched = allEvents.filter(
    (e) =>
      e.regionCode === regionCode ||
      e.regionCode.startsWith(regionCode) ||
      regionCode.startsWith(e.regionCode),
  );

  const summary = summariseEvents(matched);

  const riskContextNote = buildRiskContextNote(matched, summary);

  return { regionCode, regionName, events: matched, summary, riskContextNote };
}

// ── Risk context note ─────────────────────────────────────────────────────────

function buildRiskContextNote(
  events: HistoricalDisasterEvent[],
  summary: HistoricalSummary,
): string {
  if (events.length === 0) {
    return 'No historical events matched this location in the demo dataset. This does not imply absence of risk — data coverage may be incomplete.';
  }

  const lines: string[] = [];

  const critOrHigh = events.filter(
    (e) => e.severity === 'CRITICAL' || e.severity === 'HIGH',
  ).length;

  if (critOrHigh > 0) {
    lines.push(
      `${critOrHigh} HIGH/CRITICAL severity event${critOrHigh > 1 ? 's' : ''} on record for this area supports the elevated current risk score.`,
    );
  }

  if (summary.eventsPerYear >= 1) {
    lines.push(
      'Repeat event frequency suggests persistent structural vulnerability rather than isolated incidents.',
    );
  }

  lines.push(
    '⚠️ Demo data only — not a verified government record. Use alongside official assessments.',
  );

  return lines.join(' ');
}

// ── Dataset-level utilities ───────────────────────────────────────────────────

/** Return events sorted by year descending (most recent first) */
export function sortByRecent(
  events: HistoricalDisasterEvent[],
): HistoricalDisasterEvent[] {
  return [...events].sort((a, b) => b.year - a.year);
}

/** Return events filtered to a specific hazard type */
export function filterByType(
  events: HistoricalDisasterEvent[],
  type: HazardType,
): HistoricalDisasterEvent[] {
  return events.filter((e) => e.type === type);
}

/** Return events sorted by affected population descending */
export function sortByImpact(
  events: HistoricalDisasterEvent[],
): HistoricalDisasterEvent[] {
  return [...events].sort((a, b) => b.affectedPopulation - a.affectedPopulation);
}
