# DISASTRAAA — SYSTEM ARCHITECTURE SPECIFICATION

**Document Version:** 1.0.0 (Production Audit)  
**Date:** October 9, 2026  
**Status:** Verified Against Active Codebase  
**Auditor:** Senior Software Architect & Geospatial Systems Engineer  

---

## 1. HIGH-LEVEL SYSTEM CONTEXT

Disastraaa is an intelligent, multi-hazard disaster decision-support system built for emergency operations centers (EOCs), administrative authorities, field responders, and citizens across India (with deep operational calibration for the coastal and riverine Odisha basin).

### Verified System Boundary:
```mermaid
graph TD
    subgraph ExternalSources["External Data Feeds & APIs"]
        OM["Open-Meteo Weather API<br/>(Live Observations & Forecast)"]
        GLOFAS["Copernicus GloFAS<br/>(Modelled River Discharge)"]
        CWC["India-WRIS / CWC<br/>(Kesinga 022-MDBURLA Telemetry)"]
        OSM["OpenStreetMap Overpass API<br/>(Roads & Emergency Shelters)"]
        IMD["IMD CAP Alert Feeds<br/>(Official Meteorological Warnings)"]
        GEMINI["Google Generative AI<br/>(Gemini 2.0 Flash REST API)"]
        ESRI["ESRI World Imagery<br/>(Sub-meter Satellite Tiles)"]
    end

    subgraph DisastraaaCore["Disastraaa Core Platform (Next.js 15 + TypeScript)"]
        INGEST["Ingestion Orchestrator & Adapters<br/>(src/lib/platform/pipeline.ts)"]
        RISK["Deterministic Multi-Hazard Engine<br/>(src/lib/risk/multiHazard/)"]
        ML["Experimental ML Early Warning<br/>(src/lib/ml/predictionService.ts)"]
        AI["AI Disaster Intelligence Service<br/>(src/lib/intelligence/summaryService.ts)"]
        ROUTE["A* Topological Routing Engine<br/>(src/lib/routing/engine.ts)"]
        MAP["MapLibre Geospatial Visualizer<br/>(src/components/map/DisasterMap.tsx)"]
        AUTH["Role-Based Edge Gatekeeper<br/>(src/middleware.ts)"]
    end

    subgraph Persistence["Storage & Database Infrastructure"]
        NEON["Tier 1: Neon Serverless PostgreSQL 18.6<br/>(PostGIS 3.6 Spatial Database)"]
        OBJ["Tier 2/3: Content-Addressable Storage<br/>(.storage/ & Cloud S3/R2 Abstraction)"]
    end

    subgraph Users["Operational Stakeholders"]
        PUBLIC["Public Citizens (Level 6)<br/>(/dashboard, /travel, /map)"]
        FIELD["Field Responders (Level 5)<br/>(/incidents, /reports)"]
        DISTRICT["District / State EOCs (Levels 4 & 3)<br/>(/operations, /planning, /personnel)"]
        NATIONAL["National & Super Admins (Levels 2 & 1)<br/>(/analytics, /governance)"]
    end

    OM --> INGEST
    GLOFAS --> INGEST
    CWC --> INGEST
    OSM --> INGEST
    IMD --> INGEST
    ESRI --> MAP

    INGEST --> NEON
    INGEST --> OBJ

    NEON --> RISK
    NEON --> ROUTE
    OBJ --> ML

    RISK --> AI
    ML --> AI
    GEMINI <--> AI

    RISK --> MAP
    ROUTE --> MAP

    AUTH --> PUBLIC
    AUTH --> FIELD
    AUTH --> DISTRICT
    AUTH --> NATIONAL
```

---

## 2. VERIFIED CURRENT ARCHITECTURE

The active implementation combines Next.js App Router server endpoints, client-side MapLibre visualizations, an Edge security middleware gate, and a three-tier storage engine:

