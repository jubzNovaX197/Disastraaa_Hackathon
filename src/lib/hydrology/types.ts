/**
 * Hydrological & River Telemetry Domain Types
 *
 * Sourced from:
 * - Central Water Commission (CWC, Ministry of Jal Shakti, Govt. of India) via India-WRIS
 * - Copernicus Global Flood Awareness System (GloFAS / ECMWF)
 */

export interface RiverGaugeObservation {
  stationCode: string; // e.g. "022-MDBURLA"
  stationName: string; // e.g. "Kesinga"
  stationType: string; // e.g. "Surface Water"
  river: string; // e.g. "Tel"
  majorBasin: string; // e.g. "Mahanadi"
  district: string; // e.g. "Kalahandi"
  state: string; // e.g. "Odisha"
  coordinates: [number, number]; // [lon, lat]
  waterLevelMslMeters: number; // Meters above Mean Sea Level (MSL)
  warningLevelMslMeters?: number;
  dangerLevelMslMeters?: number;
  unit: string; // e.g. "m"
  observedAt: string; // ISO 8601
  retrievedAt: string; // ISO 8601
  source: string; // "Central Water Commission (India-WRIS)"
  agency: string; // "CWC"
  dataAcquisitionMode?: string; // "Telemetric" | "Manual"
  freshnessStatus: 'LIVE' | 'ARCHIVED' | 'STALE' | 'UNAVAILABLE';
}

export interface RiverDischargeObservation {
  coordinates: [number, number]; // [lon, lat]
  district: string;
  state: string;
  dischargeM3s: number; // m³/s
  dischargeMaxM3s?: number;
  dischargeMinM3s?: number;
  observedAt: string; // ISO date "YYYY-MM-DD"
  retrievedAt: string;
  source: string; // "Copernicus GloFAS (ECMWF / Open-Meteo)"
  freshnessStatus: 'LIVE' | 'RECENT' | 'STALE';
}

export interface RiverIntelligenceSummary {
  gauges: RiverGaugeObservation[];
  discharge: RiverDischargeObservation | null;
  status: 'CONNECTED' | 'STANDBY' | 'UNAVAILABLE';
  sourceAgency: string;
  lastChecked: string;
  notes: string;
}
