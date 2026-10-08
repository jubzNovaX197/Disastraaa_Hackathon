import { NextResponse } from 'next/server';
import { getIncidents, saveIncident, createIncident, type CreateIncidentInput } from '@/lib/incidents';
import { ROLES } from '@/types/roles';
import { resolveServerEnvironment } from '@/lib/env';

export async function GET() {
  try {
    const env = await resolveServerEnvironment();
    const incidents = getIncidents(env);
    return NextResponse.json({
      success: true,
      environment: env,
      count: incidents.length,
      incidents,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch incidents';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      title,
      description,
      incidentType = 'OTHER',
      hazardType = 'FLOOD',
      severity = 'HIGH',
      locationName,
      coordinates,
      affectedArea,
      source = 'MANUAL',
      sourceReference,
      createdBy = 'Authority Dispatcher',
      createdByRole = ROLES.DISTRICT_AUTHORITY,
      evidence = [],
    } = body;

    if (!title || typeof title !== 'string' || !locationName || typeof locationName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title and locationName are required.' },
        { status: 400 },
      );
    }

    const input: CreateIncidentInput = {
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : 'Incident logged via operations API.',
      incidentType,
      hazardType,
      severity,
      locationName: locationName.trim(),
      coordinates: Array.isArray(coordinates) && coordinates.length === 2 ? [Number(coordinates[0]), Number(coordinates[1])] : undefined,
      affectedArea: typeof affectedArea === 'string' ? affectedArea.trim() : undefined,
      source,
      sourceReference,
      dataLabel: 'VERIFIED',
      createdBy,
      createdByRole,
      evidence: Array.isArray(evidence) ? evidence : [],
    };

    const env = await resolveServerEnvironment();
    const incident = createIncident(input);
    saveIncident(incident, env);

    return NextResponse.json(
      { success: true, incident },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An error occurred while creating the incident.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
