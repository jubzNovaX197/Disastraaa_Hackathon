/**
 * NASA FIRMS Normalizer
 *
 * Transforms raw satellite thermal hotspot telemetry into IngestedHazardEvent models.
 */

import type { FirmsHotspotRaw } from '../clients/firmsClient';
import type { IngestedHazardEvent } from '../types';
import type { Severity } from '@/types';
import { evaluateFreshness } from '../freshness';

function deriveFirmsSeverity(hotspot: FirmsHotspotRaw): Severity {
  if (hotspot.frp >= 60 || hotspot.confidence === 'h') return 'CRITICAL';
  if (hotspot.frp >= 25 || hotspot.confidence === 'n') return 'HIGH';
  return 'MODERATE';
}

function parseAcquisitionTimestamp(dateStr: string, timeStr: string): string {
  // dateStr: "YYYY-MM-DD", timeStr: "0430" (HHMM)
  try {
    const hh = timeStr.padStart(4, '0').slice(0, 2);
    const mm = timeStr.padStart(4, '0').slice(2, 4);
    const iso = `${dateStr}T${hh}:${mm}:00Z`;
    const dt = new Date(iso);
    return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function normalizeFirmsHotspot(
  raw: FirmsHotspotRaw,
  archiveStorageKey?: string,
): IngestedHazardEvent {
  const timestampIso = parseAcquisitionTimestamp(raw.acqDate, raw.acqTime);
  const severity = deriveFirmsSeverity(raw);
  const freshness = evaluateFreshness(timestampIso);

  const id = `firms-${raw.latitude.toFixed(3)}_${raw.longitude.toFixed(3)}_${raw.acqDate}`;

  return {
    id,
    externalId: id,
    title: `Thermal Hotspot (${raw.satellite}): FRP ${Math.round(raw.frp)} MW`,
    description: `Satellite-detected thermal signature (Brightness: ${Math.round(raw.brightness)}K, Confidence: ${raw.confidence}, FRP: ${Math.round(raw.frp)} MW).`,
    hazardType: 'HEATWAVE',
    severity,
    status: 'ACTIVE',
    coordinates: [raw.longitude, raw.latitude],
    locationName: `Thermal Hotspot [${raw.latitude.toFixed(2)}°N, ${raw.longitude.toFixed(2)}°E]`,
    source: `NASA FIRMS (${raw.satellite} NRT)`,
    sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/',
    startedAt: timestampIso,
    updatedAt: timestampIso,
    isActive: true,
    geometryType: 'Point',
    geometry: {
      type: 'Point',
      coordinates: [raw.longitude, raw.latitude],
    },
    metadata: {
      brightness: raw.brightness,
      frp: raw.frp,
      satellite: raw.satellite,
      confidence: raw.confidence,
      dayNight: raw.dayNight,
    },
    freshness,
    environment: 'REAL',
    rawPayloadSnapshotKey: archiveStorageKey,
  };
}

export function normalizeFirmsResponse(
  hotspots: FirmsHotspotRaw[],
  archiveStorageKey?: string,
): IngestedHazardEvent[] {
  return hotspots.map((h) => normalizeFirmsHotspot(h, archiveStorageKey));
}
