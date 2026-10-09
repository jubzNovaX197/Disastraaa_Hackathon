/**
 * Shared Real-Data Geographic Context & Canonical Region Registry
 *
 * Data-Driven Regional Intelligence:
 * In REAL mode, available regions/locations are NEVER hardcoded. They are
 * derived dynamically from real operational records (hazards, alerts,
 * citizen reports, incidents, road disruptions, shelters).
 *
 * When a real event arrives (e.g., Odisha -> Bargarh), that location
 * immediately becomes available in region selectors, filters, and suggestions
 * across Command Center, Situation Analytics, Response Operations, and Simulator.
 *
 * In DEMO mode, existing simulated coastal scenario regions remain active.
 */

import type { AppEnvironment } from '@/lib/env';
import { getAllReports } from '@/lib/reports/store';
import { getIncidents } from '@/lib/incidents/store';

// ── Canonical Location Data Model ──────────────────────────────────────────

export interface CanonicalLocation {
  id: string;
  country: string;
  state: string;
  district: string;
  block?: string;
  locality?: string;
  coordinates: [number, number]; // [lng, lat]
  geometry?: any;
  source: 'HAZARD' | 'REPORT' | 'INCIDENT' | 'ROAD' | 'SHELTER' | 'ALERT' | 'AUTHORITY' | 'WEATHER' | 'SIMULATION';
  environment: AppEnvironment;
  registeredAt: string;
}

export interface RegionSummary {
  id: string;
  country: string;
  state: string;
  district: string;
  displayName: string;
  coordinates?: [number, number];
  population?: number;
  populationSource?: string;
  activeHazardCount: number;
  activeAlertCount: number;
  reportCount: number;
  incidentCount: number;
  roadDisruptionCount: number;
  shelterCount: number;
  lastUpdated: string;
}

// ── Dynamic Operational Real Region Registry ────────────────────────────────

// Documented Census of India 2011 statistics for core operational demonstration sectors
export const CANONICAL_ODISHA_LOCATIONS: Array<CanonicalLocation & { population: number; populationSource: string }> = [
  {
    id: 'odisha-kalahandi',
    country: 'India',
    state: 'Odisha',
    district: 'Kalahandi District',
    coordinates: [83.1659, 19.9075],
    source: 'AUTHORITY',
    environment: 'REAL',
    registeredAt: '2026-10-09T00:00:00.000Z',
    population: 1576869,
    populationSource: 'Census of India 2011 (District Census Handbook - Kalahandi)',
  },
  {
    id: 'odisha-khordha',
    country: 'India',
    state: 'Odisha',
    district: 'Khordha District',
    locality: 'Bhubaneswar State Command Operations',
    coordinates: [85.8245, 20.2961],
    source: 'AUTHORITY',
    environment: 'REAL',
    registeredAt: '2026-10-09T00:00:00.000Z',
    population: 2251673,
    populationSource: 'Census of India 2011 (District Census Handbook - Khordha)',
  },
  {
    id: 'odisha-puri',
    country: 'India',
    state: 'Odisha',
    district: 'Puri District',
    locality: 'Puri Coastal Belt',
    coordinates: [85.8312, 19.8135],
    source: 'AUTHORITY',
    environment: 'REAL',
    registeredAt: '2026-10-09T00:00:00.000Z',
    population: 1698730,
    populationSource: 'Census of India 2011 (District Census Handbook - Puri)',
  },
  {
    id: 'odisha-cuttack',
    country: 'India',
    state: 'Odisha',
    district: 'Cuttack District',
    locality: 'Cuttack Operational Sector',
    coordinates: [85.8830, 20.4625],
    source: 'AUTHORITY',
    environment: 'REAL',
    registeredAt: '2026-10-09T00:00:00.000Z',
    population: 2624470,
    populationSource: 'Census of India 2011 (District Census Handbook - Cuttack)',
  },
];

/**
 * Finds a canonical demonstration location by district, ID, or substring.
 */
