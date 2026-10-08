/**
 * Database Client & Enterprise Repository Layer
 *
 * Implements the Neon PostgreSQL + PostGIS database connection layer for Disastraaa.
 * When DATABASE_URL is set, queries route to the Neon PostgreSQL instance.
 * For environments without an active connection, provides graceful fallback.
 *
 * Strict Data Isolation:
 * - REAL operational records are queried from the real database/store.
 * - DEMO scenario data is NEVER written to or mixed with REAL operational tables.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export interface DatabaseHealth {
  status: 'CONNECTED' | 'STANDBY_LOCAL';
  engine: string;
  hasPostGis: boolean;
  postgisVersion?: string;
  provider: string;
  latencyMs?: number;
}

let _cachedClient: NeonQueryFunction<false, false> | null = null;

/**
 * Returns the active Neon SQL client instance.
 * Returns null if DATABASE_URL is not configured.
 */
export function getDbClient(): NeonQueryFunction<false, false> | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  if (!_cachedClient) {
    _cachedClient = neon(dbUrl);
  }
  return _cachedClient;
}

/**
 * Executes a parameterized query against Neon PostgreSQL.
 * Throws an error if DATABASE_URL is not set.
 */
export async function executeQuery<T = any>(
  sqlText: string,
  params?: any[],
): Promise<T[]> {
  const client = getDbClient();
  if (!client) {
    throw new Error('DATABASE_URL is not configured in the current environment.');
  }
  const result = await client.query(sqlText, params);
  return result as T[];
}

/**
 * Returns live database health, engine version, and PostGIS verification.
 * Masks all credentials and connection strings.
 */
export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const client = getDbClient();
  if (!client) {
    return {
      status: 'STANDBY_LOCAL',
      engine: 'In-Memory Enterprise Store (PostgreSQL Compatible)',
      hasPostGis: false,
      provider: 'Local In-Memory Standby',
    };
  }

  const startTime = Date.now();
  try {
    const versionRows = await client.query('SELECT version();');
    const fullVersion = (versionRows[0] as any)?.version || 'PostgreSQL';
    const engineShort = fullVersion.split(' ')[0] + ' ' + (fullVersion.split(' ')[1] || '');

    let hasPostGis = false;
    let postgisVersion: string | undefined;

    try {
      const postgisRows = await client.query('SELECT PostGIS_Version();');
      hasPostGis = true;
      postgisVersion = (postgisRows[0] as any)?.postgis_version;
    } catch {
      hasPostGis = false;
    }

    const latencyMs = Date.now() - startTime;

    return {
      status: 'CONNECTED',
      engine: engineShort,
      hasPostGis,
      postgisVersion,
      provider: 'Neon Serverless PostgreSQL',
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'STANDBY_LOCAL',
      engine: 'In-Memory Enterprise Store (PostgreSQL Fallback)',
      hasPostGis: false,
      provider: 'Local In-Memory Standby',
    };
  }
}
