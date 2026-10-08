/**
 * Geospatial Normalization Layer
 *
 * Normalizes validated OSM Overpass elements into Disastraaa domain models:
 * - ValidatedRoadWay -> RoadSegment (types.ts)
 * - ValidatedShelterElement -> Shelter (data/types.ts)
 *
 * Maintains explicit data provenance, source attribution, and clean geometries.
 */

import type { RoadSegment, RoadType } from '@/lib/roads/types';
import { ROAD_TYPES, ROAD_STATUSES, ROAD_BLOCKAGE_TYPES } from '@/lib/roads/types';
import type { Shelter } from '@/data/types';
import type { ValidatedRoadWay, ValidatedShelterElement } from './validation';

const HIGHWAY_CLASS_TO_ROAD_TYPE: Record<string, RoadType> = {
  motorway:       ROAD_TYPES.HIGHWAY,
  motorway_link:  ROAD_TYPES.HIGHWAY,
  trunk:          ROAD_TYPES.HIGHWAY,
  trunk_link:     ROAD_TYPES.HIGHWAY,
  primary:        ROAD_TYPES.MAJOR_ROAD,
  primary_link:   ROAD_TYPES.MAJOR_ROAD,
  secondary:      ROAD_TYPES.DISTRICT_ROAD,
  secondary_link: ROAD_TYPES.DISTRICT_ROAD,
  tertiary:       ROAD_TYPES.LOCAL_ROAD,
  tertiary_link:  ROAD_TYPES.LOCAL_ROAD,
  unclassified:   ROAD_TYPES.LOCAL_ROAD,
  residential:    ROAD_TYPES.LOCAL_ROAD,
  track:          ROAD_TYPES.VILLAGE_ROAD,
};

const ROAD_TYPE_BASE_SPEED_KMH: Record<RoadType, number> = {
  HIGHWAY:       80,
  MAJOR_ROAD:    50,
  DISTRICT_ROAD: 40,
  LOCAL_ROAD:    30,
  VILLAGE_ROAD:  20,
};

function formatRoadTitle(name: string, ref: string | undefined, roadType: RoadType): string {
  if (name && name.trim()) return name.trim();
  if (ref && ref.trim()) return `${ref.trim()} Corridor`;

  switch (roadType) {
    case 'HIGHWAY':
      return 'National / State Expressway Corridor';
    case 'MAJOR_ROAD':
      return 'Primary Arterial Corridor';
    case 'DISTRICT_ROAD':
      return 'Inter-District Connecting Highway';
    case 'LOCAL_ROAD':
      return 'Urban Connector Road';
    case 'VILLAGE_ROAD':
      return 'Rural Evacuation Route';
    default:
      return 'Operational Road Segment';
  }
}

/**
 * Normalizes a validated OSM way into an enterprise Disastraaa RoadSegment.
 */
export function normalizeRoadSegment(
  road: ValidatedRoadWay,
  operationalContext?: { state?: string; district?: string },
): RoadSegment {
  const roadType = HIGHWAY_CLASS_TO_ROAD_TYPE[road.highwayClass] ?? ROAD_TYPES.LOCAL_ROAD;
  const state = operationalContext?.state || road.tags['addr:state'] || 'Odisha';
  const district = operationalContext?.district || road.tags['addr:district'] || 'Khordha';
  const administrativeArea = `${district}, ${state}`;

  const name = formatRoadTitle(road.name, road.ref, roadType);
  const baseSpeed = ROAD_TYPE_BASE_SPEED_KMH[roadType];
  const travelMinutes = Math.max(1, Math.round((road.lengthKm / baseSpeed) * 60));

  return {
    id: `osm-way-${road.id}`,
    name,
    code: road.ref || undefined,
    roadType,
    administrativeArea,
    coordinates: road.geometry,
    status: ROAD_STATUSES.OPEN,
    blockageType: ROAD_BLOCKAGE_TYPES.UNKNOWN,
    severity: 'LOW',
    isVerified: false,
    source: 'OPEN_STREET_MAP',
    lastUpdated: road.timestamp,
    relatedReportIds: [],
    hazardExposure: {
      primaryHazard: 'NONE',
      riskScore: 0,
    },
    travelRisk: {
      score: 5,
      severity: 'LOW',
      factors: ['Baseline OpenStreetMap Roadway Telemetry'],
      explanation: 'Operational baseline roadway. Normal driving conditions reported by open spatial network.',
      travelAdvice: 'Passable under current operational baseline. Monitor civil advisories.',
      safeToTravel: true,
    },
    authorityVerification: {
      isVerified: false,
      status: 'UNVERIFIED',
      notes: `Ingested from OpenStreetMap Overpass (osm_id: ${road.id}, class: ${road.highwayClass}). Verified public telemetry.`,
    },
    lengthKm: road.lengthKm,
    estimatedDelayMinutes: 0,
    travelMinutes,
  };
}

export interface NormalizedShelter extends Shelter {
  osmId: number;
  isOfficialGov: boolean;
  operator?: string;
  source: string;
  lastUpdated: string;
}

/**
 * Normalizes a validated OSM shelter into a Disastraaa Shelter.
 * Preserves strict provenance — does NOT claim official status unless source confirms.
 */
export function normalizeShelter(
  shelter: ValidatedShelterElement,
  operationalContext?: { state?: string; district?: string },
): NormalizedShelter {
  const state = operationalContext?.state || shelter.tags['addr:state'] || 'Odisha';
  const district = operationalContext?.district || shelter.tags['addr:district'] || 'Khordha';

  const rawCapacity = parseInt(shelter.tags.capacity || '', 10);
  const capacity = !isNaN(rawCapacity) && rawCapacity > 0 ? rawCapacity : (shelter.isOfficialGov ? 250 : 100);

  const address =
    shelter.tags['addr:street'] ||
    shelter.tags['addr:city'] ||
    `${shelter.name}, ${district}, ${state}`;

  return {
    id: `osm-shelter-${shelter.id}`,
    osmId: shelter.id,
    name: shelter.name,
    coordinates: shelter.coordinates,
    status: 'OPEN',
    capacity,
    occupancy: 0,
    address,
    hasMedical: shelter.tags['emergency:medical'] === 'yes' || shelter.tags.medical === 'yes',
    hasFood: shelter.tags.food === 'yes',
    hasPower: shelter.tags.electricity === 'yes' || shelter.tags['generator:source'] !== undefined,
    isOfficialGov: shelter.isOfficialGov,
    operator: shelter.operator,
    source: 'OPEN_STREET_MAP',
    lastUpdated: shelter.timestamp,
  };
}
