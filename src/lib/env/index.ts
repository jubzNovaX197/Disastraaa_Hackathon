/**
 * App Environment Configuration
 *
 * Single source of truth for REAL vs DEMO environment detection.
 *
 * REAL  — explicitly selected live operational environment.
 *         Uses real data providers. May have empty/limited data until
 *         external APIs are integrated. Never shows fake data as real.
 *
 * DEMO  — the default visitor experience and /demo environment.
 *         Uses scenario data providers. Clearly labelled as simulation.
 *
 * Rules:
 *  - Environment is determined server-side from cookies/headers/path.
 *  - /demo path is always DEMO.
 *  - Real sessions (disastraaa-session cookie) always default to REAL.
 *  - Demo role sessions (disastraaa-user-role without real session) default to DEMO.
 *  - Visitors default to the labelled DEMO; explicit REAL choice is preserved.
 *  - Intelligence engines are environment-agnostic — only data providers differ.
 *  - Never mix REAL and DEMO data in the same render.
 */

export type AppEnvironment = 'REAL' | 'DEMO';

export const ENV_COOKIE_NAME = 'disastraaa-env';

/**
 * Determine environment from a URL pathname.
 * /demo and /demo/* paths are DEMO.
 */
export function getEnvironmentFromPath(pathname: string): AppEnvironment {
  if (pathname === '/demo' || pathname.startsWith('/demo/')) {
    return 'DEMO';
  }
  return 'REAL';
}

/**
 * Parse environment from a standard cookie header string.
 */
export function parseEnvironmentFromCookie(cookieHeader?: string | null): AppEnvironment {
  if (!cookieHeader) return 'DEMO';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${ENV_COOKIE_NAME}=([^;]*)`));
  let raw: string | null = null;
  try { raw = match ? decodeURIComponent(match[1]).toUpperCase() : null; } catch { return 'DEMO'; }
  if (raw === 'DEMO' || raw === 'REAL') {
    return raw as AppEnvironment;
  }
  return 'DEMO';
}

/**
 * Server-safe environment resolution using Next.js headers/cookies.
 */
export async function resolveServerEnvironment(): Promise<AppEnvironment> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    // 1. Real authenticated session ALWAYS resolves to REAL — cannot be overridden
    const { SESSION_COOKIE_NAME, verifySessionToken } = await import('@/lib/auth/session');
    if (await verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
      return 'REAL';
    }

    // 2. Explicit environment toggle cookie
    const explicitEnv = cookieStore.get(ENV_COOKIE_NAME)?.value?.toUpperCase();
    if (explicitEnv === 'DEMO') return 'DEMO';
    if (explicitEnv === 'REAL') return 'REAL';

    // 3. Demo persona without real session resolves to DEMO
    const { ROLE_COOKIE_NAME } = await import('@/lib/auth/roles');
    const demoRole = cookieStore.get(ROLE_COOKIE_NAME)?.value;
    if (demoRole && demoRole !== 'CITIZEN') {
      return 'DEMO';
    }

    // 4. A cold visitor gets a useful, explicitly labelled simulation.
    return 'DEMO';
  } catch {
    return 'DEMO';
  }
}

/**
 * Returns true if the environment is DEMO mode.
 */
export function isDemoEnvironment(env: AppEnvironment): boolean {
  return env === 'DEMO';
}

/**
 * Data source label for UI display.
 */
export function getDataSourceLabel(env: AppEnvironment): string {
  return env === 'DEMO' ? 'Simulation / Scenario Data' : 'Live Operational Data';
}

/**
 * Whether to show the demo/simulation banner.
 */
export function shouldShowDemoBanner(env: AppEnvironment): boolean {
  return env === 'DEMO';
}
