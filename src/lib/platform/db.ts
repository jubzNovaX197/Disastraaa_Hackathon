/**
 * Stage 6 Data Platform — Neon PostgreSQL Lineage & Persistence Layer
 *
 * Implements non-destructive persistence for:
 * - Ingestion job run audit logs (lineage, status, latency, deduplication counts)
 * - Dataset manifests (Tier 2/3 object storage references, content hashes, schema versions)
 * - Compacted daily telemetry aggregates (low-storage long-term trend analysis)
 */

import { executeQuery, getDbClient } from '@/lib/db';
import type { IngestionJobRun, DatasetManifest, TelemetryDailyAggregate } from './types';

/**
 * Initializes Stage 6 tables non-destructively in Neon PostgreSQL.
 */
export async function initializeStage6Tables(): Promise<{ success: boolean; error?: string }> {
  const client = getDbClient();
  if (!client) {
    return { success: false, error: 'DATABASE_URL is not configured' };
  }

  try {
    // 1. ingestion_job_runs
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ingestion_job_runs (
        id VARCHAR(64) PRIMARY KEY,
        source_id VARCHAR(64) NOT NULL,
        provider VARCHAR(128) NOT NULL,
        status VARCHAR(32) NOT NULL,
        records_fetched INT NOT NULL DEFAULT 0,
        records_persisted INT NOT NULL DEFAULT 0,
        records_deduplicated INT NOT NULL DEFAULT 0,
        validation_errors_count INT NOT NULL DEFAULT 0,
        duration_ms INT NOT NULL DEFAULT 0,
        storage_key VARCHAR(255),
        content_hash VARCHAR(128),
        schema_version VARCHAR(32) DEFAULT 'v1',
        error_message TEXT,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_ingestion_job_runs_source_status ON ingestion_job_runs(source_id, status);
    `);
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_ingestion_job_runs_started ON ingestion_job_runs(started_at DESC);
    `);

    // 2. dataset_manifests
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS dataset_manifests (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        version VARCHAR(32) NOT NULL,
        category VARCHAR(64) NOT NULL,
        format VARCHAR(32) NOT NULL,
        storage_key VARCHAR(255) NOT NULL,
        content_hash VARCHAR(128) NOT NULL,
        row_count INT NOT NULL DEFAULT 0,
        size_bytes BIGINT NOT NULL DEFAULT 0,
        temporal_start TIMESTAMPTZ,
        temporal_end TIMESTAMPTZ,
        spatial_region VARCHAR(128),
        target_label VARCHAR(128),
        features_list JSONB DEFAULT '[]'::jsonb,
        split_strategy JSONB,
        leakage_check_status VARCHAR(32) DEFAULT 'PASS',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_dataset_manifests_category ON dataset_manifests(category);
    `);
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_dataset_manifests_name_ver ON dataset_manifests(name, version);
    `);

    // 3. telemetry_daily_aggregates
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS telemetry_daily_aggregates (
        id VARCHAR(64) PRIMARY KEY,
        state VARCHAR(64) NOT NULL,
        district VARCHAR(64) NOT NULL,
        date DATE NOT NULL,
        min_temp_c NUMERIC(5, 2),
        max_temp_c NUMERIC(5, 2),
        avg_temp_c NUMERIC(5, 2),
        total_precip_mm NUMERIC(7, 2),
        max_wind_kmh NUMERIC(5, 2),
        avg_pressure_hpa NUMERIC(6, 2),
        observation_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_telemetry_daily UNIQUE (state, district, date)
      );
    `);

    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_daily_district_date ON telemetry_daily_aggregates(district, date DESC);
    `);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Persists an ingestion job run into the audit log.
 */
export async function recordJobRun(run: IngestionJobRun): Promise<void> {
  const client = getDbClient();
  if (!client) return;

  try {
    await executeQuery(
      `
      INSERT INTO ingestion_job_runs (
        id, source_id, provider, status, records_fetched, records_persisted,
        records_deduplicated, validation_errors_count, duration_ms,
        storage_key, content_hash, schema_version, error_message,
        started_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        records_persisted = EXCLUDED.records_persisted,
        duration_ms = EXCLUDED.duration_ms,
        error_message = EXCLUDED.error_message,
        completed_at = EXCLUDED.completed_at;
    `,
      [
        run.id,
        run.sourceId,
        run.provider,
        run.status,
        run.recordsFetched,
        run.recordsPersisted,
        run.recordsDeduplicated,
        run.validationErrorsCount,
        run.durationMs,
        run.storageKey || null,
        run.contentHash || null,
        run.schemaVersion || 'v1',
        run.errorMessage || null,
        run.startedAt,
        run.completedAt,
      ],
    );
  } catch (err) {
    console.warn('[STAGE-6] Failed to persist ingestion job run:', err);
  }
}

/**
 * Returns recent ingestion job runs.
 */
export async function getRecentJobRuns(limit = 20): Promise<IngestionJobRun[]> {
  const client = getDbClient();
  if (!client) return [];

  try {
    const rows = await executeQuery<any>(
      `
      SELECT id, source_id as "sourceId", provider, status,
             records_fetched as "recordsFetched", records_persisted as "recordsPersisted",
             records_deduplicated as "recordsDeduplicated", validation_errors_count as "validationErrorsCount",
             duration_ms as "durationMs", storage_key as "storageKey", content_hash as "contentHash",
             schema_version as "schemaVersion", error_message as "errorMessage",
             started_at as "startedAt", completed_at as "completedAt"
      FROM ingestion_job_runs
      ORDER BY started_at DESC
      LIMIT $1;
    `,
      [limit],
    );
    return rows;
  } catch (err) {
    console.warn('[STAGE-6] Error fetching job runs:', err);
    return [];
  }
}

/**
 * Saves or updates a dataset manifest in Neon.
 */
export async function saveDatasetManifest(manifest: DatasetManifest): Promise<void> {
  const client = getDbClient();
  if (!client) return;

  try {
    await executeQuery(
      `
      INSERT INTO dataset_manifests (
        id, name, version, category, format, storage_key, content_hash,
        row_count, size_bytes, temporal_start, temporal_end, spatial_region,
        target_label, features_list, split_strategy, leakage_check_status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        row_count = EXCLUDED.row_count,
        size_bytes = EXCLUDED.size_bytes,
        content_hash = EXCLUDED.content_hash,
        leakage_check_status = EXCLUDED.leakage_check_status,
        metadata = EXCLUDED.metadata;
    `,
      [
        manifest.id,
        manifest.name,
        manifest.version,
        manifest.category,
        manifest.format,
        manifest.storageKey,
        manifest.contentHash,
        manifest.rowCount,
        manifest.sizeBytes,
        manifest.temporalCoverage.start,
        manifest.temporalCoverage.end,
        manifest.spatialCoverage.region,
        manifest.targetLabel || null,
        JSON.stringify(manifest.featuresList),
        manifest.splitStrategy ? JSON.stringify(manifest.splitStrategy) : null,
        manifest.leakageCheckStatus,
        JSON.stringify(manifest.metadata || {}),
      ],
    );
  } catch (err) {
    console.warn('[STAGE-6] Failed to save dataset manifest:', err);
  }
}

/**
 * Retrieves dataset manifests from Neon.
 */
export async function getDatasetManifests(category?: string): Promise<DatasetManifest[]> {
  const client = getDbClient();
  if (!client) return [];

  try {
    const query = category
      ? `SELECT * FROM dataset_manifests WHERE category = $1 ORDER BY created_at DESC;`
      : `SELECT * FROM dataset_manifests ORDER BY created_at DESC;`;
    const params = category ? [category] : [];
    const rows = await executeQuery<any>(query, params);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      category: r.category,
      format: r.format,
      storageKey: r.storage_key,
      contentHash: r.content_hash,
      rowCount: Number(r.row_count),
      sizeBytes: Number(r.size_bytes),
      temporalCoverage: {
        start: r.temporal_start ? new Date(r.temporal_start).toISOString() : '',
        end: r.temporal_end ? new Date(r.temporal_end).toISOString() : '',
      },
      spatialCoverage: {
        region: r.spatial_region || 'Odisha State',
        crs: 'EPSG:4326',
      },
      targetLabel: r.target_label || undefined,
      featuresList: typeof r.features_list === 'string' ? JSON.parse(r.features_list) : r.features_list || [],
      splitStrategy: typeof r.split_strategy === 'string' ? JSON.parse(r.split_strategy) : r.split_strategy || undefined,
      leakageCheckStatus: r.leakage_check_status || 'PASS',
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {},
      createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch (err) {
    console.warn('[STAGE-6] Error fetching dataset manifests:', err);
    return [];
  }
}

/**
 * Upserts daily weather telemetry aggregates into Neon.
 */
export async function upsertDailyAggregates(
  aggregates: TelemetryDailyAggregate[],
): Promise<{ inserted: number; updated: number }> {
  const client = getDbClient();
  if (!client || aggregates.length === 0) return { inserted: 0, updated: 0 };

  let inserted = 0;
  let updated = 0;

  for (const agg of aggregates) {
    const id = agg.id || `${agg.district.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${agg.date}`;
    try {
      const res = await executeQuery<any>(
        `
        INSERT INTO telemetry_daily_aggregates (
          id, state, district, date, min_temp_c, max_temp_c, avg_temp_c,
          total_precip_mm, max_wind_kmh, avg_pressure_hpa, observation_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (state, district, date) DO UPDATE SET
          min_temp_c = LEAST(telemetry_daily_aggregates.min_temp_c, EXCLUDED.min_temp_c),
          max_temp_c = GREATEST(telemetry_daily_aggregates.max_temp_c, EXCLUDED.max_temp_c),
          avg_temp_c = EXCLUDED.avg_temp_c,
          total_precip_mm = EXCLUDED.total_precip_mm,
          max_wind_kmh = GREATEST(telemetry_daily_aggregates.max_wind_kmh, EXCLUDED.max_wind_kmh),
          avg_pressure_hpa = EXCLUDED.avg_pressure_hpa,
          observation_count = EXCLUDED.observation_count
        RETURNING (xmax = 0) AS is_insert;
      `,
        [
          id,
          agg.state,
          agg.district,
          agg.date,
          agg.minTempC,
          agg.maxTempC,
          agg.avgTempC,
          agg.totalPrecipMm,
          agg.maxWindKmh,
          agg.avgPressureHpa,
          agg.observationCount,
        ],
      );

      if (res && res[0]?.is_insert) {
        inserted++;
      } else {
        updated++;
      }
    } catch (err) {
      console.warn(`[STAGE-6] Failed to upsert daily aggregate for ${agg.district} on ${agg.date}:`, err);
    }
  }

  return { inserted, updated };
}

/**
 * Queries daily aggregates for a district within a date range.
 */
export async function getDailyAggregates(
  district: string,
  startDate?: string,
  endDate?: string,
): Promise<TelemetryDailyAggregate[]> {
  const client = getDbClient();
  if (!client) return [];

  try {
    let sql = `SELECT * FROM telemetry_daily_aggregates WHERE LOWER(district) = LOWER($1)`;
    const params: any[] = [district];

    if (startDate) {
      params.push(startDate);
      sql += ` AND date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      sql += ` AND date <= $${params.length}`;
    }

    sql += ` ORDER BY date ASC;`;

    const rows = await executeQuery<any>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      state: r.state,
      district: r.district,
      date: typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0],
      minTempC: Number(r.min_temp_c),
      maxTempC: Number(r.max_temp_c),
      avgTempC: Number(r.avg_temp_c),
      totalPrecipMm: Number(r.total_precip_mm),
      maxWindKmh: Number(r.max_wind_kmh),
      avgPressureHpa: Number(r.avg_pressure_hpa),
      observationCount: Number(r.observation_count),
      createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch (err) {
    console.warn('[STAGE-6] Error fetching daily aggregates:', err);
    return [];
  }
}
