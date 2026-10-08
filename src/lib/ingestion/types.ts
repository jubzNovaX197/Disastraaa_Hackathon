/**
 * Operational Data Ingestion Architecture — Types & Contracts
 *
 * Unified interfaces for real-data streams (NASA EONET, NASA FIRMS, Open-Meteo).
 * Enforces:
 * - Freshness tracking (LIVE, RECENT, STALE, UNAVAILABLE)
 * - Source attribution & external provenance
 * - Strict PostGIS spatial coordinates [lng, lat]
 * - Deduplication keys
 */

import type { AppEnvironment } from '@/lib/env';
import type { HazardType, Severity } from '@/types';

export type FreshnessStatus = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';

/**
 * Bounding box format: [minLongitude, minLatitude, maxLongitude, maxLatitude]
 * Standard India Extent: [68.0, 6.0, 98.0, 38.0]
 */
export type BoundingBox = [number, number, number, number];

export const INDIA_BBOX: BoundingBox = [68.0, 6.0, 98.0, 38.0];

export interface IngestedHazardEvent {
  id: string; // Internal unique ID (e.g., eonet-25063, firms-viirs-...)
  externalId: string; // Upstream source ID
  title: string;
  description: string;
  hazardType: HazardType;
  severity: Severity;
  status: 'ACTIVE' | 'WATCH' | 'WARNING' | 'RECEDING' | 'DISSIPATED';
  coordinates: [number, number]; // [lng, lat]
  state?: string;
  district?: string;
  locationName: string;
  source: string; // e.g. "NASA EONET (NOAA/JTWC)", "NASA FIRMS (VIIRS NRT)"
  sourceUrl?: string;
  startedAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  expiresAt?: string;
  isActive: boolean;
  geometryType: 'Point' | 'Polygon' | 'MultiPolygon';
  geometry?: any;
  metadata?: Record<string, any>;
  freshness: FreshnessStatus;
  environment: AppEnvironment;
  rawPayloadSnapshotKey?: string; // Reference to Object Storage
}

export interface IngestionResult {
  source: string;
  timestamp: string;
  durationMs: number;
  totalFetched: number;
  newEventsCount: number;
  updatedEventsCount: number;
  persistedCount: number;
  freshness: FreshnessStatus;
  archiveStorageKey?: string;
  error?: string;
}

export interface IngestionFilterOptions {
  bbox?: BoundingBox;
  daysBack?: number;
  limit?: number;
  environment?: AppEnvironment;
  forceRefresh?: boolean;
}
