/**
 * Citizen Report Store
 *
 * Implements persistent and in-memory access for Citizen Disaster Reports.
 * REAL operational reports are persisted to the Neon PostgreSQL + PostGIS database.
 * DEMO scenario observations remain strictly isolated in memory.
 */

import { demoCitizenReports } from '@/data/demo/citizenReports';
import type { CitizenReportItem, ReportType } from './types';
import type { AppEnvironment } from '@/lib/env';
import { executeQuery } from '@/lib/db';
import { parseLocationFromText, registerRealOperationalLocation } from '@/lib/geo/regions';

// Global singletons across server runtime — strictly separated
let _realReportsStore: CitizenReportItem[] = [];
let _demoReportsStore: CitizenReportItem[] = [...demoCitizenReports];

const VALID_HAZARD_TYPES = new Set([
  'CYCLONE',
  'FLOOD',
  'URBAN_FLOOD',
  'LANDSLIDE',
  'STORM_SURGE',
  'HEATWAVE',
  'LIGHTNING',
  'DROUGHT',
  'EARTHQUAKE',
  'MULTI_HAZARD',
]);

const VALID_SEVERITIES = new Set(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']);
const VALID_STATUSES = new Set([
  'PENDING',
  'UNDER_REVIEW',
  'COMMUNITY_CONFIRMED',
  'VERIFIED',
  'REJECTED',
  'ESCALATED',
]);

/**
 * Persists a single real citizen report into Neon PostgreSQL citizen_reports table.
 */
async function persistReportToDatabase(report: CitizenReportItem): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const parsed = parseLocationFromText(report.administrativeArea || report.address);
  const state = parsed.state || 'Odisha';
  const district = parsed.district || 'Khordha';

  const hazardType = VALID_HAZARD_TYPES.has(report.hazardType) ? report.hazardType : 'FLOOD';
  const severity = VALID_SEVERITIES.has(report.severity) ? report.severity : 'HIGH';
  const status = VALID_STATUSES.has(report.status) ? report.status : 'PENDING';

  const [lon, lat] = report.coordinates;
  const evidenceJson = JSON.stringify(report.evidence || []);
  const blockedRoadJson = report.blockedRoadInfo ? JSON.stringify(report.blockedRoadInfo) : null;

  await executeQuery(
    `INSERT INTO citizen_reports (
      id, hazard_type, title, description, address, state, district,
      coordinates, reporter_name, is_anonymous, severity, status,
      preliminary_score, evidence_urls, confirmations_count, blocked_road_info,
      environment, created_at, updated_at
    ) VALUES (
      $1, $2::hazard_type_enum, $3, $4, $5, $6, $7,
      ST_SetSRID(ST_MakePoint($8, $9), 4326),
      $10, $11, $12::severity_enum, $13::report_status_enum,
      $14, $15::jsonb, $16, $17::jsonb,
      'REAL'::data_environment_enum, $18, $19
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      confirmations_count = EXCLUDED.confirmations_count,
      updated_at = NOW();`,
    [
      report.id,
      hazardType,
      report.title.slice(0, 255),
      report.description,
      report.address.slice(0, 500),
      state.slice(0, 100),
      district.slice(0, 100),
      lon,
      lat,
      report.reporter?.name || null,
      Boolean(report.reporter?.isAnonymous),
      severity,
      status,
      report.preliminaryAnalysis?.score ?? 50,
      evidenceJson,
      report.communityConfirmations?.confirmCount ?? 0,
      blockedRoadJson,
      report.createdAt || new Date().toISOString(),
      report.updatedAt || new Date().toISOString(),
    ],
  );
}

/**
 * Retrieves persisted citizen reports from Neon PostgreSQL database for REAL mode.
 * Synchronizes in-memory store and returns parsed reports.
 */
