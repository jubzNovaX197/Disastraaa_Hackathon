import { resolveServerEnvironment } from '@/lib/env';
import {
  createIncident,
  mapReportSeverityToIncidentSeverity,
  mapReportTypeToIncidentType,
  saveIncident,
} from '@/lib/incidents';
import { getDatasetProvider } from '@/lib/providers';
import {
  createCitizenReport,
  getAllReports,
  getPersistedReports,
  REPORT_TYPES,
  saveReport,
  type CreateReportInput,
  type ReportType,
} from '@/lib/reports';
import type { Severity } from '@/types';
import { ROLES } from '@/types/roles';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEnv = searchParams.get('env');
    const env =
      requestedEnv === 'REAL' || requestedEnv === 'DEMO'
        ? requestedEnv
        : await resolveServerEnvironment();

    const reports = env === 'REAL' ? await getPersistedReports('REAL') : getAllReports('DEMO');
    return NextResponse.json({
      success: true,
      environment: env,
      count: reports.length,
      reports,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch citizen reports';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Input Validation ────────────────────────────────────────────────────────
    const {
      title,
      description,
      reportType,
      coordinates,
      address,
      administrativeArea,
      severity = 'HIGH',
      evidence = [],
      reporterName,
      isAnonymous = false,
      blockedRoadInfo,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'A descriptive headline is required (at least 3 characters).' },
        { status: 400 },
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Please describe the observed disaster conditions (at least 5 characters).' },
        { status: 400 },
      );
    }

    if (!reportType || !Object.values(REPORT_TYPES).includes(reportType as ReportType)) {
      return NextResponse.json(
        { success: false, error: 'Please select a valid disaster/incident hazard category.' },
        { status: 400 },
      );
    }

    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      typeof coordinates[0] !== 'number' ||
      typeof coordinates[1] !== 'number' ||
      coordinates[0] < -180 ||
      coordinates[0] > 180 ||
      coordinates[1] < -90 ||
      coordinates[1] > 90
    ) {
      return NextResponse.json(
        { success: false, error: 'Valid geographic coordinates [longitude, latitude] are required.' },
        { status: 400 },
      );
    }

    const validSeverities: Severity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    const resolvedSeverity: Severity = validSeverities.includes(severity as Severity)
      ? (severity as Severity)
      : 'HIGH';

    const input: CreateReportInput = {
      title: title.trim(),
      description: description.trim(),
      reportType: reportType as ReportType,
      coordinates: [coordinates[0], coordinates[1]],
      address: typeof address === 'string' && address.trim() ? address.trim() : 'Observed Field Location',
      administrativeArea:
        typeof administrativeArea === 'string' && administrativeArea.trim()
          ? administrativeArea.trim()
          : 'Odisha Disaster Zone',
      severity: resolvedSeverity,
      evidence: Array.isArray(evidence) ? evidence : [],
      reporterName: typeof reporterName === 'string' ? reporterName.trim() : undefined,
      isAnonymous: Boolean(isAnonymous),
      blockedRoadInfo: blockedRoadInfo ?? undefined,
    };

    // ── 1. Create and Persist Citizen Report ─────────────────────────────────
    const env = await resolveServerEnvironment();
    const datasetProvider = getDatasetProvider(env);
    const dataset = await datasetProvider.getDataset();
    const report = createCitizenReport(input, dataset);
    await saveReport(report, env);

    // ── 2. Create and Persist Linked Incident for Authority System ──────────
    const incidentType = mapReportTypeToIncidentType(report.reportType);
    const incidentSeverity = mapReportSeverityToIncidentSeverity(report.severity);

    const incident = createIncident({
      title: report.title,
      description: report.description,
      incidentType,
      hazardType: report.hazardType,
      severity: incidentSeverity,
      locationName: report.address,
      coordinates: report.coordinates,
      affectedArea: report.administrativeArea,
      source: 'CITIZEN_REPORT',
      sourceReference: report.id,
      dataLabel: 'CITIZEN_REPORT',
      createdBy: report.reporter.name || 'Citizen Reporter',
      createdByRole: ROLES.CITIZEN,
      relatedReportIds: [report.id],
      evidence: report.evidence,
    });

    await saveIncident(incident, env);

    return NextResponse.json(
      {
        success: true,
        report,
        incident,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An error occurred while creating the incident report.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
