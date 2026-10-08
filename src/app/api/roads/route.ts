import { NextRequest, NextResponse } from 'next/server';
import { resolveServerEnvironment } from '@/lib/env';
import { getRoadProvider, getShelterProvider } from '@/lib/providers';
import { osmRoadStore } from '@/lib/roads/osmStore';
import { buildGraphFromRoadSegments } from '@/lib/routing';
import { demoRoadSegments } from '@/data/demo';
import { DEMO_NODES } from '@/lib/routing/graph';
import type { BoundingBox } from '@/lib/geo/osm/types';

/**
 * GET /api/roads
 *
 * Query params:
 * - env: 'REAL' | 'DEMO' (defaults to active cookie / server environment)
 * - ingest: 'true' (force live Overpass query and PostGIS persistence)
 * - bbox: south,west,north,east (optional bounding box override)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEnv = searchParams.get('env');
    const doIngest = searchParams.get('ingest') === 'true';
    const bboxParam = searchParams.get('bbox');

    const environment =
      requestedEnv === 'REAL' || requestedEnv === 'DEMO'
        ? requestedEnv
        : await resolveServerEnvironment();

    if (environment === 'DEMO') {
      return NextResponse.json({
        success: true,
        environment: 'DEMO',
        count: demoRoadSegments.length,
        roads: demoRoadSegments,
        graph: {
          nodes: DEMO_NODES,
          nodesCount: DEMO_NODES.length,
        },
        provenance: {
          source: 'Simulated Scenario Network',
          provider: 'Demo Fixtures',
          retrievedAt: new Date().toISOString(),
        },
      });
    }

    // REAL Mode
    let bbox: BoundingBox | undefined;
    if (bboxParam) {
      const parts = bboxParam.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        bbox = { south: parts[0], west: parts[1], north: parts[2], east: parts[3] };
      }
    }

    if (doIngest) {
      await osmRoadStore.ingestFromOverpass({ bbox });
    }

    const roadProvider = getRoadProvider('REAL');
    const shelterProvider = getShelterProvider('REAL');

    const [roads, shelters, blockedRoads] = await Promise.all([
      roadProvider.getRoadSegments(),
      shelterProvider.getShelters(),
      roadProvider.getBlockedRoads(),
    ]);

    const routingGraph = buildGraphFromRoadSegments(roads, shelters);

    return NextResponse.json({
      success: true,
      environment: 'REAL',
      count: roads.length,
      roads,
      blockedRoadsCount: blockedRoads.length,
      graph: {
        nodes: routingGraph.nodes,
        nodesCount: routingGraph.nodes.length,
        edgesCount: routingGraph.edges.length,
      },
      provenance: {
        source: 'OpenStreetMap Overpass API',
        sourceType: 'LIVE_OPERATIONAL',
        provider: 'Disastraaa Real Geospatial Infrastructure',
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[API/ROADS] Error retrieving road segments:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error resolving road network.',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/roads
 *
 * Ingestion trigger for live OSM Overpass data into PostGIS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bbox = body.bbox as BoundingBox | undefined;

    const result = await osmRoadStore.ingestFromOverpass({ bbox });

    return NextResponse.json({
      success: result.success,
      count: result.count,
      endpointUsed: result.endpointUsed,
      source: result.source,
      retrievedAt: result.retrievedAt,
      errors: result.errors,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to ingest OSM roads.',
      },
      { status: 500 },
    );
  }
}
