/**
 * Central Data-Source Registry
 *
 * Authoritative catalogue of all ingested, forecasted, reference, and derived
 * datasets across the Disastraaa platform. Enforces classification, provenance,
 * retention boundaries, licensing rights, and storage tier assignments.
 */

import type { DataCategory, RegisteredDataSource } from './types';

export const DATA_SOURCE_REGISTRY: Record<string, RegisteredDataSource> = {
  'open-meteo-weather': {
    id: 'open-meteo-weather',
    name: 'Open-Meteo High-Resolution Numerical Weather Blend',
    provider: 'Open-Meteo GmbH / ECMWF & DWD & GFS',
    dataset: 'v1/forecast & historical-forecast',
    category: 'A_CURRENT_OPERATIONAL',
    nature: 'OBSERVATION',
    spatialCoverage: {
      region: 'Odisha State & Focused Districts (Kalahandi, Khordha, Cuttack, Puri)',
      bbox: [82.5, 17.8, 87.5, 22.6],
      crs: 'EPSG:4326',
      resolutionMeters: 2500, // ~2.5km resolution
    },
    expectedUpdateFrequency: '1 hour',
    freshnessPolicy: {
      maxAgeMinutes: 90,
      staleThresholdMinutes: 180,
    },
    validationRules: [
      'Temperature in [-15, 60] Celsius',
      'Precipitation >= 0 mm',
      'Wind speed in [0, 350] km/h',
      'Surface pressure in [850, 1085] hPa',
      'Coordinates strictly within India subcontinent bbox',
    ],
    unitsAndSchema: {
      temperature_c: 'Celsius (°C)',
      precipitation_mm: 'Millimeters (mm)',
      wind_speed_kmh: 'Kilometers per hour (km/h)',
      surface_pressure_hpa: 'Hectopascals (hPa)',
      relative_humidity: 'Percentage (%)',
      observed_at: 'ISO 8601 UTC timestamp',
    },
    license: {
      license: 'Creative Commons Attribution 4.0 International (CC BY 4.0) & Open-Meteo Terms',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Keep rolling 72h operational state in Neon; rollup into daily aggregates; archive raw payloads in Tier 2 Object Store',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 72,
      archiveToTier2: true,
      compactionStrategy: 'ROLLUP_DAILY',
    },
    reliabilityScore: 0.94,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'imd-cap-alerts': {
    id: 'imd-cap-alerts',
    name: 'India Meteorological Department (IMD) Common Alerting Protocol',
    provider: 'IMD / NDMA Sachet National Disaster Alert Portal',
    dataset: 'CAP v1.2 XML / GeoJSON Feeds',
    category: 'A_CURRENT_OPERATIONAL',
    nature: 'OBSERVATION',
    spatialCoverage: {
      region: 'All Odisha Meteorological Subdivisions & Coastal Districts',
      bbox: [81.0, 17.5, 87.8, 23.0],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: '15 minutes',
    freshnessPolicy: {
      maxAgeMinutes: 60,
      staleThresholdMinutes: 180,
    },
    validationRules: [
      'Identifier must be unique CAP ID',
      'Sent timestamp <= current UTC',
      'Severity in [Minor, Moderate, Severe, Extreme, Unknown]',
      'Urgency in [Past, Future, Expected, Immediate, Unknown]',
      'Certainty in [Unlikely, Possible, Likely, Observed, Unknown]',
    ],
    unitsAndSchema: {
      cap_identifier: 'String UUID/OASIS CAP URI',
      headline: 'Localized English/Odia title string',
      severity: 'CAP Severity Enum',
      effective: 'ISO 8601 UTC timestamp',
      expires: 'ISO 8601 UTC timestamp',
      area_desc: 'Target district/block string',
    },
    license: {
      license: 'Government of India Open Data License (GODL-India)',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Permanent alert history in Neon (auditable government record); raw CAP XML stored in Tier 2 Object Store',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 8760, // 1 year queryable in Neon
      archiveToTier2: true,
      compactionStrategy: 'SNAPSHOT_LATEST',
    },
    reliabilityScore: 0.99,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'cwc-gauge-telemetry': {
    id: 'cwc-gauge-telemetry',
    name: 'Central Water Commission (CWC) River Gauge Telemetry',
    provider: 'Central Water Commission (India-WRIS / NWIC)',
    dataset: 'Hydrology Gauge Discharge & Water Level',
    category: 'A_CURRENT_OPERATIONAL',
    nature: 'OBSERVATION',
    spatialCoverage: {
      region: 'Kalahandi Basin (Tel River, Hati River, Kesinga Gauge)',
      bbox: [82.8, 19.5, 83.6, 20.4],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: '1 hour',
    freshnessPolicy: {
      maxAgeMinutes: 180,
      staleThresholdMinutes: 720,
    },
    validationRules: [
      'Gauge level in [100.0, 450.0] meters MSL',
      'Discharge >= 0.0 m³/s',
      'Warning stage < Danger stage',
    ],
    unitsAndSchema: {
      gauge_level_m: 'Meters above Mean Sea Level (m MSL)',
      discharge_cumec: 'Cubic meters per second (m³/s)',
      trend: 'RISING | FALLING | STEADY',
      warning_level_m: 'Meters MSL',
      danger_level_m: 'Meters MSL',
    },
    license: {
      license: 'India-WRIS Open Data / Ministry of Jal Shakti',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Rolling 72h observations in Neon; permanent telemetry archives in Tier 2 Parquet/JSONL',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 72,
      archiveToTier2: true,
      compactionStrategy: 'ROLLUP_DAILY',
    },
    reliabilityScore: 0.96,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'glofas-river-forecast': {
    id: 'glofas-river-forecast',
    name: 'Copernicus Global Flood Awareness System (GloFAS)',
    provider: 'ECMWF / Copernicus Emergency Management Service',
    dataset: 'River Discharge Ensemble Prediction (5-Day Outlook)',
    category: 'C_FORECAST_MODEL',
    nature: 'MODEL_OUTPUT',
    spatialCoverage: {
      region: 'Mahanadi & Tel River Basins, Odisha',
      bbox: [82.0, 18.0, 87.0, 22.0],
      crs: 'EPSG:4326',
      resolutionMeters: 5000,
    },
    expectedUpdateFrequency: '24 hours',
    freshnessPolicy: {
      maxAgeMinutes: 1800,
      staleThresholdMinutes: 2880,
    },
    validationRules: [
      'Forecast horizons between +1h and +120h',
      'Discharge probability in [0.0, 1.0]',
      'Forecast timestamps must be strictly in the future relative to issue_time',
    ],
    unitsAndSchema: {
      lead_time_hours: 'Hours ahead',
      predicted_discharge_m3s: 'Cubic meters per second',
      exceedance_probability: 'Decimal 0.0 to 1.0',
    },
    license: {
      license: 'Copernicus Open Access Policy',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Retain active forecast run in Neon; archive historical model predictions in Tier 2',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 120, // 5 days
      archiveToTier2: true,
      compactionStrategy: 'DROP_AFTER_EXPIRY',
    },
    reliabilityScore: 0.88,
    verificationStatus: 'EXPERIMENTAL_MODEL',
  },

  'nasa-eonet-hazards': {
    id: 'nasa-eonet-hazards',
    name: 'NASA Earth Observatory Natural Event Tracker (EONET v3)',
    provider: 'NASA EOSDIS',
    dataset: 'EONET v3 GeoJSON Events',
    category: 'A_CURRENT_OPERATIONAL',
    nature: 'OBSERVATION',
    spatialCoverage: {
      region: 'South Asia / Indian Ocean / Bay of Bengal',
      bbox: [65.0, 5.0, 95.0, 30.0],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: '2 hours',
    freshnessPolicy: {
      maxAgeMinutes: 240,
      staleThresholdMinutes: 720,
    },
    validationRules: [
      'Event category in [severeStorms, seaLakeIce, wildfires, volcanoes, floods]',
      'Valid GeoJSON Geometry (Point or Polygon)',
      'Event date valid ISO 8601',
    ],
    unitsAndSchema: {
      event_id: 'NASA EONET identifier string',
      category: 'Hazard Category',
      title: 'Descriptive title',
      coordinates: '[longitude, latitude]',
    },
    license: {
      license: 'NASA Open Data Policy (Public Domain / US Gov)',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Save active events to Neon `hazards` table; archive raw GeoJSON payload to Tier 2 Object Store',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 720, // 30 days active
      archiveToTier2: true,
      compactionStrategy: 'SNAPSHOT_LATEST',
    },
    reliabilityScore: 0.95,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'nasa-firms-hotspots': {
    id: 'nasa-firms-hotspots',
    name: 'NASA Fire Information for Resource Management System (FIRMS)',
    provider: 'NASA LANCE / VIIRS & MODIS',
    dataset: 'Active Fire / Thermal Anomaly Hotspots (SUOMI NPP / NOAA-20)',
    category: 'A_CURRENT_OPERATIONAL',
    nature: 'OBSERVATION',
    spatialCoverage: {
      region: 'Odisha State Forest & Rural Corridors',
      bbox: [81.5, 17.5, 87.5, 22.8],
      crs: 'EPSG:4326',
      resolutionMeters: 375, // VIIRS 375m
    },
    expectedUpdateFrequency: '6 hours',
    freshnessPolicy: {
      maxAgeMinutes: 480,
      staleThresholdMinutes: 1440,
    },
    validationRules: [
      'Brightness temperature in [250, 500] Kelvin',
      'Confidence in [nominal, low, high, 0-100]',
      'FRP (Fire Radiative Power) >= 0.0 MW',
    ],
    unitsAndSchema: {
      brightness_kelvin: 'Kelvin (K)',
      frp_mw: 'Megawatts (MW)',
      confidence: 'Confidence classification string or integer',
      acq_date: 'YYYY-MM-DD',
      acq_time: 'HHMM UTC',
    },
    license: {
      license: 'NASA Open Data Policy',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Active 24h hotspots in Neon; raw pass archives to Tier 2 Object Store',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 48,
      archiveToTier2: true,
      compactionStrategy: 'DROP_AFTER_EXPIRY',
    },
    reliabilityScore: 0.92,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'osm-odisha-roads': {
    id: 'osm-odisha-roads',
    name: 'OpenStreetMap Odisha Highway & Road Infrastructure',
    provider: 'OpenStreetMap Contributors (via Overpass API)',
    dataset: 'Highways, Bridges, Trunk, Primary, Secondary Lines',
    category: 'D_STATIC_REFERENCE',
    nature: 'OBSERVATION',
    spatialCoverage: {
      region: 'Odisha State / Kalahandi Focused Corridor',
      bbox: [82.5, 19.2, 83.8, 20.6],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: 'Weekly / On Road Incident',
    freshnessPolicy: {
      maxAgeMinutes: 10080, // 7 days
      staleThresholdMinutes: 43200,
    },
    validationRules: [
      'Valid PostGIS LineString geometry',
      'Highway classification tag present',
      'Segment length > 0 meters',
    ],
    unitsAndSchema: {
      osm_way_id: 'OSM Way identifier',
      highway_type: 'trunk | primary | secondary | tertiary | residential',
      surface: 'paved | unpaved | asphalt',
      bridge: 'boolean',
      flood_vulnerability: 'LOW | MEDIUM | HIGH | PASSABLE | BLOCKED',
    },
    license: {
      license: 'Open Database License (ODbL) v1.0',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Persistent road geometries in Neon PostGIS with spatial index; full snapshot in Tier 2 GeoJSON',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 87600, // 10 years (static reference)
      archiveToTier2: true,
      compactionStrategy: 'PERMANENT_IMMUTABLE',
    },
    reliabilityScore: 0.93,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'osm-odisha-shelters': {
    id: 'osm-odisha-shelters',
    name: 'OpenStreetMap Odisha Cyclone & Flood Evacuation Shelters',
    provider: 'OpenStreetMap Contributors / OSDMA Ground Amenities',
    dataset: 'Emergency Shelters, Cyclone Shelters, School Relief Hubs',
    category: 'D_STATIC_REFERENCE',
    nature: 'OBSERVATION',
    spatialCoverage: {
      region: 'Odisha Coastal & Kalahandi Riverine Hubs',
      bbox: [82.5, 18.0, 87.5, 22.5],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: 'Monthly / On Emergency Setup',
    freshnessPolicy: {
      maxAgeMinutes: 43200, // 30 days
      staleThresholdMinutes: 129600,
    },
    validationRules: [
      'Capacity >= 0 persons',
      'Valid PostGIS Point geometry',
      'Status in [OPEN, STANDBY, FULL, CLOSED]',
    ],
    unitsAndSchema: {
      shelter_name: 'Name string',
      capacity: 'Total beds/occupants capacity',
      current_occupancy: 'Number of persons currently accommodated',
      has_generator: 'boolean',
      has_water_tank: 'boolean',
    },
    license: {
      license: 'Open Database License (ODbL) v1.0',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Persistent shelters table in Neon PostGIS; immutable backup in Tier 2',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 87600,
      archiveToTier2: true,
      compactionStrategy: 'PERMANENT_IMMUTABLE',
    },
    reliabilityScore: 0.95,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'odisha-historical-disasters': {
    id: 'odisha-historical-disasters',
    name: 'Odisha Historical Disaster Chronology & Ground-Truth Outcomes',
    provider: 'Disastraaa Curated Official Records / OSDMA Archives / Census of India',
    dataset: '1999 Super Cyclone, Phailin 2013, Fani 2019, 2008 Mahanadi Floods',
    category: 'B_HISTORICAL_ARCHIVE',
    nature: 'HISTORICAL_ARCHIVE',
    spatialCoverage: {
      region: 'Odisha State (30 Districts)',
      bbox: [81.4, 17.8, 87.5, 22.6],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: 'Static Historical Archive',
    freshnessPolicy: {
      maxAgeMinutes: 525600, // 1 year
      staleThresholdMinutes: 1051200,
    },
    validationRules: [
      'Year in [1950, 2025]',
      'Affected population >= 0',
      'Damage statistics non-negative',
      'Documented authoritative source attribution',
    ],
    unitsAndSchema: {
      event_name: 'Official disaster name',
      year: 'Calendar year integer',
      severity: 'LOW | MODERATE | HIGH | CRITICAL',
      affected_population: 'Count of persons',
      buildings_affected: 'Count of structures',
      peak_wind_kmh: 'Peak sustained wind in km/h',
      rainfall_mm: 'Total event precipitation in mm',
    },
    license: {
      license: 'Public Domain / Research & Disaster Defense Fair Use',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Permanent records in Neon `historical_disaster_records` and Tier 2/3 ML benchmark repository',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 87600,
      archiveToTier2: true,
      compactionStrategy: 'PERMANENT_IMMUTABLE',
    },
    reliabilityScore: 0.98,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },

  'disastraaa-citizen-reports': {
    id: 'disastraaa-citizen-reports',
    name: 'Disastraaa Ground Truth Field & Citizen Reports',
    provider: 'Disastraaa Citizen Incident Portal & Field Officers',
    dataset: 'Geo-tagged Crowdsourced Disaster Observations',
    category: 'E_CITIZEN_REPORTS',
    nature: 'CITIZEN_REPORT',
    spatialCoverage: {
      region: 'Odisha Operational Districts',
      bbox: [81.5, 17.5, 87.5, 23.0],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: 'On Submission (Real-Time Push)',
    freshnessPolicy: {
      maxAgeMinutes: 60,
      staleThresholdMinutes: 1440,
    },
    validationRules: [
      'Must contain verified geo-coordinates within active districts',
      'Hazard category must be valid enum',
      'Verification workflow state in [PENDING, VERIFIED, REJECTED]',
    ],
    unitsAndSchema: {
      report_id: 'UUID',
      hazard_type: 'FLOOD | CYCLONE | LANDSLIDE | FIRE',
      description: 'Text narrative',
      photo_storage_key: 'Tier 2 object storage key',
      verification_status: 'PENDING | VERIFIED | REJECTED',
    },
    license: {
      license: 'Disastraaa Contributor License Agreement (Confidential/Operational)',
      permitsArchival: true,
      permitsRedistribution: false,
      retentionPolicy: 'Metadata and audit history kept in Neon; media attachments stored in Tier 2 Object Store',
    },
    storageDestination: 'TIER_1_AND_2_HYBRID',
    retention: {
      tier1RetentionHours: 8760,
      archiveToTier2: true,
      compactionStrategy: 'PERMANENT_IMMUTABLE',
    },
    reliabilityScore: 0.75, // Requires field verification
    verificationStatus: 'UNVERIFIED_CROWD',
  },

  'derived-weather-risk-zones': {
    id: 'derived-weather-risk-zones',
    name: 'Deterministic Multi-Hazard Weather Risk Zones',
    provider: 'Disastraaa Risk Engine (Flood, Cyclone, Heat, Cascading)',
    dataset: 'Derived Operational Risk Scores & Impact Sectors',
    category: 'F_DERIVED_ML',
    nature: 'DERIVED_FEATURE',
    spatialCoverage: {
      region: 'Odisha State 30 Districts & Coastal Corridor',
      bbox: [81.4, 17.8, 87.5, 22.6],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: '1 hour / On New Telemetry',
    freshnessPolicy: {
      maxAgeMinutes: 90,
      staleThresholdMinutes: 180,
    },
    validationRules: [
      'Risk score strictly in [0, 100]',
      'Severity strictly in [LOW, MODERATE, HIGH, CRITICAL]',
      'Data provenance contract verified (MEASURED_OBSERVATION vs MODEL_DERIVED)',
    ],
    unitsAndSchema: {
      sector_id: 'District or Block code',
      risk_score: 'Integer 0-100',
      confidence_score: 'Decimal 0.0-1.0',
      data_mode: 'MEASURED_OBSERVATION | MODEL_DERIVED',
    },
    license: {
      license: 'Disastraaa Platform Internal Derivative',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Active 24h risk state in Neon; hourly risk scores rolled up into daily summary in Neon and Tier 3 Parquet',
    },
    storageDestination: 'TIER_1_NEON',
    retention: {
      tier1RetentionHours: 72,
      archiveToTier2: true,
      compactionStrategy: 'ROLLUP_DAILY',
    },
    reliabilityScore: 0.96,
    verificationStatus: 'EXPERIMENTAL_MODEL',
  },

  'ml-flood-inundation-benchmark': {
    id: 'ml-flood-inundation-benchmark',
    name: 'Disastraaa Kalahandi Riverine Flood Inundation Benchmark',
    provider: 'Disastraaa ML Platform Engineering',
    dataset: 'v1.0.0 Supervised Flood Inundation Feature Matrix',
    category: 'F_DERIVED_ML',
    nature: 'DERIVED_FEATURE',
    spatialCoverage: {
      region: 'Kalahandi Basin (Kesinga, Bhawanipatna, Junagarh, Dharamgarh)',
      bbox: [82.5, 19.3, 83.5, 20.4],
      crs: 'EPSG:4326',
    },
    expectedUpdateFrequency: 'On Model Training Release',
    freshnessPolicy: {
      maxAgeMinutes: 525600,
      staleThresholdMinutes: 1051200,
    },
    validationRules: [
      'Temporal split: Train <= 2021-12-31, Val 2022-01-01 to 2023-12-31, Test >= 2024-01-01',
      'No future telemetry in feature vector (zero leakage guarantee)',
      'Verified binary target: gauge_stage_exceeded (1 = Danger Stage Exceeded, 0 = Normal)',
    ],
    unitsAndSchema: {
      timestamp: 'ISO 8601 UTC',
      district: 'Kalahandi',
      rain_24h_mm: 'Precipitation accumulation past 24 hours',
      rain_72h_mm: 'Precipitation accumulation past 72 hours',
      gauge_level_m: 'Kesinga gauge stage (m MSL)',
      upstream_discharge_cumec: 'Cubic meters per second',
      target_exceeded_danger_stage: '0 or 1 binary integer',
    },
    license: {
      license: 'Disastraaa ML Benchmark License (Open for humanitarian modeling)',
      permitsArchival: true,
      permitsRedistribution: true,
      retentionPolicy: 'Manifest stored in Neon `dataset_manifests`; full Parquet dataset archived in Tier 3 Object Store',
    },
    storageDestination: 'TIER_3_PARQUET_ANALYTICS',
    retention: {
      tier1RetentionHours: 87600,
      archiveToTier2: true,
      compactionStrategy: 'PERMANENT_IMMUTABLE',
    },
    reliabilityScore: 0.97,
    verificationStatus: 'VERIFIED_OFFICIAL',
  },
};

/**
 * Returns a registered data source by its identifier.
 */
export function getRegisteredDataSource(sourceId: string): RegisteredDataSource | null {
  return DATA_SOURCE_REGISTRY[sourceId] || null;
}

/**
 * Returns all registered sources filtered by data category.
 */
export function getDataSourcesByCategory(category: DataCategory): RegisteredDataSource[] {
  return Object.values(DATA_SOURCE_REGISTRY).filter((s) => s.category === category);
}

/**
 * Returns all sources mapped to a specific storage tier.
 */
export function getDataSourcesByTier(tier: string): RegisteredDataSource[] {
  return Object.values(DATA_SOURCE_REGISTRY).filter(
    (s) => s.storageDestination === tier || s.storageDestination === 'TIER_1_AND_2_HYBRID',
  );
}

/**
 * Validates whether an incoming payload adheres to the registered source's freshness policy.
 */
export function checkSourceFreshness(
  sourceId: string,
  observationTimestamp: string,
): { isFresh: boolean; isStale: boolean; ageMinutes: number } {
  const source = getRegisteredDataSource(sourceId);
  const now = Date.now();
  const obsTime = new Date(observationTimestamp).getTime();
  const ageMinutes = Math.max(0, Math.round((now - obsTime) / (1000 * 60)));

  if (!source) {
    return { isFresh: true, isStale: false, ageMinutes };
  }

  const isFresh = ageMinutes <= source.freshnessPolicy.maxAgeMinutes;
  const isStale = ageMinutes >= source.freshnessPolicy.staleThresholdMinutes;

  return { isFresh, isStale, ageMinutes };
}
