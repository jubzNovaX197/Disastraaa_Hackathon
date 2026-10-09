# Disastraaa Data Platform Architecture, Storage Optimization & ML Pipeline

**System Version:** Disastraaa Stage 6  
**Document Status:** Approved Architecture Plan  
**Target Region:** Odisha State & Kalahandi District Focus Corridor, India  
**Last Updated:** October 2026 (Operational Audit)

---

## 1. Executive Summary & Existing Situation

Disastraaa is an enterprise disaster-management and early-warning intelligence platform for India, with Odisha and the Kalahandi river corridor as its initial operational theater. The platform ingests multi-source geospatial, meteorological, hydrological, and remote sensing telemetry, feeds deterministic multi-hazard risk engines (flood, cyclone, cascading risks), and powers command-center emergency dashboards and AI decision support.

### 1.1 Existing Infrastructure Audit

* **Database Engine:** Neon Serverless PostgreSQL 18.6 with PostGIS 3.6 extension (`aarch64-unknown-linux-gnu`).
* **Existing Tables in Neon:**
  * `regions`: Spatial boundaries and centroids for Odisha districts and blocks (SRID 4326).
  * `weather_telemetry`: Operational weather observations (temperature, precipitation, wind, pressure, forecast JSONB).
  * `hazards`: Live active hazard events (NASA EONET, NASA FIRMS, derived risk zones).
  * `alerts`: Official Common Alerting Protocol (CAP) warnings from IMD and NDMA Sachet.
  * `road_segments`: OpenStreetMap road networks with PostGIS LineStrings and flood vulnerability statuses.
  * `shelters`: Cyclone and flood evacuation shelters with capacities, facilities, and statuses.
  * `citizen_reports`: Field ground-truth citizen reports with geo-coordinates and verification workflows.
  * `incidents`: Emergency response incident tickets and dispatch statuses.
  * `historical_disaster_records`: Curated disaster events (1999 Super Cyclone, Phailin 2013, Fani 2019, Mahanadi floods).
  * `resource_inventory`, `operational_events`, `audit_logs`, `users`.
* **External Providers Active in Codebase:**
  1. **Open-Meteo API**: Real-time hourly weather observations, 7-day forecast arrays, rainfall rates, wind gusts, soil moisture.
  2. **IMD / NDMA Sachet CAP Feed**: Official Common Alerting Protocol XML/JSON feeds for Odisha districts.
  3. **Central Water Commission (India-WRIS) & GloFAS**: River gauge telemetry (Kesinga gauge on Tel River, discharge, warning stages).
  4. **NASA EONET v3**: Near real-time natural event tracking (cyclones, severe storms, landslides).
  5. **NASA FIRMS (VIIRS / MODIS)**: Thermal anomaly and active fire hotspots.
  6. **OpenStreetMap Overpass API**: Road network geometries, bridges, cyclone shelters, schools, and medical facilities.
* **Storage Layer:**
  * `src/lib/storage/index.ts`: Pluggable `ObjectStorageProvider` with `S3CompatibleStorageProvider` (Cloudflare R2 / AWS S3 / MinIO) and local filesystem fallback (`.storage/` directory).

### 1.2 Core Identified Problems

1. **Unbounded OLTP Table Growth in Neon:**
   * Every weather sync writes rows to `weather_telemetry` containing full multi-day hourly forecast JSON payloads (`forecast_json` JSONB). Over weeks and months of polling multiple districts, this table balloons in size, exhausting Neon serverless storage quotas.
2. **Missing Unified Data Lineage & Manifest Registry:**
   * Raw external payloads (NASA EONET, FIRMS, Open-Meteo, IMD) are either stored ad-hoc in `.storage/` or discarded after database insertion, without standardized metadata tracking (SHA-256 content hashes, row counts, schema versions, retention tags).
3. **No Automated Compaction & Aggregation Policy:**
   * High-resolution sub-hourly/hourly operational readings are kept indefinitely without rolling aggregation into daily/weekly summaries, wasting database storage on aging, non-critical raw time-series points.
4. **Lack of Columnar (Parquet) Storage for ML & Analytics:**
   * ML training and historical risk modeling queries must scan OLTP tables directly, creating query contention and poor I/O performance for analytical workloads.