export function findCanonicalLocation(query: string) {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return CANONICAL_ODISHA_LOCATIONS.find(
    (loc) =>
      loc.district.toLowerCase().includes(q) ||
      loc.id.toLowerCase().includes(q) ||
      (loc.locality && loc.locality.toLowerCase().includes(q)) ||
      q.includes(loc.district.toLowerCase().replace(' district', '')),
  );
}

// Registry of dynamically ingested real operational locations
let _realLocationsRegistry: CanonicalLocation[] = [];

// Demo fixed scenario regions for evaluators in DEMO mode only
const DEMO_SCENARIO_REGIONS: RegionSummary[] = [
  {
    id: 'odisha-puri',
    country: 'India',
    state: 'Odisha',
    district: 'Puri District',
    displayName: 'Puri District, Odisha',
    coordinates: [85.8315, 19.8005],
    activeHazardCount: 1,
    activeAlertCount: 2,
    reportCount: 5,
    incidentCount: 2,
    roadDisruptionCount: 3,
    shelterCount: 2,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'odisha-cuttack',
    country: 'India',
    state: 'Odisha',
    district: 'Cuttack District',
    displayName: 'Cuttack District, Odisha',
    coordinates: [85.8830, 20.4812],
    activeHazardCount: 1,
    activeAlertCount: 1,
    reportCount: 4,
    incidentCount: 1,
    roadDisruptionCount: 2,
    shelterCount: 0,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'odisha-khordha',
    country: 'India',
    state: 'Odisha',
    district: 'Khurda District',
    displayName: 'Khurda District (Bhubaneswar), Odisha',
    coordinates: [85.8245, 20.2756],
    activeHazardCount: 1,
    activeAlertCount: 1,
    reportCount: 3,
    incidentCount: 1,
    roadDisruptionCount: 1,
    shelterCount: 1,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'odisha-jagatsinghpur',
    country: 'India',
    state: 'Odisha',
    district: 'Jagatsinghpur District',
    displayName: 'Jagatsinghpur (Paradip), Odisha',
    coordinates: [86.6111, 20.2644],
    activeHazardCount: 1,
    activeAlertCount: 1,
    reportCount: 2,
    incidentCount: 1,
    roadDisruptionCount: 1,
    shelterCount: 1,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'odisha-kendrapara',
    country: 'India',
    state: 'Odisha',
    district: 'Kendrapara District',
    displayName: 'Kendrapara District, Odisha',
    coordinates: [86.4214, 20.5012],
    activeHazardCount: 1,
    activeAlertCount: 1,
    reportCount: 1,
    incidentCount: 0,
    roadDisruptionCount: 1,
    shelterCount: 0,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'andhra-visakhapatnam',
    country: 'India',
    state: 'Andhra Pradesh',
    district: 'Visakhapatnam District',
    displayName: 'Visakhapatnam District, Andhra Pradesh',
    coordinates: [83.3012, 17.7231],
    activeHazardCount: 1,
    activeAlertCount: 1,
    reportCount: 1,
    incidentCount: 1,
    roadDisruptionCount: 1,
    shelterCount: 1,
    lastUpdated: new Date().toISOString(),
  },
];

// Common Indian state dictionary for robust normalization
const KNOWN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

/**
 * Normalizes text input to extract canonical state and district.
 * e.g., "Bargarh District, Odisha" -> { state: "Odisha", district: "Bargarh" }
 * e.g., "Kolkata, West Bengal" -> { state: "West Bengal", district: "Kolkata" }
 */
