import { NextResponse } from 'next/server';
import { ENV_COOKIE_NAME, type AppEnvironment } from '@/lib/env';

/**
 * GET /api/env
 * Returns the currently active environment.
 */
export async function GET(req: Request) {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const { SESSION_COOKIE_NAME } = await import('@/lib/auth/session');
  if (cookieStore.get(SESSION_COOKIE_NAME)?.value) {
    return NextResponse.json({ environment: 'REAL' });
  }
  const current = (cookieStore.get(ENV_COOKIE_NAME)?.value?.toUpperCase() as AppEnvironment) || 'REAL';
  return NextResponse.json({ environment: current });
}

/**
 * POST /api/env
 * Switches the active data environment (REAL vs DEMO).
 */
export async function POST(req: Request) {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const { SESSION_COOKIE_NAME } = await import('@/lib/auth/session');

    const body = await req.json();
    const env = body.environment?.toUpperCase();
    if (env !== 'REAL' && env !== 'DEMO') {
      return NextResponse.json({ success: false, error: 'Invalid environment. Must be REAL or DEMO.' }, { status: 400 });
    }

    // Authenticated operational users are strictly locked to REAL mode
    if (cookieStore.get(SESSION_COOKIE_NAME)?.value) {
      if (env === 'DEMO') {
        return NextResponse.json(
          { success: false, error: 'Authenticated operational users cannot access demo environment.', environment: 'REAL' },
          { status: 403 },
        );
      }
    }

    const res = NextResponse.json({ success: true, environment: env });
    res.cookies.set(ENV_COOKIE_NAME, env, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
    });

    return res;
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update environment' }, { status: 500 });
  }
}