5. **Risk of Future-Data Leakage in ML Workflows:**
   * Without formal dataset versioning, temporal holdout splits, and spatial cross-validation strategies, future observation data could inadvertently leak into historical hazard models.

---

## 2. Proposed Tiered Storage Architecture

To provide scalable, cost-effective storage without discarding critical disaster telemetry, Disastraaa establishes a **Three-Tier Storage Hierarchy**:

```
+-----------------------------------------------------------------------------------+
|                           EXTERNAL DATA SOURCES & FEEDS                           |
|  (Open-Meteo, IMD CAP, CWC / GloFAS, NASA EONET / FIRMS, OSM Overpass, Citizens)  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                    [FETCH & VALIDATE]
                                          |
                      +-------------------+-------------------+
                      |                                       |
                      v                                       v
        +---------------------------+           +---------------------------+
        |  TIER 2: OBJECT STORAGE   |           |  TIER 1: NEON POSTGRESQL  |
        |  (Cloudflare R2 / S3)     |           |  (OLTP + Spatial PostGIS) |
        +---------------------------+           +---------------------------+
        | * Raw API responses (gzip)|           | * Current operational state|
        | * Satellite GeoTIFF/raster|           | * Latest weather telemetry |
        | * Large GeoJSON networks  |           | * Active CAP alerts       |
        | * Immutable raw archives  |           | * Roads & Shelter statuses|
        | * Content-addressed blobs |           | * Lineage & job run logs  |
        +-------------+-------------+           | * Dataset manifests       |
                      |                         | * Daily/weekly aggregates |
                      |                         +-------------+-------------+
                      v                                       |
        +---------------------------+                         |
        | TIER 3: COLUMNAR PARQUET  |                         |
        | (Derived & Analytical)    |                         |
        +---------------------------+                         |
        | * Compact columnar format |                         |
        | * Partitioned by year/type|                         |
        | * Cleaned ML training sets| <-----------------------+
        | * Verified target labels  |
        | * Zero future-leakage sets|
        +---------------------------+
```

### Tier 1: Neon PostgreSQL + PostGIS (Operational OLTP)
* **Role:** High-performance, low-latency relational and spatial queries serving Next.js API routes and the Command Center UI.
* **Stored Datasets:**
  * Active alerts, active hazards, open incidents, verified citizen reports.
  * Latest observation per region (1 active row per monitored station/district).
  * Rolling operational telemetry window (last 24 to 72 hours).
  * Daily summary rollups (`telemetry_daily_aggregates`).
  * Ingestion run audit logs (`ingestion_job_runs`).
  * Dataset manifests and object storage pointer references (`dataset_manifests`).
* **Design Guidelines:**
  * Never store multi-megabyte raw JSON payloads or satellite imagery in PostgreSQL rows.
  * Use spatial indexes (`GIST` on geometry columns) and compound btree indexes on `(district, observed_at)`.

### Tier 2: Cloudflare R2 / S3-Compatible Object Storage (Raw & Bulky Data)
* **Role:** Scalable, low-cost immutable blob storage.
* **Why Cloudflare R2:**
  * Zero egress fees (crucial for downloading ML training sets and satellite rasters).
  * 10 GB free monthly storage, $0.015/GB/month thereafter.
  * S3-compatible API (compatible with standard S3 SDKs and REST clients).
  * Graceful fallback to local `.storage/` in development environments where cloud credentials are unconfigured.
* **Stored Datasets:**
  * Original raw provider API payloads (Open-Meteo, IMD CAP XML, NASA FIRMS CSV).
  * High-resolution GeoJSON exports of road networks and shelter shapes.
  * Uncompressed historical raw records.
  * Remote sensing satellite imagery / FIRMS raw pass data.
* **Storage Convention:**
  * `raw/{provider}/{dataset}/{YYYY}/{MM}/{hash}.json.gz`
  * Content-addressed using SHA-256 hashes to guarantee deduplication.

### Tier 3: Analytical & ML-Ready Parquet / Columnar Storage
* **Role:** Compact, high-throughput analytical format for time-series analysis, statistical baselines, and ML model training.
* **Format:** Apache Parquet / Gzip-compressed columnar JSONL.
* **Partitioning Strategy:** Partitioned by hazard domain and year/month (e.g. `analytics/weather/year=2024/month=10/weather_odisha_202410.parquet`). Avoids small-file proliferation while enabling bounded range scans.
* **Target Workloads:** Flood risk regression, cyclone landfall impact estimation, rainfall threshold exceedance detection.