export function parseLocationFromText(
  text: string,
  stateHint?: string,
): { state: string; district: string; locality?: string } {
  if (!text || typeof text !== 'string') {
    return { state: stateHint || 'India', district: 'Operational Sector' };
  }

  const clean = text.trim();
  let matchedState = stateHint || '';

  // Match known state
  for (const s of KNOWN_STATES) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(clean)) {
      matchedState = s;
      break;
    }
  }

  // Extract district by parsing comma-delimited segments or "District" keywords
  const parts = clean.split(',').map((p) => p.trim());
  let districtCandidate = '';

  for (const p of parts) {
    const isState = KNOWN_STATES.some((s) => s.toLowerCase() === p.toLowerCase());
    if (!isState && p.length > 0) {
      districtCandidate = p.replace(/\s+(District|Dist|Block|Sector)$/i, '').trim();
      break;
    }
  }

  if (!districtCandidate && parts.length > 0) {
    districtCandidate = parts[0].replace(/\s+(District|Dist)$/i, '').trim();
  }

  const finalDistrict = districtCandidate ? `${districtCandidate} District` : (matchedState ? `${matchedState} Sector` : 'Operational Sector');

  return {
    state: matchedState || 'India',
    district: finalDistrict,
    locality: clean,
  };
}

/**
 * Registers a real operational location into the shared real-data registry.
 * Automatically dedupes and normalizes.
 */
export function registerRealOperationalLocation(
  loc: Partial<CanonicalLocation> & { district: string; state: string; coordinates: [number, number] },
): CanonicalLocation {
  const normState = loc.state.trim();
  const normDistrict = loc.district.trim().replace(/\s+District$/i, '') + ' District';
  const id = `${normState.toLowerCase().replace(/\s+/g, '-')}-${normDistrict.toLowerCase().replace(/[\s-]+/g, '-')}`;

  const existing = _realLocationsRegistry.find((l) => l.id === id);
  if (existing) {
    existing.coordinates = loc.coordinates;
    if (loc.locality) existing.locality = loc.locality;
    return existing;
  }

  const newLoc: CanonicalLocation = {
    id,
    country: loc.country || 'India',
    state: normState,
    district: normDistrict,
    block: loc.block,
    locality: loc.locality,
    coordinates: loc.coordinates,
    geometry: loc.geometry,
    source: loc.source || 'REPORT',
    environment: 'REAL',
    registeredAt: new Date().toISOString(),
  };

  _realLocationsRegistry.push(newLoc);
  return newLoc;
}

/**
 * Returns all active operational locations in REAL mode.
 */
export function getRealOperationalLocations(): CanonicalLocation[] {
  return [..._realLocationsRegistry];
}

/**
 * Aggregates all available regions dynamically from REAL operational records:
 * - Real citizen reports
 * - Real incident dispatches
 * - Real registered locations
 *
 * If no real operational records exist, returns an empty array.
 */
