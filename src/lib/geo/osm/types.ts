/**
 * OpenStreetMap & Overpass API Types
 *
 * Types for raw OSM responses, ingestion parameters, validation, and normalization.
 */

import type { RoadType } from '@/lib/roads/types';

export interface BoundingBox {
  south: number; // minLat
  west:  number; // minLon
  north: number; // maxLat
  east:  number; // maxLon
}

export interface OverpassElementTagMap {
  highway?: string;
  name?: string;
  'name:en'?: string;
  ref?: string;
  surface?: string;
  lanes?: string;
  maxspeed?: string;
  oneway?: string;
  bridge?: string;
  tunnel?: string;
  amenity?: string;
  emergency?: string;
  social_facility?: string;
  operator?: string;
  capacity?: string;
  'addr:street'?: string;
  'addr:city'?: string;
  'addr:district'?: string;
  'addr:state'?: string;
  [key: string]: string | undefined;
}

export interface OverpassCoordinate {
  lat: number;
  lon: number;
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: OverpassCoordinate;
  bounds?: {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
  };
  nodes?: number[];
  geometry?: OverpassCoordinate[];
  tags?: OverpassElementTagMap;
  timestamp?: string;
  version?: number;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s?: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}

export interface RoadIngestionOptions {
  bbox?: BoundingBox;
  roadClasses?: RoadType[];
  timeoutMs?: number;
  maxElements?: number;
}

export interface ShelterIngestionOptions {
  bbox?: BoundingBox;
  timeoutMs?: number;
  maxElements?: number;
}

export interface IngestionResult<T> {
  success: boolean;
  count: number;
  data: T[];
  source: string;
  endpointUsed: string;
  retrievedAt: string;
  errors?: string[];
}