---

## 3. Data Classification & Registry (Categories A–F)

Every ingested data source is categorized into one of six core categories:

| Category | Description | Primary Storage | Retention Policy | Example Sources |
|---|---|---|---|---|
| **A. Current Operational Data** | Live observations, active warnings, road statuses needed by dashboard | Neon PostgreSQL | 24–72 hours rolling window | Open-Meteo current temp, IMD CAP alerts, Kesinga gauge stage |
| **B. Historical Observations & Archives** | Past weather readings, historical disaster impacts, gauge archives | Tier 2 Object Store + Daily Aggs in Neon | Permanent archive in R2, daily aggregates in Neon | Odisha 1999 Super Cyclone, Fani 2019, 2018–2024 rain archives |
| **C. Forecast & Model-Derived Predictions** | Multi-day weather forecasts, GloFAS ensemble discharge predictions | Tier 2 (raw) + Neon (current 72h) | Retain current 72h window; archive daily runs to R2 | Open-Meteo 7-day hourly forecast, GloFAS 5-day river forecast |
| **D. Static / Slowly Changing Reference Data** | Road networks, shelters, administrative boundaries, elevation | Neon (spatial) + Tier 2 (GeoJSON snapshots) | Infrequent updates (monthly/quarterly) | OSM Odisha roads, OSDMA shelters, Survey of India boundaries |
| **E. Citizen & Field-Verified Reports** | Crowdsourced damage reports, shelter capacity updates, flood photos | Neon (metadata) + Tier 2 (photos/media) | Permanent records for audit and compliance | Disastraaa citizen portal reports, field officer verifications |
| **F. Derived Features & ML Datasets** | Training feature tables, flood threshold exceedance labels, test holdouts | Tier 3 Columnar Parquet / Tier 2 Objects | Versioned immutable manifests (`v1.0.0`, `v1.1.0`) | Disastraaa Flood Inundation Benchmark, Cyclone Wind Damage Set |

---

## 4. Incremental Ingestion Pipeline Design

```
FETCH -> VALIDATE -> NORMALIZE -> DEDUPLICATE -> STORE RAW -> TRANSFORM -> AGGREGATE -> UPDATE OPERATIONAL -> RECORD METRICS
```

1. **FETCH:** Incremental retrieval using provider-supported timestamps, bounding boxes, or limit cursors. Exponential backoff and retry (max 3 retries) with jitter.
2. **VALIDATE:** Strict schema validation via TypeScript interfaces; range checks (e.g. temperature -10°C to 60°C, latitude -90 to 90, rainfall >= 0mm).
3. **NORMALIZE:** Standardization to UTC timestamps (ISO 8601), metric units (°C, mm, km/h, hPa, m MSL), and WGS84 (SRID 4326).
4. **DEDUPLICATE:** Compute SHA-256 payload checksum and composite primary keys `(source_id, location_id, timestamp)`. Skip identical payloads.
5. **STORE RAW (If permitted):** Archive raw payload to Object Storage (`raw/{source}/{date}/{hash}.json.gz`) with verified ETag.
6. **TRANSFORM:** Derive operational metrics (rolling 3h/6h/24h rainfall accumulation, wind gust factors, flood stage deltas).
7. **AGGREGATE:** Compute daily summary statistics (min, max, mean, sum) for long-term historical trends.
8. **UPDATE OPERATIONAL TABLES:** Upsert into Neon tables (`weather_telemetry`, `alerts`, `hazards`) using `ON CONFLICT DO UPDATE`.
9. **RECORD QUALITY METRICS:** Log ingestion run status to `ingestion_job_runs` (duration, records fetched, inserted, updated, error rates, freshness status).

---

## 5. Storage Compaction & Retention Policy

To prevent uncontrolled database growth on Neon:

1. **Operational Telemetry Retention Window:**
   * High-resolution sub-hourly/hourly observations in `weather_telemetry` are retained in Neon for **72 hours** (configurable via `TELEMETRY_RETENTION_HOURS`).