export function getAvailableRealRegions(): RegionSummary[] {
  const realReports = getAllReports('REAL');
  const realIncidents = getIncidents('REAL');

  const regionMap = new Map<string, RegionSummary>();

  // Process Real Citizen Reports
  realReports.forEach((rep) => {
    const parsed = parseLocationFromText(rep.administrativeArea || rep.address);
    const state = parsed.state;
    const district = parsed.district;
    const id = `${state.toLowerCase().replace(/\s+/g, '-')}-${district.toLowerCase().replace(/[\s-]+/g, '-')}`;

    if (!regionMap.has(id)) {
      regionMap.set(id, {
        id,
        country: 'India',
        state,
        district,
        displayName: `${district}, ${state}`,
        coordinates: rep.coordinates,
        activeHazardCount: rep.status === 'VERIFIED' ? 1 : 0,
        activeAlertCount: 0,
        reportCount: 1,
        incidentCount: 0,
        roadDisruptionCount: rep.blockedRoadInfo ? 1 : 0,
        shelterCount: 0,
        lastUpdated: rep.createdAt,
      });
    } else {
      const existing = regionMap.get(id)!;
      existing.reportCount += 1;
      if (rep.blockedRoadInfo) existing.roadDisruptionCount += 1;
      if (rep.status === 'VERIFIED') existing.activeHazardCount = Math.max(1, existing.activeHazardCount);
    }
  });

  // Process Real Incidents
  realIncidents.forEach((inc) => {
    const parsed = parseLocationFromText(inc.affectedArea || inc.locationName);
    const state = parsed.state;
    const district = parsed.district;
    const id = `${state.toLowerCase().replace(/\s+/g, '-')}-${district.toLowerCase().replace(/[\s-]+/g, '-')}`;

    if (!regionMap.has(id)) {
      regionMap.set(id, {
        id,
        country: 'India',
        state,
        district,
        displayName: `${district}, ${state}`,
        coordinates: inc.coordinates,
        activeHazardCount: 1,
        activeAlertCount: 0,
        reportCount: 0,
        incidentCount: 1,
        roadDisruptionCount: 0,
        shelterCount: 0,
        lastUpdated: inc.updatedAt || inc.createdAt,
      });
    } else {
      const existing = regionMap.get(id)!;
      existing.incidentCount += 1;
      existing.activeHazardCount = Math.max(1, existing.activeHazardCount);
    }
  });

  // Merge any explicitly registered real locations
  _realLocationsRegistry.forEach((loc) => {
    if (!regionMap.has(loc.id)) {
      const canonicalMatch = CANONICAL_ODISHA_LOCATIONS.find((c) => c.id === loc.id);
      regionMap.set(loc.id, {
        id: loc.id,
        country: loc.country,
        state: loc.state,
        district: loc.district,
        displayName: `${loc.district}, ${loc.state}`,
        coordinates: loc.coordinates,
        population: canonicalMatch?.population,
        populationSource: canonicalMatch?.populationSource,
        activeHazardCount: 0,
        activeAlertCount: 0,
        reportCount: 0,
        incidentCount: 0,
        roadDisruptionCount: 0,
        shelterCount: 0,
        lastUpdated: loc.registeredAt,
      });
    }
  });

  return Array.from(regionMap.values());
}

/**
 * Returns static canonical metadata for core demonstration sectors (Kalahandi, Khordha, Puri, Cuttack).
 * Sourced from Census of India 2011. Used by seed scripts and explicit operational benchmarks.
 */
export function getCanonicalOdishaRegions(): RegionSummary[] {
  return CANONICAL_ODISHA_LOCATIONS.map((loc) => ({
    id: loc.id,
    country: loc.country,
    state: loc.state,
    district: loc.district,
    displayName: `${loc.district}, ${loc.state}`,
    coordinates: loc.coordinates,
    population: loc.population,
    populationSource: loc.populationSource,
    activeHazardCount: 0,
    activeAlertCount: 0,
    reportCount: 0,
    incidentCount: 0,
    roadDisruptionCount: 0,
    shelterCount: 0,
    lastUpdated: loc.registeredAt,
  }));
}

/**
 * Returns available regions strictly based on active environment:
 * - REAL: Dynamically derived from real database / ingested records only (0 if none)
 * - DEMO: Returns populated scenario regions (Puri, Cuttack, Khurda, etc.)
 */
export function getAvailableRegions(env: AppEnvironment): RegionSummary[] {
  if (env === 'REAL') {
    return getAvailableRealRegions();
  }
  return DEMO_SCENARIO_REGIONS;
}

/**
 * Returns active hazard regions (those with active hazards, alerts, or verified incidents).
 */
export function getActiveRealHazardRegions(): RegionSummary[] {
  return getAvailableRealRegions().filter((r) => r.activeHazardCount > 0 || r.incidentCount > 0);
}

/**
 * Autocomplete / search suggestion helper for real regions.
 */
export function getRealRegionSuggestions(query: string, env: AppEnvironment = 'REAL'): RegionSummary[] {
  const regions = getAvailableRegions(env);
  if (!query || query.trim() === '') {
    return regions;
  }
  const q = query.toLowerCase().trim();
  return regions.filter(
    (r) =>
      r.district.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      r.displayName.toLowerCase().includes(q),
  );
}

/**
 * Testing helper: resets the in-memory real locations registry (used for test isolation).
 */
export function _resetRealLocationsRegistry(): void {
  _realLocationsRegistry = [];
}
