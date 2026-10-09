/**
 * Disastraaa Data Platform Architecture — Unified Types
 * Stage 6: Storage Optimization, Lineage & ML Pipeline
 */

export type DataCategory =
  | 'A_CURRENT_OPERATIONAL'
  | 'B_HISTORICAL_ARCHIVE'
  | 'C_FORECAST_MODEL'
  | 'D_STATIC_REFERENCE'
  | 'E_CITIZEN_REPORTS'
  | 'F_DERIVED_ML';

export type RecordNature =
  | 'OBSERVATION'
  | 'FORECAST'
  | 'HISTORICAL_ARCHIVE'
  | 'MODEL_OUTPUT'
  | 'CITIZEN_REPORT'
  | 'DERIVED_FEATURE';

export type StorageTier =
  | 'TIER_1_NEON'
  | 'TIER_2_OBJECT_STORAGE'
  | 'TIER_3_PARQUET_ANALYTICS'
  | 'TIER_1_AND_2_HYBRID';

export type VerificationStatus =
  | 'VERIFIED_OFFICIAL'
  | 'VERIFIED_FIELD'
  | 'UNVERIFIED_CROWD'
  | 'EXPERIMENTAL_MODEL';

export interface SpatialCoverage {
  region: string;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  crs: string; // e.g. 'EPSG:4326'
  resolutionMeters?: number;
}

export interface LicenseAndRetentionPolicy {
  license: string;
  permitsArchival: boolean;
  permitsRedistribution: boolean;
  retentionPolicy: string;
}

export interface RetentionSpec {
  tier1RetentionHours: number; // e.g. 72h in Neon
  archiveToTier2: boolean;
  compactionStrategy: 'ROLLUP_DAILY' | 'SNAPSHOT_LATEST' | 'PERMANENT_IMMUTABLE' | 'DROP_AFTER_EXPIRY';
}

export interface RegisteredDataSource {
  id: string;
  name: string;
  provider: string;
  dataset: string;
  category: DataCategory;
  nature: RecordNature;
  spatialCoverage: SpatialCoverage;
  expectedUpdateFrequency: string;
  freshnessPolicy: {
    maxAgeMinutes: number;
    staleThresholdMinutes: number;
  };
  validationRules: string[];
  unitsAndSchema: Record<string, string>;
  license: LicenseAndRetentionPolicy;
  storageDestination: StorageTier;
  retention: RetentionSpec;
  reliabilityScore: number; // 0.0 - 1.0
  verificationStatus: VerificationStatus;
}

export interface IngestionJobRun {
  id: string;
  sourceId: string;
  provider: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'WARNING' | 'FAILED';
  recordsFetched: number;
  recordsPersisted: number;
  recordsDeduplicated: number;
  validationErrorsCount: number;
  durationMs: number;
  storageKey?: string;
  contentHash?: string;
  schemaVersion: string;
  errorMessage?: string;
  startedAt: string;
  completedAt: string;
}

export interface DatasetManifest {
  id: string;
  name: string;
  version: string;
  category: DataCategory;
  format: 'PARQUET' | 'JSONL_GZ' | 'CSV' | 'GEOJSON';
  storageKey: string;
  contentHash: string; // SHA-256
  rowCount: number;
  sizeBytes: number;
  temporalCoverage: {
    start: string;
    end: string;
  };
  spatialCoverage: SpatialCoverage;
  targetLabel?: string;
  featuresList: string[];
  splitStrategy?: {
    trainRatio: number;
    valRatio: number;
    testRatio: number;
    splitMethod: 'TEMPORAL' | 'SPATIAL_HOLDOUT';
    trainEndDate: string;
    valEndDate: string;
  };
  leakageCheckStatus: 'PASS' | 'WARN' | 'FAIL';
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TelemetryDailyAggregate {
  id?: string;
  state: string;
  district: string;
  date: string; // YYYY-MM-DD
  minTempC: number;
  maxTempC: number;
  avgTempC: number;
  totalPrecipMm: number;
  maxWindKmh: number;
  avgPressureHpa: number;
  observationCount: number;
  createdAt?: string;
}

export interface RetentionTableDryRun {
  tableName: string;
  rowsEvaluated: number;
  rowsToCompact: number;
  rowsToPurge: number;
  estimatedFreedBytes: number;
  affectedDateRange: {
    earliest: string;
    latest: string;
  };
}

export interface RetentionDryRunReport {
  timestamp: string;
  isDryRun: boolean;
  executed: boolean;
  tables: RetentionTableDryRun[];
  totalRowsToPurge: number;
  totalEstimatedFreedBytes: number;
  archivedToTier2Keys: string[];
  recommendations: string[];
}
