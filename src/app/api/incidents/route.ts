import { requireAuthority } from '@/lib/auth/requireAuthority';
import { resolveServerEnvironment } from '@/lib/env';
import { createIncident, getIncidents, getPersistedIncidents, saveIncident, type CreateIncidentInput } from '@/lib/incidents';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEnv = searchParams.get('env');
    const env =
      requestedEnv === 'REAL' || requestedEnv === 'DEMO'
        ? requestedEnv
        : await resolveServerEnvironment();

    const incidents = env === 'REAL' ? await getPersistedIncidents('REAL') : getIncidents('DEMO');
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
  const access = await requireAuthority(true);
  if (access.error) return access.error;
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
      dataLabel: access.environment === 'DEMO' ? 'SIMULATION' : 'VERIFIED',
      createdBy: access.actor.name,
      createdByRole: access.actor.role,
      evidence: Array.isArray(evidence) ? evidence : [],
    };

    const env = access.environment;
    const incident = createIncident(input);
    await saveIncident(incident, env);

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
