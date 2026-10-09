/**
 * Disaster Intelligence & Decision Support Summary — API Route (Stage 5B)
 *
 * GET /api/intelligence/summary?district=Kalahandi
 * POST /api/intelligence/summary { district: "Kalahandi", forceRefresh: false }
 *
 * Validates requested location, queries verified database & sensor stores,
 * executes deterministic risk engines, and produces an AI-grounded or
 * rule-based executive summary and decision-support directives.
 */

import { resolveServerEnvironment } from '@/lib/env';
import { disasterSnapshotService } from '@/lib/intelligence/snapshot';
import { disasterSummaryService } from '@/lib/intelligence/summaryService';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const districtQuery = searchParams.get('district') || searchParams.get('location') || undefined;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';

    const environment = await resolveServerEnvironment();

    const snapshot = await disasterSnapshotService.assembleSnapshot({
      locationQuery: districtQuery,
      environment,
      forceRefresh,
    });

    const summary = await disasterSummaryService.generateSummary(snapshot, {
      forceRefresh,
    });

    return NextResponse.json(
      {
        success: true,
        summary,
        snapshot,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (error: any) {
    console.error('[API-INTELLIGENCE-SUMMARY] GET error:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate disaster intelligence summary.',
        details: error?.message || 'Internal operational service error',
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const locationQuery =
      typeof body?.location === 'string'
        ? body.location.trim()
        : typeof body?.district === 'string'
        ? body.district.trim()
        : undefined;

    const forceRefresh = Boolean(body?.forceRefresh);
    const environment = await resolveServerEnvironment();

    const snapshot = await disasterSnapshotService.assembleSnapshot({
      locationQuery,
      environment,
      forceRefresh,
    });

    const summary = await disasterSummaryService.generateSummary(snapshot, {
      forceRefresh,
    });

    return NextResponse.json(
      {
        success: true,
        summary,
        snapshot,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('[API-INTELLIGENCE-SUMMARY] POST error:', error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate disaster intelligence summary.',
        details: error?.message || 'Internal operational service error',
      },
      { status: 500 },
    );
  }
}
