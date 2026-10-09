/**
 * Geospatial OSM Data Validation
 *
 * Validates raw OSM Overpass objects before normalization and persistence.
 * Rejects corrupt geometries, degenerate polylines, and out-of-bounds coordinates.
 */

import type { OverpassElement } from './types';

export const ACCEPTED_ROAD_CLASSES = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
  'unclassified',
  'residential',
]);

/**
 * Calculates Great-Circle distance (Haversine formula) in kilometers between two coordinates.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates total polyline length in kilometers.
 */
export function polylineLengthKm(coordinates: Array<[number, number]>): number {
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    total += haversineDistanceKm(lat1, lon1, lat2, lon2);
  }
  return total;
}

export interface ValidatedRoadWay {
  id: number;
  highwayClass: string;
  name: string;
  ref?: string;
  geometry: Array<[number, number]>; // [[lon, lat], ...]
  lengthKm: number;
  tags: Record<string, string>;
  timestamp: string;
}

export interface ValidatedShelterElement {
  id: number;
  name: string;
  coordinates: [number, number]; // [lon, lat]
  tags: Record<string, string>;
  isOfficialGov: boolean;
  operator?: string;
  source: string;
  timestamp: string;
}

/**
 * Validates a raw OSM way representing a road segment.
 */
export function validateRoadWay(element: OverpassElement): {
  valid: boolean;
  road?: ValidatedRoadWay;
  reason?: string;
} {
  if (element.type !== 'way') {
    return { valid: false, reason: `Element type is '${element.type}', expected 'way'` };
  }

  if (!element.id || typeof element.id !== 'number' || element.id <= 0) {
    return { valid: false, reason: 'Invalid or missing element id' };
  }

  const tags = (element.tags || {}) as Record<string, string>;
  const highwayTag = tags.highway?.toLowerCase();

  if (!highwayTag || !ACCEPTED_ROAD_CLASSES.has(highwayTag)) {
    return { valid: false, reason: `Highway tag '${highwayTag}' is not an accepted road class` };
  }

  if (!element.geometry || !Array.isArray(element.geometry) || element.geometry.length < 2) {
    return { valid: false, reason: 'Missing or insufficient geometry (minimum 2 points required)' };
  }

  // Validate coordinates and remove consecutive duplicate vertices
  const cleanCoords: Array<[number, number]> = [];
  for (let i = 0; i < element.geometry.length; i++) {
    const pt = element.geometry[i];
    if (
      typeof pt.lat !== 'number' ||
      typeof pt.lon !== 'number' ||
      isNaN(pt.lat) ||
      isNaN(pt.lon) ||
      pt.lat < -90 ||
      pt.lat > 90 ||
      pt.lon < -180 ||
      pt.lon > 180
    ) {
      return { valid: false, reason: `Vertex ${i} has invalid coordinates: [${pt.lat}, ${pt.lon}]` };
    }

    if (cleanCoords.length > 0) {
      const prev = cleanCoords[cleanCoords.length - 1];
      if (Math.abs(prev[0] - pt.lon) < 1e-7 && Math.abs(prev[1] - pt.lat) < 1e-7) {
        continue; // Skip duplicate consecutive vertex
      }
    }

    cleanCoords.push([pt.lon, pt.lat]);
  }

  if (cleanCoords.length < 2) {
    return { valid: false, reason: 'Degenerate geometry: fewer than 2 distinct points' };
  }

  const lengthKm = polylineLengthKm(cleanCoords);
  if (lengthKm < 0.002) {
    return { valid: false, reason: `Segment too short (${(lengthKm * 1000).toFixed(1)}m < 2m)` };
  }

  const name =
    tags.name?.trim() ||
    tags['name:en']?.trim() ||
    (tags.ref ? `${tags.ref} Highway` : '');

  return {
    valid: true,
    road: {
      id: element.id,
      highwayClass: highwayTag,
      name,
      ref: tags.ref?.trim(),
      geometry: cleanCoords,
      lengthKm: Math.round(lengthKm * 100) / 100,
      tags,
      timestamp: element.timestamp || new Date().toISOString(),
    },
  };
}

/**
 * Validates a raw OSM shelter node or way.
 */
export function validateShelterElement(element: OverpassElement): {
  valid: boolean;
  shelter?: ValidatedShelterElement;
  reason?: string;
} {
  if (!element.id || typeof element.id !== 'number' || element.id <= 0) {
    return { valid: false, reason: 'Invalid or missing element id' };
  }

  let lat: number | undefined;
  let lon: number | undefined;

  if (element.type === 'node') {
    lat = element.lat;
    lon = element.lon;
  } else if (element.type === 'way') {
    lat = element.center?.lat;
    lon = element.center?.lon;
  }

  if (
    lat === undefined ||
    lon === undefined ||
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    isNaN(lat) ||
    isNaN(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return { valid: false, reason: 'Missing or invalid coordinates' };
  }

  const tags = (element.tags || {}) as Record<string, string>;

  // Check that element is indeed a shelter or relief assembly point
  const isShelter =
    tags.amenity === 'shelter' ||
    tags.emergency === 'assembly_point' ||
    tags.emergency === 'disaster_help_point' ||
    tags.emergency === 'shelter' ||
    tags.social_facility === 'shelter';

  if (!isShelter) {
    return { valid: false, reason: 'Element tags do not indicate shelter or emergency assembly point' };
  }

  // Provenance check: DO NOT claim official government shelter unless source or operator says so
  const operator = (tags.operator || tags['operator:en'] || '').toLowerCase();
  const isOfficialGov =
    operator.includes('government') ||
    operator.includes('odisha') ||
    operator.includes('osdma') ||
    operator.includes('ndrf') ||
    operator.includes('collector') ||
    operator.includes('municipal') ||
    operator.includes('bmc') ||
    operator.includes('cmc') ||
    (tags.source || '').toLowerCase().includes('government');

  const name =
    tags.name?.trim() ||
    tags['name:en']?.trim() ||
    (isOfficialGov ? 'Designated Relief Camp' : 'Community Emergency Assembly Point');

  return {
    valid: true,
    shelter: {
      id: element.id,
      name,
      coordinates: [lon, lat],
      tags,
      isOfficialGov,
      operator: tags.operator?.trim(),
      source: 'OPEN_STREET_MAP',
      timestamp: element.timestamp || new Date().toISOString(),
    },
  };
}