export async function getPersistedReports(env: AppEnvironment = 'REAL'): Promise<CitizenReportItem[]> {
  if (env === 'DEMO') {
    return _demoReportsStore;
  }

  if (process.env.DATABASE_URL) {
    try {
      const rows = await executeQuery<any>(
        `SELECT id, hazard_type, title, description, address, state, district,
                ST_X(coordinates) as lon, ST_Y(coordinates) as lat,
                reporter_name, is_anonymous, severity, status,
                preliminary_score, evidence_urls, confirmations_count, blocked_road_info,
                created_at, updated_at
         FROM citizen_reports
         WHERE environment = 'REAL'
         ORDER BY created_at DESC;`,
      );

      const mapped: CitizenReportItem[] = rows.map((r) => {
        const lon = parseFloat(r.lon) || 0;
        const lat = parseFloat(r.lat) || 0;
        const evidenceUrls = Array.isArray(r.evidence_urls) ? r.evidence_urls : [];
        const blockedRoadInfo = r.blocked_road_info || undefined;

        return {
          id: r.id,
          reportType: r.hazard_type as ReportType,
          hazardType: r.hazard_type,
          title: r.title,
          description: r.description,
          coordinates: [lon, lat],
          address: r.address,
          administrativeArea: `${r.district}, ${r.state}`,
          reporter: {
            isAnonymous: Boolean(r.is_anonymous),
            name: r.reporter_name || undefined,
            role: 'CITIZEN',
          },
          createdAt: new Date(r.created_at).toISOString(),
          updatedAt: new Date(r.updated_at).toISOString(),
          severity: r.severity,
          status: r.status,
          confirmCount: r.confirmations_count || 0,
          type: r.hazard_type,
          evidence: evidenceUrls,
          blockedRoadInfo,
          communityConfirmations: {
            confirmCount: r.confirmations_count || 0,
            suspiciousCount: 0,
          },
          preliminaryAnalysis: {
            confidence: (r.preliminary_score || 50) >= 80 ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE',
            score: r.preliminary_score || 50,
            completenessScore: 80,
            evidenceScore: evidenceUrls.length > 0 ? 90 : 40,
            riskProximityScore: 50,
            alertProximityScore: 50,
            urgency: r.severity,
            indicators: [],
            summary: 'Field observation verified via database persistence layer',
            potentialAlertTrigger: r.severity === 'CRITICAL' || r.severity === 'HIGH',
            duplicateIndicator: false,
            analyzedAt: new Date(r.created_at).toISOString(),
          },
          authorityVerification: {
            status: r.status === 'VERIFIED' ? 'VERIFIED' : r.status === 'REJECTED' ? 'REJECTED' : 'UNREVIEWED',
          },
          linkedIntelligence: {},
        };
      });

      _realReportsStore = mapped;
      return mapped;
    } catch (err) {
      console.warn('[REPORTS/STORE] Failed to query persisted reports from database:', err);
    }
  }

  return _realReportsStore;
}

export function getAllReports(env: AppEnvironment = 'REAL'): CitizenReportItem[] {
  return env === 'DEMO' ? _demoReportsStore : _realReportsStore;
}

export function getReportById(id: string, env: AppEnvironment = 'REAL'): CitizenReportItem | undefined {
  const store = env === 'DEMO' ? _demoReportsStore : _realReportsStore;
  return store.find((r) => r.id === id);
}

export async function saveReport(report: CitizenReportItem, env: AppEnvironment = 'REAL'): Promise<void> {
  if (env === 'DEMO') {
    const idx = _demoReportsStore.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      _demoReportsStore = [
        ..._demoReportsStore.slice(0, idx),
        report,
        ..._demoReportsStore.slice(idx + 1),
      ];
    } else {
      _demoReportsStore = [report, ..._demoReportsStore];
    }
  } else {
    const idx = _realReportsStore.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      _realReportsStore = [
        ..._realReportsStore.slice(0, idx),
        report,
        ..._realReportsStore.slice(idx + 1),
      ];
    } else {
      _realReportsStore = [report, ..._realReportsStore];
    }

    // Persist to Neon database
    try {
      await persistReportToDatabase(report);
    } catch (err) {
      console.warn('[REPORTS/STORE] Database persistence error (falling back to memory):', err);
    }

    // Register real geographic region dynamically
    try {
      const parsed = parseLocationFromText(report.administrativeArea || report.address);
      registerRealOperationalLocation({
        district: parsed.district,
        state: parsed.state,
        coordinates: report.coordinates,
        locality: report.address,
        source: 'REPORT',
        environment: 'REAL',
      });
    } catch {
      // ignore
    }
  }
}

export function getReportCounts(env: AppEnvironment = 'REAL') {
  const store = env === 'DEMO' ? _demoReportsStore : _realReportsStore;
  const total = store.length;
  const verified = store.filter((r) => r.status === 'VERIFIED').length;
  const underReview = store.filter(
    (r) => r.status === 'UNDER_REVIEW' || r.status === 'PENDING',
  ).length;
  const communityConfirmed = store.filter(
    (r) => r.status === 'COMMUNITY_CONFIRMED',
  ).length;
  const escalated = store.filter((r) => r.status === 'ESCALATED').length;
  const withEvidence = store.filter(
    (r) => r.evidence && r.evidence.length > 0,
  ).length;

  return {
    total,
    verified,
    underReview,
    communityConfirmed,
    escalated,
    withEvidence,
  };
}

export function _resetRealReportsForTesting(): void {
  _realReportsStore = [];
}
