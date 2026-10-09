/**
 * Operational Data Ingestion Architecture — Central Facade
 *
 * Coordinates:
 * - NASA EONET v3 Ingestion & Normalization
 * - NASA FIRMS Active Fire Ingestion & Normalization
 * - Open-Meteo Weather Telemetry Ingestion & Deduplication
 * - Weather -> Risk Modeling Pipeline (Flood, Cyclone, Multi-Hazard)
 * - Object Storage Raw Archival
 */

import { eonetClient } from './clients/eonetClient';
import { firmsClient } from './clients/firmsClient';
import { normalizeEonetResponse } from './normalizers/eonetNormalizer';
import { normalizeFirmsResponse } from './normalizers/firmsNormalizer';
import { hazardRepository } from './repositories/hazardRepository';
import { weatherRiskService } from './risk/weatherRiskService';
import type { IngestionFilterOptions, IngestionResult } from './types';

export { eonetClient } from './clients/eonetClient';
export { firmsClient } from './clients/firmsClient';
export * from './freshness';
export { normalizeEonetEvent, normalizeEonetResponse } from './normalizers/eonetNormalizer';
export { normalizeFirmsHotspot, normalizeFirmsResponse } from './normalizers/firmsNormalizer';
export { hazardRepository } from './repositories/hazardRepository';
export { weatherRiskService } from './risk/weatherRiskService';
export * from './types';

export interface ComprehensiveIngestionReport {
  timestamp: string;
  eonet: IngestionResult;
  firms: IngestionResult;
  derivedWeatherRiskZonesCount: number;
  totalPersistedHazards: number;
}

/**
 * Executes a full operational sync cycle across all real data providers.
 */
export async function runOperationalIngestion(
  options: IngestionFilterOptions = {},
): Promise<ComprehensiveIngestionReport> {
  const timestamp = new Date().toISOString();

  // 1. Sync NASA EONET
  const eonetStartTime = Date.now();
  const eonetFetch = await eonetClient.fetchEvents({
    bbox: options.bbox,
    daysBack: options.daysBack ?? 45,
    limit: options.limit ?? 50,
  });

  const normalizedEonet = eonetFetch.success
    ? normalizeEonetResponse(eonetFetch.events, eonetFetch.archiveStorageKey)
    : [];

  const eonetSave = normalizedEonet.length > 0
    ? await hazardRepository.saveBatch(normalizedEonet)
    : { inserted: 0, updated: 0 };

  const eonetResult: IngestionResult = {
    source: 'NASA EONET v3',
    timestamp,
    durationMs: Date.now() - eonetStartTime,
    totalFetched: eonetFetch.events.length,
    newEventsCount: eonetSave.inserted,
    updatedEventsCount: eonetSave.updated,
    persistedCount: normalizedEonet.length,
    freshness: normalizedEonet.length > 0 ? normalizedEonet[0].freshness : 'UNAVAILABLE',
    archiveStorageKey: eonetFetch.archiveStorageKey,
    error: eonetFetch.error,
  };

  // 2. Sync NASA FIRMS
  const firmsStartTime = Date.now();
  const firmsFetch = await firmsClient.fetchHotspots({
    bbox: options.bbox,
    daysBack: 1,
    limit: 60,
  });

  const normalizedFirms = firmsFetch.success
    ? normalizeFirmsResponse(firmsFetch.hotspots, firmsFetch.archiveStorageKey)
    : [];

  const firmsSave = normalizedFirms.length > 0
    ? await hazardRepository.saveBatch(normalizedFirms)
    : { inserted: 0, updated: 0 };

  const firmsResult: IngestionResult = {
    source: 'NASA FIRMS (VIIRS/MODIS)',
    timestamp,
    durationMs: Date.now() - firmsStartTime,
    totalFetched: firmsFetch.hotspots.length,
    newEventsCount: firmsSave.inserted,
    updatedEventsCount: firmsSave.updated,
    persistedCount: normalizedFirms.length,
    freshness: normalizedFirms.length > 0 ? normalizedFirms[0].freshness : firmsFetch.configured ? 'RECENT' : 'UNAVAILABLE',
    archiveStorageKey: firmsFetch.archiveStorageKey,
    error: firmsFetch.error,
  };

  // 3. Re-compute Weather -> Risk models (Flood, Cyclone, Multi-Hazard)
  const derived = await weatherRiskService.computeDerivedRisks(true);

  // 4. Total active hazards count
  const allActive = await hazardRepository.getActiveHazards();

  return {
    timestamp,
    eonet: eonetResult,
    firms: firmsResult,
    derivedWeatherRiskZonesCount: derived.riskZones.length,
    totalPersistedHazards: allActive.length,
  };
}
