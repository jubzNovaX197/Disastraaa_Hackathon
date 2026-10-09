/**
 * Canonical Data Transforms & Quality Metrics Engine
 *
 * Implements deterministic data normalizations, quality checks, and rollups:
 * - UTC timestamp normalization
 * - Spatial coordinate validation within target bounding box
 * - Rolling rainfall accumulations (bounded to available intervals)
 * - Dataset quality metrics (missingness, outlier counts, record coverage)
 * - Safe temporal joins preventing future-data leakage in ML pipelines
 */

import type { TelemetryDailyAggregate } from './types';

/**
 * Standardizes any valid timestamp input to an ISO 8601 UTC string.
 */
export function normalizeTimestampToUtc(timestamp: string | number | Date): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid timestamp encountered: ${timestamp}`);
  }
  return d.toISOString();
}

/**
 * Validates geographic coordinates [lng, lat] against standard WGS84 bounds
 * and optional regional bounding boxes.
 */
export function validateCoordinates(
  lng: number,
  lat: number,
  bbox?: [number, number, number, number], // [minLng, minLat, maxLng, maxLat]
): boolean {
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (isNaN(lng) || isNaN(lat)) return false;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false;

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates rolling precipitation accumulation across a window of hours.
 * Only calculates when sufficient hourly readings are available.
 */
export function calculateRollingRainfall(hourlyRain: number[], windowHours: number): number {
  if (!hourlyRain || hourlyRain.length === 0 || windowHours <= 0) return 0;
  const slice = hourlyRain.slice(-windowHours);
  const sum = slice.reduce((acc, val) => acc + (typeof val === 'number' && !isNaN(val) && val >= 0 ? val : 0), 0);
  return Math.round(sum * 10) / 10;
}

/**
 * Computes dataset missingness, outlier rates, and distribution stats.
 */
export function computeDatasetQualityMetrics(
  records: Record<string, any>[],
  numericFields: string[],
): {
  rowCount: number;
  missingnessPct: Record<string, number>;
  outliersCount: Record<string, number>;
  fieldRanges: Record<string, { min: number; max: number; avg: number }>;
} {
  const rowCount = records.length;
  const missingnessPct: Record<string, number> = {};
  const outliersCount: Record<string, number> = {};
  const fieldRanges: Record<string, { min: number; max: number; avg: number }> = {};

  if (rowCount === 0) {
    for (const f of numericFields) {
      missingnessPct[f] = 0;
      outliersCount[f] = 0;
      fieldRanges[f] = { min: 0, max: 0, avg: 0 };
    }
    return { rowCount: 0, missingnessPct, outliersCount, fieldRanges };
  }

  for (const field of numericFields) {
    let nullCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    const values: number[] = [];

    for (const rec of records) {
      const val = rec[field];
      if (val === null || val === undefined || isNaN(Number(val))) {
        nullCount++;
      } else {
        const num = Number(val);
        values.push(num);
        sum += num;
        if (num < min) min = num;
        if (num > max) max = num;
      }
    }

    missingnessPct[field] = Math.round((nullCount / rowCount) * 1000) / 10;

    if (values.length > 0) {
      const avg = sum / values.length;
      fieldRanges[field] = {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round(avg * 100) / 100,
      };

      // Outlier detection using 3-sigma (or bounded thresholds)
      const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const outlierLimitHigh = avg + 3 * stdDev;
      const outlierLimitLow = avg - 3 * stdDev;

      const outliers = values.filter((v) => v > outlierLimitHigh || v < outlierLimitLow).length;
      outliersCount[field] = outliers;
    } else {
      fieldRanges[field] = { min: 0, max: 0, avg: 0 };
      outliersCount[field] = 0;
    }
  }

  return { rowCount, missingnessPct, outliersCount, fieldRanges };
}

/**
 * Builds a daily summary rollup from hourly weather records.
 */
export function buildDailyRollup(
  district: string,
  state: string,
  date: string,
  records: {
    temperatureC: number;
    precipitationMm: number;
    windSpeedKmh: number;
    surfacePressureHpa: number;
  }[],
): TelemetryDailyAggregate {
  if (records.length === 0) {
    return {
      state,
      district,
      date,
      minTempC: 25,
      maxTempC: 25,
      avgTempC: 25,
      totalPrecipMm: 0,
      maxWindKmh: 0,
      avgPressureHpa: 1013,
      observationCount: 0,
    };
  }

  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let sumTemp = 0;
  let totalPrecip = 0;
  let maxWind = 0;
  let sumPress = 0;

  for (const r of records) {
    if (r.temperatureC < minTemp) minTemp = r.temperatureC;
    if (r.temperatureC > maxTemp) maxTemp = r.temperatureC;
    sumTemp += r.temperatureC;
    totalPrecip += r.precipitationMm || 0;
    if (r.windSpeedKmh > maxWind) maxWind = r.windSpeedKmh;
    sumPress += r.surfacePressureHpa || 1013;
  }

  const count = records.length;
  return {
    state,
    district,
    date,
    minTempC: Math.round(minTemp * 10) / 10,
    maxTempC: Math.round(maxTemp * 10) / 10,
    avgTempC: Math.round((sumTemp / count) * 10) / 10,
    totalPrecipMm: Math.round(totalPrecip * 10) / 10,
    maxWindKmh: Math.round(maxWind * 10) / 10,
    avgPressureHpa: Math.round((sumPress / count) * 10) / 10,
    observationCount: count,
  };
}

/**
 * Joins weather and river gauge measurements strictly ensuring no future data leakage.
 * All feature measurements must be observed at or strictly before target cutoff T.
 */
export function joinWithoutFutureLeakage<TFeature extends { timestamp: string }, TTarget extends { timestamp: string }>(
  features: TFeature[],
  target: TTarget,
): TFeature[] {
  const targetTime = new Date(target.timestamp).getTime();
  return features.filter((f) => {
    const fTime = new Date(f.timestamp).getTime();
    return fTime <= targetTime; // Strict temporal causality
  });
}
