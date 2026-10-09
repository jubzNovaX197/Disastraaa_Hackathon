-- ==============================================================================
-- DISASTRAAA STAGE 6: DATA PLATFORM, STORAGE OPTIMIZATION & ML DATA PIPELINE
-- Non-destructive migration: Adds lineage tracking, dataset manifests, and rollups
-- ==============================================================================

-- 1. Ingestion Job Runs (Data Lineage & Operational Telemetry Ingestion Audit)
CREATE TABLE IF NOT EXISTS ingestion_job_runs (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL,
    provider VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'SUCCESS', 'PARTIAL_SUCCESS', 'WARNING', 'FAILED'
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

CREATE INDEX IF NOT EXISTS idx_ingestion_job_runs_source_status ON ingestion_job_runs(source_id, status);
CREATE INDEX IF NOT EXISTS idx_ingestion_job_runs_started ON ingestion_job_runs(started_at DESC);

-- 2. Dataset Manifests (Tier 2/Tier 3 Archival & ML Benchmark Registry)
CREATE TABLE IF NOT EXISTS dataset_manifests (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    version VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    format VARCHAR(32) NOT NULL, -- 'PARQUET', 'JSONL_GZ', 'CSV', 'GEOJSON'
    storage_key VARCHAR(255) NOT NULL,
    content_hash VARCHAR(128) NOT NULL, -- SHA-256
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

CREATE INDEX IF NOT EXISTS idx_dataset_manifests_category ON dataset_manifests(category);
CREATE INDEX IF NOT EXISTS idx_dataset_manifests_name_ver ON dataset_manifests(name, version);

-- 3. Telemetry Daily Aggregates (Compacted Historical Weather for Long-Term Trends)
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

CREATE INDEX IF NOT EXISTS idx_telemetry_daily_district_date ON telemetry_daily_aggregates(district, date DESC);
