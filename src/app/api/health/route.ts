import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness only: a healthy app is not proof that upstream feeds are available. */
export function GET() {
  return NextResponse.json({
    status: 'ok', service: 'disastraaa', version: '0.1.0',
    timestamp: new Date().toISOString(),
    checks: { application: 'ok', upstreamFeeds: 'not_checked' },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