```mermaid
flowchart TB
    subgraph ClientTier["Client Tier (React 18 SPA / Next.js)"]
        UI_DASH["Command Center Dashboard<br/>(/dashboard)"]
        UI_MAP["Geospatial Hazard Map<br/>(/map - MapLibre GL)"]
        UI_SIM["Disaster Simulator<br/>(/simulator)"]
        UI_ASST["AI Intelligence Assistant<br/>(/assistant)"]
        UI_TRAVEL["Road Safety & Route Planner<br/>(/travel)"]
    end

    subgraph EdgeTier["Edge Middleware Gatekeeper"]
        MW["src/middleware.ts<br/>- HMAC Cookie Signature Check<br/>- Role Access Policy<br/>- Cold-Visitor Quarantine"]
    end

    subgraph ServerTier["Server Tier (Node.js / Next.js Route Handlers)"]
        API_STATS["/api/stats<br/>Operational KPI Aggregator"]
        API_INTEL["/api/intelligence/summary<br/>Disaster Intelligence Engine"]
        API_ASST["/api/assistant<br/>Role-Gated AI Assistant"]
        API_ROADS["/api/roads<br/>Overpass Ingestion & Graph Builder"]
        API_AUTH["/api/auth/*<br/>Session & Credential Manager"]
        API_SYNC["/api/ingestion/sync<br/>Scheduled Pipeline Trigger"]
    end

    subgraph ServiceLayer["Domain Services & Computational Engines"]
        ENG_RISK["Deterministic Risk Engines<br/>- Flood (Piecewise Linear)<br/>- Cyclone (Wind & Surge)<br/>- Multi-Hazard Composite"]
        ENG_ML["ML Early Warning Predictor<br/>- L2 Logistic Regression<br/>- SHA-256 Verified Artifacts"]
        ENG_ROUTE["A* Routing Engine<br/>- Shortest / Safest / Alternative<br/>- Hazard Cost Multipliers"]
        ENG_AI["Grounded AI Engine<br/>- Gemini 2.0 Flash<br/>- Rule-Based Fallback"]
    end

    subgraph StorageTier["Hybrid Multi-Tier Storage"]
        DB_POSTGIS["Tier 1: Neon PostgreSQL + PostGIS<br/>- users, alerts, weather_telemetry<br/>- road_segments, shelters, incidents<br/>- ingestion_job_runs, dataset_manifests"]
        STORAGE_OBJ["Tier 2/3: Object Storage<br/>- Raw JSON Payloads<br/>- Model Checksums (.storage/models/)<br/>- ML Parquet / GZ Datasets"]
    end

    ClientTier --> MW
    MW --> ServerTier

    API_STATS --> DB_POSTGIS
    API_INTEL --> ServiceLayer
    API_ASST --> ServiceLayer
    API_ROADS --> DB_POSTGIS
    API_SYNC --> StorageTier

    ServiceLayer --> DB_POSTGIS
    ServiceLayer --> STORAGE_OBJ
```

---

## 3. COMPONENT & REPOSITORY LAYER SPECIFICATION

```
src/
├── app/                          # Next.js 15 App Router Routes (48 compiled pages)
│   ├── (dashboard)/              # Authority-Gated Operational Views
│   │   ├── analytics/            # National Hazard Overview (Level 2)
│   │   ├── assistant/            # Dedicated AI Assistant Interface
│   │   ├── dashboard/            # Multi-Hazard Command Center (Level 4/3)
│   │   ├── evacuation/           # Evacuation Operations Management
│   │   ├── governance/           # Super Admin Audit & System Logs (Level 1)
│   │   ├── historical/           # Disaster Archives & Trends
│   │   ├── incidents/            # Emergency Incident Management
│   │   ├── operations/           # Live EOC Dispatch & Task Force Tracking
│   │   ├── personnel/            # Departmental User Management & Invites
│   │   ├── planning/             # Resource Allocation & Preparedness
│   │   ├── reports/manage/       # Citizen Report Verification Workflow
│   │   ├── resources/            # Inventory & Emergency Supply Tracking
│   │   ├── settings/             # System Profile & API Configuration
│   │   ├── simulator/            # Multi-Hazard Scenario Simulator
│   │   └── state/                # State Authority Aggregations (Level 3)
│   ├── (public)/                 # Public Citizen & Open Access Routes
│   │   ├── alerts/               # Authoritative Broadcast Warnings
│   │   ├── map/                  # Full-Screen Interactive GIS Map
│   │   ├── reports/              # Citizen Report Submission Portal
│   │   ├── shelters/             # Emergency Shelter Finder & Capacities
│   │   └── travel/               # Road Safety & Evacuation Route Planner
│   └── api/                      # REST API Endpoints (Role-Gated & Authenticated)
├── components/                   # Modular UI Component Library
│   ├── demo/                     # REAL vs DEMO Isolation Badges & Persona Switchers
│   ├── evacuation/               # Evacuation Zone Cards & Shelter Allocations
│   ├── map/                      # MapLibre GL Wrappers, Basemap & Layer Controls
│   ├── operations/               # Command Center Tactical Cards & KPI Grids
│   ├── reports/                  # Citizen Report Forms & Verification Badges
│   └── routing/                  # Route Planner Forms, Elevation & Hazard Diffs
├── config/                       # Nav Menus, Basemap Tile Definitions, System Constants
├── data/                         # Hardcoded Prototype Fixtures & Demo Datasets (Isolated)
├── lib/                          # Core Domain Logic & Systems Engineering
│   ├── ai/                       # Gemini 2.0 Flash Client, Prompts, Sanitize & Intent Detection
│   ├── alerts/                   # Alert Processing, IMD CAP Parsers & Storage
│   ├── auth/                     # Scrypt Password Hashing, HMAC Sessions, Role Policy
│   ├── db/                       # Neon Serverless Client, SQL Schema & PostGIS Migrations
│   ├── geo/                      # Coordinate Transforms, Haversine, Bounding Box Guards
│   ├── hydrology/                # CWC India-WRIS Client & GloFAS Flood Ingestion
│   ├── intelligence/             # Grounded Snapshot Builder & AI Summary Service
│   ├── ml/                       # Features, Scaler, Models, Evaluator, Registry, Predictor
│   ├── platform/                 # Reusable Ingestion Pipeline, Registry, Retention, Storage
│   ├── risk/                     # Deterministic Flood, Cyclone, Multi-Hazard & Journey Engines
│   ├── roads/                    # OSM Road Store, Overpass Ingestion, Travel Risk Scoring
│   ├── routing/                  # Deterministic A* Graph Search & Multi-Path Cost Evaluators
│   ├── shelters/                 # Shelter Store, Capacity Tracking & Overpass Ingestion
│   └── weather/                  # Open-Meteo Normalized Weather Provider & Neon Store
└── types/                        # Enterprise TypeScript Domain Contracts
```

