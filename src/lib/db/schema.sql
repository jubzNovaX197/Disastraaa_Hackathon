-- ==============================================================================
-- DISASTRAAA ENTERPRISE DATABASE SCHEMA
-- PostgreSQL + PostGIS Production Specification
--
-- Strict Real Operation Mode Data Architecture
-- All real operational data (users, alerts, reports, incidents, hazards,
-- shelters, roads, resources, logs) are persisted here.
--
-- Demo / Simulation mode data is isolated in application memory / fixtures.
-- ==============================================================================

-- Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. ROLES & PERMISSIONS ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'SUPER_ADMIN',
    'NATIONAL_AUTHORITY',
    'STATE_AUTHORITY',
    'DISTRICT_OFFICER',
    'FIELD_RESPONDER',
    'CITIZEN'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE data_environment_enum AS ENUM (
    'REAL',
    'DEMO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 2. USERS & CREDENTIALS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'CITIZEN',
  authority_id VARCHAR(100),
  department VARCHAR(255),
  geographic_scope VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── 3. CANONICAL REGIONS & LOCATIONS (DATA-DRIVEN HIERARCHY) ────────────────

DO $$ BEGIN
  CREATE TYPE admin_level_enum AS ENUM (
    'COUNTRY',
    'STATE',
    'DISTRICT',
    'BLOCK',
    'VILLAGE',
    'LOCALITY'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS regions (
  id VARCHAR(100) PRIMARY KEY,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  block VARCHAR(100),
  locality VARCHAR(255),
  level admin_level_enum NOT NULL,
  parent_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  centroid GEOMETRY(Point, 4326),
  boundary GEOMETRY(MultiPolygon, 4326),
  population INTEGER DEFAULT 0,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_state_district ON regions(state, district);
CREATE INDEX IF NOT EXISTS idx_regions_level ON regions(level);
CREATE INDEX IF NOT EXISTS idx_regions_centroid ON regions USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_regions_boundary ON regions USING GIST(boundary);

-- ── 4. HAZARDS & EARLY WARNINGS ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE hazard_type_enum AS ENUM (
    'CYCLONE',
    'FLOOD',
    'URBAN_FLOOD',
    'LANDSLIDE',
    'STORM_SURGE',
    'HEATWAVE',
    'LIGHTNING',
    'DROUGHT',
    'EARTHQUAKE',
    'MULTI_HAZARD'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE severity_enum AS ENUM (
    'LOW',
    'MODERATE',
    'HIGH',
    'CRITICAL'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hazard_status_enum AS ENUM (
    'WATCH',
    'WARNING',
    'ACTIVE',
    'PEAK',
    'RECEDING',
    'DISSIPATED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS hazards (
  id VARCHAR(100) PRIMARY KEY,
  hazard_type hazard_type_enum NOT NULL,
  severity severity_enum NOT NULL,
  status hazard_status_enum NOT NULL DEFAULT 'ACTIVE',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  centroid GEOMETRY(Point, 4326) NOT NULL,
  impact_zone GEOMETRY(MultiPolygon, 4326),
  source_agency VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hazards_type_severity ON hazards(hazard_type, severity);
CREATE INDEX IF NOT EXISTS idx_hazards_status ON hazards(status);
CREATE INDEX IF NOT EXISTS idx_hazards_district ON hazards(state, district);
CREATE INDEX IF NOT EXISTS idx_hazards_centroid ON hazards USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_hazards_impact_zone ON hazards USING GIST(impact_zone);

-- ── 5. OFFICIAL ALERTS & WARNING BROADCASTS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(100) PRIMARY KEY,
  hazard_id VARCHAR(100) REFERENCES hazards(id) ON DELETE SET NULL,
  hazard_type hazard_type_enum NOT NULL,
  severity severity_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  instruction TEXT,
  area_name VARCHAR(255) NOT NULL,
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  coordinates GEOMETRY(Point, 4326) NOT NULL,
  radius_km NUMERIC(6,2),
  source VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_state_district ON alerts(state, district);
CREATE INDEX IF NOT EXISTS idx_alerts_coordinates ON alerts USING GIST(coordinates);

-- ── 6. CITIZEN & FIELD GROUND REPORTS ────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE report_status_enum AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'COMMUNITY_CONFIRMED',
    'VERIFIED',
    'REJECTED',
    'ESCALATED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS citizen_reports (
  id VARCHAR(100) PRIMARY KEY,
  hazard_type hazard_type_enum NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  address VARCHAR(500) NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  block VARCHAR(100),
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  coordinates GEOMETRY(Point, 4326) NOT NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_name VARCHAR(255),
  reporter_phone VARCHAR(50),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  severity severity_enum NOT NULL DEFAULT 'MODERATE',
  status report_status_enum NOT NULL DEFAULT 'PENDING',
  preliminary_score INTEGER DEFAULT 50,
  evidence_urls JSONB DEFAULT '[]'::jsonb,
  confirmations_count INTEGER DEFAULT 0,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  blocked_road_info JSONB,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_state_district ON citizen_reports(state, district);
CREATE INDEX IF NOT EXISTS idx_reports_coordinates ON citizen_reports USING GIST(coordinates);

-- ── 7. INCIDENTS (VERIFIED AUTHORITY DISPATCHES) ─────────────────────────────

DO $$ BEGIN
  CREATE TYPE incident_status_enum AS ENUM (
    'NEW',
    'TRIAGED',
    'DISPATCHED',
    'ON_SCENE',
    'CONTAINED',
    'RESOLVED',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  hazard_type hazard_type_enum NOT NULL,
  severity severity_enum NOT NULL,
  status incident_status_enum NOT NULL DEFAULT 'NEW',
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  address VARCHAR(500) NOT NULL,
  coordinates GEOMETRY(Point, 4326) NOT NULL,
  origin_report_id VARCHAR(100) REFERENCES citizen_reports(id) ON DELETE SET NULL,
  assigned_team VARCHAR(255),
  command_notes TEXT,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_coordinates ON incidents USING GIST(coordinates);

-- ── 8. ROAD INTELLIGENCE & CORRIDOR DISRUPTIONS ─────────────────────────────

DO $$ BEGIN
  CREATE TYPE road_status_enum AS ENUM (
    'OPEN',
    'CAUTION',
    'PARTIALLY_BLOCKED',
    'BLOCKED',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS road_segments (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  route_number VARCHAR(50),
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  path_line GEOMETRY(LineString, 4326) NOT NULL,
  start_point GEOMETRY(Point, 4326),
  end_point GEOMETRY(Point, 4326),
  length_km NUMERIC(8,2) NOT NULL DEFAULT 0,
  status road_status_enum NOT NULL DEFAULT 'OPEN',
  blockage_type VARCHAR(100),
  blockage_cause VARCHAR(255),
  risk_score INTEGER NOT NULL DEFAULT 0,
  travel_minutes INTEGER NOT NULL DEFAULT 15,
  reported_at TIMESTAMPTZ,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roads_status ON road_segments(status);
CREATE INDEX IF NOT EXISTS idx_roads_path_line ON road_segments USING GIST(path_line);

-- ── 9. EMERGENCY SHELTERS & RELIEF CENTERS ──────────────────────────────────

DO $$ BEGIN
  CREATE TYPE shelter_status_enum AS ENUM (
    'OPEN',
    'FULL',
    'CLOSED',
    'STANDBY'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS shelters (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  coordinates GEOMETRY(Point, 4326) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100,
  occupancy INTEGER NOT NULL DEFAULT 0,
  status shelter_status_enum NOT NULL DEFAULT 'OPEN',
  contact_phone VARCHAR(50),
  has_medical BOOLEAN NOT NULL DEFAULT FALSE,
  has_food BOOLEAN NOT NULL DEFAULT FALSE,
  has_power BOOLEAN NOT NULL DEFAULT FALSE,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shelters_status ON shelters(status);
CREATE INDEX IF NOT EXISTS idx_shelters_coordinates ON shelters USING GIST(coordinates);

-- ── 10. RESOURCE INVENTORY & SUPPLY TELEMETRY ───────────────────────────────

CREATE TABLE IF NOT EXISTS resource_inventory (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  total_stock INTEGER NOT NULL DEFAULT 0,
  allocated_stock INTEGER NOT NULL DEFAULT 0,
  available_stock INTEGER NOT NULL DEFAULT 0,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  shelter_id VARCHAR(100) REFERENCES shelters(id) ON DELETE SET NULL,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_category ON resource_inventory(category);
CREATE INDEX IF NOT EXISTS idx_resources_district ON resource_inventory(state, district);

-- ── 11. OPERATIONAL & HISTORICAL DISASTER EVENTS ────────────────────────────

CREATE TABLE IF NOT EXISTS operational_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  severity severity_enum NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  coordinates GEOMETRY(Point, 4326),
  metadata JSONB DEFAULT '{}'::jsonb,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_disaster_records (
  id VARCHAR(100) PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  disaster_type hazard_type_enum NOT NULL,
  year INTEGER NOT NULL,
  date_formatted VARCHAR(50) NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  coordinates GEOMETRY(Point, 4326) NOT NULL,
  fatalities INTEGER DEFAULT 0,
  people_displaced INTEGER DEFAULT 0,
  economic_damage_inr_cr NUMERIC(12,2) DEFAULT 0,
  response_duration_days INTEGER DEFAULT 1,
  environment data_environment_enum NOT NULL DEFAULT 'REAL'
);

CREATE INDEX IF NOT EXISTS idx_historical_disaster_type ON historical_disaster_records(disaster_type);
CREATE INDEX IF NOT EXISTS idx_historical_state_district ON historical_disaster_records(state, district);

-- ── 12. AUDIT LOGS & ACTION ACCOUNTABILITY ───────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role user_role_enum,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  diff JSONB,
  ip_address VARCHAR(100),
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ── 13. WEATHER & HYDROMETEOROLOGICAL TELEMETRY ────────────────────────────

CREATE TABLE IF NOT EXISTS weather_telemetry (
  id VARCHAR(100) PRIMARY KEY,
  region_id VARCHAR(100) REFERENCES regions(id) ON DELETE SET NULL,
  location_name VARCHAR(255) NOT NULL,
  state VARCHAR(100),
  district VARCHAR(100),
  coordinates GEOMETRY(Point, 4326) NOT NULL,
  temperature_c NUMERIC(5,2) NOT NULL,
  relative_humidity_pct INTEGER NOT NULL,
  precipitation_mm NUMERIC(6,2) NOT NULL,
  wind_speed_kmh NUMERIC(6,2) NOT NULL,
  wind_direction_deg INTEGER,
  surface_pressure_hpa NUMERIC(7,2),
  weather_code INTEGER NOT NULL,
  weather_condition VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'Open-Meteo',
  observed_at TIMESTAMPTZ NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  freshness_status VARCHAR(50) NOT NULL DEFAULT 'LIVE',
  forecast_json JSONB DEFAULT '{}'::jsonb,
  environment data_environment_enum NOT NULL DEFAULT 'REAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_coordinates ON weather_telemetry USING GIST(coordinates);
CREATE INDEX IF NOT EXISTS idx_weather_observed_at ON weather_telemetry(observed_at);
CREATE INDEX IF NOT EXISTS idx_weather_district ON weather_telemetry(state, district);

