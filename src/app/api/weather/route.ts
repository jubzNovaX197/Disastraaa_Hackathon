import { resolveServerEnvironment } from '@/lib/env';
import { getWeatherProvider } from '@/lib/providers';
import { NextRequest, NextResponse } from 'next/server';

// Well-known coordinates for key operational hubs across India / Odisha
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  bargarh: { lat: 21.3331, lon: 83.6176, name: 'Bargarh, Odisha' },
  puri: { lat: 19.8135, lon: 85.8312, name: 'Puri Coastal Belt, Odisha' },
  bhubaneswar: { lat: 20.2961, lon: 85.8245, name: 'Bhubaneswar, Khurda, Odisha' },
  cuttack: { lat: 20.4625, lon: 85.8830, name: 'Cuttack, Odisha' },
  paradip: { lat: 20.3164, lon: 86.6111, name: 'Paradip Port, Jagatsinghpur, Odisha' },
  balasore: { lat: 21.4934, lon: 86.9324, name: 'Balasore Coastal Sector, Odisha' },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, name: 'Visakhapatnam, Andhra Pradesh' },
  kolkata: { lat: 22.5726, lon: 88.3639, name: 'Kolkata, West Bengal' },
  delhi: { lat: 28.6139, lon: 77.2090, name: 'New Delhi National Capital Region' },
  mumbai: { lat: 19.0760, lon: 72.8777, name: 'Mumbai Coastal Region, Maharashtra' },
  chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai Coastal Belt, Tamil Nadu' },
};

/**
 * GET /api/weather
 *
 * Query params:
 * - lat: latitude (number)
 * - lon: longitude (number)
 * - location: name or district (e.g. "Bargarh", "Puri")
 * - env: 'REAL' | 'DEMO' (optional override)
 * - regional: 'true' to get list of active regional records
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEnv = searchParams.get('env');
    const isRegional = searchParams.get('regional') === 'true';
    const locationParam = searchParams.get('location') || '';
    const stateParam = searchParams.get('state') || '';
    const districtParam = searchParams.get('district') || '';

    // 1. Resolve Environment
    const environment =
      requestedEnv === 'REAL' || requestedEnv === 'DEMO'
        ? requestedEnv
        : await resolveServerEnvironment();

    const provider = getWeatherProvider(environment);

    // 2. Handle Regional Query
    if (isRegional) {
      const records = await provider.getRegionalWeather(stateParam || undefined, districtParam || undefined);
      return NextResponse.json(
        {
          success: true,
          environment,
          count: records.length,
          data: records,
          retrievedAt: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=180, stale-while-revalidate=600',
          },
        },
      );
    }

    // 3. Resolve Lat & Lon
    let lat: number | null = null;
    let lon: number | null = null;
    let resolvedName = locationParam || 'Operational Sector';

    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    if (latStr && lonStr) {
      const parsedLat = parseFloat(latStr);
      const parsedLon = parseFloat(lonStr);
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        lat = parsedLat;
        lon = parsedLon;
      }
    }

    // If coordinates not directly provided, resolve from known coordinates or location text
    if (lat === null || lon === null) {
      const locKey = locationParam.toLowerCase().replace(/district|sector|belt|,|odisha|india/g, '').trim();
      const match = Object.entries(KNOWN_COORDINATES).find(([k]) => locKey.includes(k) || k.includes(locKey));

      if (match) {
        lat = match[1].lat;
        lon = match[1].lon;
        resolvedName = match[1].name;
      } else if (environment === 'DEMO') {
        // In demo, default to Puri coastal scenario
        lat = 19.8135;
        lon = 85.8312;
        resolvedName = 'Puri Coastal Belt & Town';
      } else {
        // In real, default to central monitoring hub (Odisha / India)
        lat = 20.2961;
        lon = 85.8245;
        resolvedName = 'Bhubaneswar State Command Operations';
      }
    }

    // 4. Fetch normalized weather via Provider
    const weather = await provider.getWeather(lat, lon, resolvedName);

    if (!weather) {
      return NextResponse.json(
        {
          success: false,
          environment,
          weather: null,
          freshness: 'UNAVAILABLE',
          error: 'Weather telemetry temporarily unavailable for requested sector.',
          retrievedAt: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        environment,
        weather,
        freshness: weather.freshnessStatus,
        retrievedAt: weather.retrievedAt,
        provenance: {
          source: weather.source,
          sourceId: weather.sourceId,
          observedAt: weather.observedAt,
          freshnessStatus: weather.freshnessStatus,
          provider: environment === 'REAL' ? 'Open-Meteo Live API Client' : 'IMD Scenario Simulator',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
        },
      },
    );
  } catch (err: any) {
    console.error('[API/WEATHER] Ingestion route error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error while resolving weather telemetry.',
        freshness: 'UNAVAILABLE',
      },
      { status: 500 },
    );
  }
}