---

## 4. END-TO-END DATA PROCESSING PIPELINE

```mermaid
sequenceDiagram
    autonumber
    actor Sensor as Public Sensors / APIs
    participant Pipeline as Ingestion Pipeline (pipeline.ts)
    participant Validator as Bounds & PostGIS Validator
    participant DB as Neon PostgreSQL (Tier 1)
    participant Storage as Object Storage (Tier 2/3)
    participant RiskEngine as Risk Engine / ML Model
    participant AI as AI Intelligence (summaryService.ts)
    actor Operator as EOC Duty Officer (Dashboard)

    Sensor->>Pipeline: Fetch raw observation stream
    Pipeline->>Validator: Inspect coordinates, timestamps & units
    alt Invalid bounds or malformed
        Validator-->>Pipeline: Reject & record anomaly in ingestion_job_runs
    else Valid observation
        Validator->>Storage: Store raw immutable payload (SHA-256 key)
        Validator->>DB: Upsert normalized record (Idempotent ON CONFLICT)
        DB-->>Pipeline: Success confirmation
    end

    Pipeline->>RiskEngine: Execute deterministic factor scoring
    RiskEngine->>RiskEngine: Compute weighted multi-hazard score (0-100)
    opt Station is Kesinga 022-MDBURLA
        RiskEngine->>RiskEngine: Run L2 Logistic Regression (+6h Exceedance)
    end

    RiskEngine->>AI: Assemble Grounded Disaster Snapshot
    AI->>AI: Build passive XML context payload
    AI->>AI: Invoke Gemini 2.0 Flash (or Rule-Based Fallback)
    AI->>DB: Cache validated JSON summary (TTL 30m)
    AI-->>Operator: Display verified intelligence & sensor limitations
```

---

## 5. PROPOSED FUTURE PRODUCTION ARCHITECTURE

To transition Disastraaa from a hackathon prototype to an enterprise-grade statutory disaster operations platform, the following target architecture is proposed:

```mermaid
graph TD
    subgraph NationalFeeds["National & Satellite Feeds"]
        SACHET["NDMA SACHET National Alert Bus<br/>(Kafka / MQTT Push)"]
        BHUVAN["ISRO Bhuvan Satellite Portal<br/>(SAR Flood Extents GeoTIFF)"]
        CWC_RT["CWC Telemetry Webhooks<br/>(1-Hour High Frequency API)"]
        IMD_RADAR["IMD Doppler Weather Radar<br/>(Precipitation Reflectivity)"]
    end

    subgraph IngestionCluster["High-Throughput Ingestion Workers"]
        WORKERS["Distributed Celery / Temporal Workers<br/>(Backoff, Idempotency & Dead-Letter Queues)"]
    end

    subgraph DataLakehouse["Enterprise Spatial Lakehouse"]
        POSTGIS_CLUSTER["PostgreSQL / PostGIS Read-Replicas<br/>(Sub-second Operational Geospatial Queries)"]
        ICEBERG["Apache Iceberg / Cloud Object Storage<br/>(Multi-Year Hydro-Meteorological Lakehouse)"]
        VALKEY["Redis / Valkey Distributed Cluster<br/>(Sub-10ms Live Telemetry Cache)"]
    end

    subgraph AdvancedMLOps["Operational AI / MLOps Layer"]
        FEATURE_STORE["Feast Feature Store<br/>(Point-in-Time Temporal Joins)"]
        HYDRAULIC["2D Hydrodynamic Models (HEC-RAS / LISFLOOD)<br/>(Physics-Informed Inundation Simulation)"]
        ML_SERVING["Triton / ONNX Model Server<br/>(Real-Time Ensemble Exceedance Inference)"]
    end

    subgraph RealTimeDissemination["Multi-Channel Public Warning"]
        WS["WebSocket & SSE Push Server<br/>(Sub-second EOC Dashboard Updates)"]
        CELL_BROADCAST["Govt. Cell Broadcast Gateway<br/>(Location-Based SMS Evacuation Orders)"]
    end

    NationalFeeds --> WORKERS
    WORKERS --> POSTGIS_CLUSTER
    WORKERS --> ICEBERG
    WORKERS --> VALKEY

    ICEBERG --> FEATURE_STORE
    FEATURE_STORE --> ML_SERVING
    POSTGIS_CLUSTER --> HYDRAULIC

    VALKEY --> WS
    ML_SERVING --> WS
    HYDRAULIC --> WS
    WS --> CELL_BROADCAST
```
