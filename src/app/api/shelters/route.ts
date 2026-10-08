import { NextRequest, NextResponse } from 'next/server';
import { resolveServerEnvironment } from '@/lib/env';
import { getShelterProvider } from '@/lib/providers';
import { osmShelterStore } from '@/lib/shelters/osmStore';
import type { BoundingBox } from '@/lib/geo/osm/types';

/**
 * GET /api/shelters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEnv = searchParams.get('env');
    const doIngest = searchParams.get('ingest') === 'true';

    const environment =
      requestedEnv === 'REAL' || requestedEnv === 'DEMO'
        ? requestedEnv
        : await resolveServerEnvironment();

    if (environment === 'REAL' && doIngest) {
      await osmShelterStore.ingestFromOverpass();
    }

    const provider = getShelterProvider(environment);
    const shelters = await provider.getShelters();

    return NextResponse.json({
      success: true,
      environment,
      count: shelters.length,
      shelters,
      provenance: {
        source: environment === 'REAL' ? 'OpenStreetMap Overpass (amenity=shelter)' : 'Simulated Scenario Camp Dataset',
        provider: 'Disastraaa Emergency Shelter Registry',
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[API/SHELTERS] Error retrieving shelters:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error resolving shelters.',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/shelters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bbox = body.bbox as BoundingBox | undefined;

    const result = await osmShelterStore.ingestFromOverpass({ bbox });

    return NextResponse.json({
      success: result.success,
      count: result.count,
      endpointUsed: result.endpointUsed,
      source: result.source,
      retrievedAt: result.retrievedAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to ingest OSM shelters.',
      },
      { status: 500 },
    );
  }
}
