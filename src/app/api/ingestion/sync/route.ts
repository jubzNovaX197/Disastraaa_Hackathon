/**
 * Operational Data Ingestion Sync API Route
 *
 * POST /api/ingestion/sync
 * GET  /api/ingestion/sync
 *
 * Triggers ingestion cycle across:
 * - NASA EONET v3 (Authoritative natural events)
 * - NASA FIRMS (Active thermal hotspots)
 * - Weather-to-Risk model pipeline (Flood, Cyclone, Multi-Hazard)
 */

import { requireAuthority } from '@/lib/auth/requireAuthority';
import { firmsClient, hazardRepository, runOperationalIngestion } from '@/lib/ingestion';
import { weatherRiskService } from '@/lib/ingestion/risk/weatherRiskService';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const activeHazards = await hazardRepository.getActiveHazards();
    const weatherObservations = await weatherRiskService.getLatestWeatherObservations();
    const derived = await weatherRiskService.computeDerivedRisks();

    return NextResponse.json(
      {
        status: 'ONLINE',
        environment: 'REAL',
        timestamp: new Date().toISOString(),
        sources: {
          nasaEonet: {
            status: 'AVAILABLE',
            source: 'NASA EONET v3 API',
            activeEventsCount: activeHazards.filter((h) => h.source.includes('EONET')).length,
          },
          nasaFirms: {
            status: firmsClient.isConfigured() ? 'CONFIGURED' : 'STANDBY',
            source: 'NASA FIRMS VIIRS/MODIS',
            activeHotspotsCount: activeHazards.filter((h) => h.source.includes('FIRMS')).length,
            note: firmsClient.isConfigured()
              ? 'Active satellite telemetry connected'
              : 'MAP_KEY unconfigured; running in safe standby mode',
          },
          weatherRisk: {
            status: 'OPERATIONAL',
            observationsCount: weatherObservations.length,
            derivedRiskZonesCount: derived.riskZones.length,
            derivedFloodAreasCount: derived.floodAreas.length,
            derivedCycloneZonesCount: derived.cycloneZones.length,
          },
        },
        totalActiveHazards: activeHazards.length,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to inspect ingestion status' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireAuthority();
  if (access.error) return access.error;
  try {
    const body = await req.json().catch(() => ({}));
    const report = await runOperationalIngestion({
      bbox: body.bbox,
      daysBack: body.daysBack,
      limit: body.limit,
    });

    return NextResponse.json(
      {
        success: true,
        report,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Operational ingestion cycle failed',
      },
      { status: 500 },
    );
  }
}
