import { alertStore } from '@/lib/alerts/alertStore';
import { resolveServerEnvironment } from '@/lib/env';
import { demoAlertProvider } from '@/lib/providers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/alerts
 *
 * Operational endpoint returning real or demo alerts with feed connectivity provenance.
 * Query params:
 *   - env: 'REAL' | 'DEMO'
 *   - refresh: 'true' (force refresh external feeds)
 *   - activeOnly: 'true' (only return currently active, non-expired alerts)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEnv = searchParams.get('env');
    const doRefresh = searchParams.get('refresh') === 'true';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const environment =
      requestedEnv === 'REAL' || requestedEnv === 'DEMO'
        ? requestedEnv
        : await resolveServerEnvironment();

    if (environment === 'REAL') {
      const snapshot = await alertStore.getSnapshot(doRefresh);
      const filteredAlerts = activeOnly
        ? snapshot.alerts.filter((a) => a.isActive)
        : snapshot.alerts;

      return NextResponse.json({
        success: true,
        environment: 'REAL',
        count: filteredAlerts.length,
        activeCount: snapshot.activeCount,
        staleCount: snapshot.staleCount,
        alerts: filteredAlerts,
        feedStatuses: snapshot.feedStatuses,
        lastRefreshed: snapshot.lastRefreshed,
        provenance: {
          source: 'India Meteorological Department (WMO CAP-Alert Hub) & NDMA SACHET Probe',
          sourceType: 'LIVE_OPERATIONAL',
          provider: 'National Early Warning Dissemination Core',
          confidence: 1.0,
          dataQuality: 'VERIFIED',
          lastUpdated: snapshot.lastRefreshed,
        },
      });
    }

    // DEMO environment
    const demoAlerts = await demoAlertProvider.getAlerts();
    return NextResponse.json({
      success: true,
      environment: 'DEMO',
      count: demoAlerts.length,
      activeCount: demoAlerts.filter((a: any) => a.isActive).length,
      staleCount: 0,
      alerts: demoAlerts,
      feedStatuses: [
        {
          feedId: 'demo-simulation',
          name: 'Demo Multi-Hazard Simulation Stream',
          authority: 'Scenario Engine Simulator',
          url: 'internal://data/demo/alerts',
          status: 'CONNECTED',
          itemCount: demoAlerts.length,
          lastChecked: new Date().toISOString(),
          notes: 'Pre-calibrated multi-hazard contingency simulation active.',
          isAuthoritative: false,
        },
      ],
      lastRefreshed: new Date().toISOString(),
      provenance: {
        source: 'Pre-calibrated Multi-Hazard Cyclone Remal Contingency Scenario',
        sourceType: 'SIMULATION',
        provider: 'Scenario Simulation Engine',
        confidence: 0.95,
        dataQuality: 'SIMULATED',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error resolving alerts';
    console.error('[API/ALERTS] Error resolving alerts:', err);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
