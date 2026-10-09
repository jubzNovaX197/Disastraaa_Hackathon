/**
 * Input Quality & Data Provenance Contract for Risk Intelligence (Stage 4)
 *
 * Defines explicit data quality standards across all risk engines:
 * - Distinguishes fresh physical observations from stale, missing, or model data.
 * - Prevents silent substitution of zero for missing critical inputs.
 * - Enforces transparent, auditable confidence scoring.
 *
 * ⚠️ PROTOTYPE / DECISION SUPPORT STANDARDS ONLY.
 */

export type InputQualityStatus =
  | 'FRESH_VERIFIED'        // Physical observation within verified freshness TTL
  | 'STALE'                 // Older than freshness TTL, retained as last-known-good context
  | 'MISSING'               // Field is null, undefined, or empty
  | 'SOURCE_UNAVAILABLE'    // Upstream API/feed failed or unreachable
  | 'MODELLED_FORECAST'     // Mathematical forecast or numerical model (e.g. GloFAS discharge, forecast precipitation)
  | 'HISTORICAL_OBSERVATION'; // Verified historical record (e.g. CWC archive benchmark)

export interface ProvenanceField<T = number> {
  value: T | null;
  status: InputQualityStatus;
  unit: string;
  observedAt?: string;
  retrievedAt?: string;
  source: string;
  stationOrLocationId?: string;
  isForecast?: boolean;
  notes?: string;
}

export interface RiskInputQualityReport {
  overallQuality: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT';
  confidenceScore: number; // 0.0 to 1.0
  freshCount: number;
  staleCount: number;
  missingCount: number;
  modelledCount: number;
  historicalCount: number;
  missingCriticalFields: string[];
  notes: string[];
}

// ── Freshness TTL Thresholds ──────────────────────────────────────────────────

export const RISK_FRESHNESS_TTL_MS = {
  /** Weather observations from AWS/Open-Meteo: fresh within 3 hours */
  WEATHER_OBSERVATION: 3 * 60 * 60 * 1000,
  /** Active warnings from IMD CAP / WMO: fresh while not expired */
  OFFICIAL_ALERT: 0, // checked against alert.expires
  /** Real-time river gauge: fresh within 24 hours */
  RIVER_GAUGE: 24 * 60 * 60 * 1000,
  /** Copernicus GloFAS discharge: model cycle typically 24 hours */
  MODELLED_DISCHARGE: 48 * 60 * 60 * 1000,
  /** OpenStreetMap geographic features: updated weekly/monthly */
  OSM_GEOMETRY: 30 * 24 * 60 * 60 * 1000,
} as const;

// ── Helper Evaluators ─────────────────────────────────────────────────────────

/**
 * Evaluates weather observation freshness.
 */
export function evaluateWeatherFreshness(
  observedAt: string | undefined,
  nowMs = Date.now(),
): InputQualityStatus {
  if (!observedAt) return 'MISSING';
  const obsMs = new Date(observedAt).getTime();
  if (isNaN(obsMs)) return 'MISSING';
  const ageMs = nowMs - obsMs;
  if (ageMs < 0) return 'MODELLED_FORECAST'; // Future timestamp = forecast
  if (ageMs <= RISK_FRESHNESS_TTL_MS.WEATHER_OBSERVATION) return 'FRESH_VERIFIED';
  return 'STALE';
}

/**
 * Evaluates CWC river gauge reading quality and freshness.
 */
export function evaluateRiverGaugeQuality(
  observedAt: string | undefined,
  waterLevelMetres: number | null | undefined,
  nowMs = Date.now(),
): InputQualityStatus {
  if (waterLevelMetres == null || isNaN(waterLevelMetres)) return 'MISSING';
  if (!observedAt) return 'HISTORICAL_OBSERVATION';
  const obsMs = new Date(observedAt).getTime();
  if (isNaN(obsMs)) return 'HISTORICAL_OBSERVATION';
  const ageMs = nowMs - obsMs;
  if (ageMs <= RISK_FRESHNESS_TTL_MS.RIVER_GAUGE) return 'FRESH_VERIFIED';
  return 'HISTORICAL_OBSERVATION';
}

/**
 * Evaluates alert freshness against current time and expiration.
 */
export function evaluateAlertFreshness(
  expiresAt: string | undefined,
  isActive: boolean,
  nowMs = Date.now(),
): InputQualityStatus {
  if (!isActive) return 'STALE';
  if (!expiresAt) return 'FRESH_VERIFIED';
  const expMs = new Date(expiresAt).getTime();
  if (isNaN(expMs)) return 'FRESH_VERIFIED';
  if (expMs < nowMs) return 'STALE'; // Expired
  return 'FRESH_VERIFIED';
}

/**
 * Evaluates overall input quality report across a dictionary of provenance fields.
 */
export function evaluateInputQualityReport(
  fields: Record<string, ProvenanceField<any>>,
  criticalKeys: string[] = [],
): RiskInputQualityReport {
  let freshCount = 0;
  let staleCount = 0;
  let missingCount = 0;
  let modelledCount = 0;
  let historicalCount = 0;
  const missingCriticalFields: string[] = [];
  const notes: string[] = [];

  const totalFields = Object.keys(fields).length;
  if (totalFields === 0) {
    return {
      overallQuality: 'INSUFFICIENT',
      confidenceScore: 0,
      freshCount: 0,
      staleCount: 0,
      missingCount: 0,
      modelledCount: 0,
      historicalCount: 0,
      missingCriticalFields,
      notes: ['No input fields provided.'],
    };
  }

  for (const [key, field] of Object.entries(fields)) {
    switch (field.status) {
      case 'FRESH_VERIFIED':
        freshCount++;
        break;
      case 'STALE':
        staleCount++;
        notes.push(`${key} is stale (observed at ${field.observedAt || 'unknown'}).`);
        break;
      case 'MODELLED_FORECAST':
        modelledCount++;
        break;
      case 'HISTORICAL_OBSERVATION':
        historicalCount++;
        notes.push(`${key} is a historical benchmark, not a live measurement.`);
        break;
      case 'MISSING':
      case 'SOURCE_UNAVAILABLE':
      default:
        missingCount++;
        if (criticalKeys.includes(key)) {
          missingCriticalFields.push(key);
        }
        break;
    }
  }

  // Calculate weighted confidence score
  // Fresh = 1.0, Modelled = 0.8, Historical = 0.6, Stale = 0.4, Missing = 0.0
  const scoreSum =
    freshCount * 1.0 +
    modelledCount * 0.8 +
    historicalCount * 0.6 +
    staleCount * 0.4 +
    missingCount * 0.0;

  const rawConfidence = Math.round((scoreSum / totalFields) * 100) / 100;
  // If critical fields are missing, cap confidence at 0.4
  const confidenceScore = missingCriticalFields.length > 0 ? Math.min(rawConfidence, 0.4) : rawConfidence;

  let overallQuality: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT' = 'HIGH';
  if (missingCriticalFields.length > 0 || confidenceScore < 0.4) {
    overallQuality = 'INSUFFICIENT';
  } else if (confidenceScore < 0.75 || staleCount > 0 || missingCount > 0) {
    overallQuality = 'DEGRADED';
  }

  return {
    overallQuality,
    confidenceScore,
    freshCount,
    staleCount,
    missingCount,
    modelledCount,
    historicalCount,
    missingCriticalFields,
    notes,
  };
}