2. **Compaction to Daily Aggregates:**
   * Before observations older than the retention window are purged, a compaction job computes daily summaries into `telemetry_daily_aggregates`:
     * `min_temp_c`, `max_temp_c`, `avg_temp_c`
     * `total_precip_mm`, `max_wind_kmh`, `avg_pressure_hpa`
     * `observation_count`
   * Daily aggregates occupy < 1% of the storage of raw hourly JSON records while preserving multi-year historical trends.
3. **Raw Payload Archival:**
   * Raw JSON payloads are compressed with Gzip and moved to Tier 2 Object Storage before deletion from Neon.
4. **Safety & Dry-Run Guarantee:**
   * Retention engine runs in **Dry-Run Mode (`dryRun: true`)** by default.
   * Reports affected table names, row counts, estimated freed bytes, and date ranges without modifying database records.
   * Destructive purging requires explicit operator invocation (`dryRun: false` or `--execute`).

---

## 6. ML-Ready Dataset Pipeline & Leakage Prevention

### 6.1 Verified Historical Target Labels
Disastraaa leverages real historical records and authoritative telemetry for ML targets:
1. **River Flood Threshold Exceedance (Kesinga Gauge, Tel River):**
   * *Target:* Binary exceedance of Warning Stage (169.00 m) and Danger Stage (170.05 m MSL).
   * *Features:* Upstream 24h/48h/72h rainfall, catchment soil moisture, upstream discharge rates.
2. **Severe Cyclone Wind & Storm Surge Damage (Odisha Coastal Districts):**
   * *Target:* Documented infrastructure damage severity (buildings, roads, electrical grid) from historical disaster records (1999 Super Cyclone, Phailin 2013, Fani 2019).
   * *Features:* Central pressure deficit, peak sustained wind speed, distance to coastline, forward speed.

### 6.2 Strict Leakage Prevention Rules
* **Temporal Splitting (No Random Train/Test Shuffle):**
  * Train Set: Historical events prior to 2019 (e.g. 1999–2018).
  * Validation Set: 2019–2021 (e.g. Cyclone Fani, Amphan).
  * Test Set: 2022–2024 (holdout real observations).
* **Spatial Holdouts:**
  * Evaluate models on unseen geographic districts (e.g. train on Kendrapara/Puri, evaluate on Kalahandi/Ganjam) to test spatial generalization.
* **Causal Feature Engineering:**
  * Only features strictly observed *prior* to forecast timestamp $T_0$ are included. Future rainfall or downstream gauge readings are barred from input vectors.

---

## 7. Operational Diagnostics & Monitoring

A dedicated platform diagnostic CLI (`scripts/diagnose-data-platform.ts`) provides full operational observability:
* Database connection, PostGIS status, and table row counts.
* Provider ingestion freshness, last observation timestamp, and error counts.
* Storage tier breakdown (Neon table counts, Object storage reachability).
* Compaction and retention candidate evaluation (dry-run row counts).
* ML dataset manifests and version tracking.

---

## 8. Implementation Phases

| Phase | Description | Deliverables | Status |
|---|---|---|---|
| **Phase 1** | Architectural Audit & Blueprint | `docs/data-platform-architecture.md` | COMPLETE |
| **Phase 2** | Central Data-Source Registry | `src/lib/platform/registry.ts`, `types.ts` | PENDING |
| **Phase 3** | Tiered Storage & Analytical Adapter | `src/lib/platform/storage.ts`, Schema Migrations | PENDING |
| **Phase 4** | Incremental Ingestion Orchestrator | `src/lib/platform/pipeline.ts` | PENDING |
| **Phase 5** | Retention & Compaction Engine | `src/lib/platform/retention.ts` (Dry-run safe) | PENDING |
| **Phase 6** | Canonical Transforms & Quality Metrics | `src/lib/platform/transforms.ts` | PENDING |
| **Phase 7** | ML Dataset Pipeline & Manifests | `src/lib/platform/mlPipeline.ts` | PENDING |
| **Phase 8** | Platform Diagnostic Script | `scripts/diagnose-data-platform.ts` | PENDING |
| **Phase 9** | Automated Verification Test Suite | `scripts/verify-stage6-data-platform.ts` | PENDING |

---
*Authored by Antigravity Senior Data Architect & ML Platform Engineer for Disastraaa Project.*
