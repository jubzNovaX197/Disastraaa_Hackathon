/**
 * NASA EONET Normalizer
 *
 * Transforms raw EONET JSON into strongly typed IngestedHazardEvent models.
 * Maps NASA categories and magnitudes into Disastraaa canonical types and severities.
 */

import type { EonetEventRaw, EonetGeometry } from '../clients/eonetClient';
import type { IngestedHazardEvent } from '../types';
import type { HazardType, Severity } from '@/types';
import { evaluateFreshness } from '../freshness';

function mapEonetCategoryToHazardType(categoryId: string): HazardType {
  const normalized = categoryId.toLowerCase();
  if (normalized.includes('storm')) return 'CYCLONE';
  if (normalized.includes('flood')) return 'FLOOD';
  if (normalized.includes('landslide')) return 'LANDSLIDE';
  if (normalized.includes('drought')) return 'DROUGHT';
  if (normalized.includes('fire') || normalized.includes('heat') || normalized.includes('temperature')) return 'HEATWAVE';
  return 'CYCLONE';
}

function deriveSeverity(hazardType: HazardType, geom?: EonetGeometry, isOpen: boolean = true): Severity {
  if (!isOpen) return 'LOW';

  if (hazardType === 'CYCLONE' && geom?.magnitudeValue) {
    const kts = geom.magnitudeValue;
    if (kts >= 64) return 'CRITICAL'; // Category 1+ hurricane / severe cyclonic storm
    if (kts >= 48) return 'HIGH';     // Cyclonic storm
    if (kts >= 30) return 'MODERATE'; // Deep depression
    return 'LOW';
  }

  // General default based on active status
  return isOpen ? 'HIGH' : 'LOW';
}

export function normalizeEonetEvent(
  raw: EonetEventRaw,
  archiveStorageKey?: string,
): IngestedHazardEvent | null {
  if (!raw.geometry || raw.geometry.length === 0) return null;

  // Latest geometry point
  const latestGeom = raw.geometry[raw.geometry.length - 1];
  if (!latestGeom || !Array.isArray(latestGeom.coordinates)) return null;

  // Ensure coordinates are [lng, lat] numbers
  let lon = 0;
  let lat = 0;
  if (typeof latestGeom.coordinates[0] === 'number') {
    lon = latestGeom.coordinates[0];
    lat = latestGeom.coordinates[1];
  } else if (Array.isArray(latestGeom.coordinates[0])) {
    const pt = latestGeom.coordinates[0] as number[];
    lon = pt[0];
    lat = pt[1];
  }

  if (isNaN(lon) || isNaN(lat)) return null;

  const category = raw.categories[0]?.id || 'severeStorms';
  const hazardType = mapEonetCategoryToHazardType(category);
  const isOpen = !raw.closed;
  const severity = deriveSeverity(hazardType, latestGeom, isOpen);

  const primarySource = raw.sources[0]?.id || 'NASA EONET';
  const sourceUrl = raw.sources[0]?.url || raw.link;

  const startedAt = raw.geometry[0]?.date || new Date().toISOString();
  const updatedAt = latestGeom.date || startedAt;
  const freshness = evaluateFreshness(updatedAt);

  // Status mapping
  const status = !isOpen
    ? 'DISSIPATED'
    : severity === 'CRITICAL'
    ? 'PEAK'
    : 'ACTIVE';

  return {
    id: `eonet-${raw.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`,
    externalId: raw.id,
    title: raw.title,
    description: raw.description || `NASA Earth Observatory tracked ${hazardType.toLowerCase()} event (${primarySource}).`,
    hazardType,
    severity,
    status,
    coordinates: [lon, lat],
    locationName: raw.title,
    source: `NASA EONET (${primarySource})`,
    sourceUrl,
    startedAt,
    updatedAt,
    isActive: isOpen,
    geometryType: latestGeom.type || 'Point',
    geometry: {
      type: latestGeom.type || 'Point',
      coordinates: [lon, lat],
    },
    metadata: {
      categoryId: category,
      categoryTitle: raw.categories[0]?.title,
      magnitudeValue: latestGeom.magnitudeValue,
      magnitudeUnit: latestGeom.magnitudeUnit,
      geometryCount: raw.geometry.length,
      allSources: raw.sources,
    },
    freshness,
    environment: 'REAL',
    rawPayloadSnapshotKey: archiveStorageKey,
  };
}

export function normalizeEonetResponse(
  rawEvents: EonetEventRaw[],
  archiveStorageKey?: string,
): IngestedHazardEvent[] {
  const result: IngestedHazardEvent[] = [];
  for (const raw of rawEvents) {
    const item = normalizeEonetEvent(raw, archiveStorageKey);
    if (item) {
      result.push(item);
    }
  }
  return result;
}
