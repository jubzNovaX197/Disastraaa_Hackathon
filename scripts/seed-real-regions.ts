/**
 * Database Seed Script: Canonical Demonstration Regions (Odisha)
 *
 * Prepares idempotent, non-destructive seed for:
 * - Kalahandi District
 * - Khordha District (Bhubaneswar State Command)
 * - Puri District (Coastal Belt)
 * - Cuttack District
 *
 * Population Source: Census of India 2011 (District Census Handbooks, Series 22, Part XII-B)
 * Geometries: PostGIS Point geometries (SRID 4326)
 *
 * Note: Per user safety instructions, this script does NOT execute destructive changes
 * and requires explicit confirmation before applying inserts.
 */

import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local if not already in process.env
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

export interface RegionSeedRecord {
  id: string;
  country: string;
  state: string;
  district: string;
  locality?: string;
  level: 'DISTRICT';
  lon: number;
  lat: number;
  population: number;
  populationSource: string;
  environment: 'REAL';
}

export const CANONICAL_REGIONS_SEED: RegionSeedRecord[] = [
  {
    id: 'odisha-kalahandi',
    country: 'India',
    state: 'Odisha',
    district: 'Kalahandi',
    locality: 'Bhawanipatna Operations Sector',
    level: 'DISTRICT',
    lon: 83.1659,
    lat: 19.9075,
    population: 1576869,
    populationSource: 'Census of India 2011 (District Census Handbook - Kalahandi, Series 22, Part XII-B)',
    environment: 'REAL',
  },
  {
    id: 'odisha-khordha',
    country: 'India',
    state: 'Odisha',
    district: 'Khordha',
    locality: 'Bhubaneswar State Command Operations',
    level: 'DISTRICT',
    lon: 85.8245,
    lat: 20.2961,
    population: 2251673,
    populationSource: 'Census of India 2011 (District Census Handbook - Khordha, Series 22, Part XII-B)',
    environment: 'REAL',
  },
  {
    id: 'odisha-puri',
    country: 'India',
    state: 'Odisha',
    district: 'Puri',
    locality: 'Puri Coastal Belt',
    level: 'DISTRICT',
    lon: 85.8312,
    lat: 19.8135,
    population: 1698730,
    populationSource: 'Census of India 2011 (District Census Handbook - Puri, Series 22, Part XII-B)',
    environment: 'REAL',
  },
  {
    id: 'odisha-cuttack',
    country: 'India',
    state: 'Odisha',
    district: 'Cuttack',
    locality: 'Cuttack Operational Sector',
    level: 'DISTRICT',
    lon: 85.8830,
    lat: 20.4625,
    population: 2624470,
    populationSource: 'Census of India 2011 (District Census Handbook - Cuttack, Series 22, Part XII-B)',
    environment: 'REAL',
  },
];

export async function previewSeedPlan() {
  console.log('=== PROPOSED CANONICAL REGIONS SEED PLAN ===');
  console.table(
    CANONICAL_REGIONS_SEED.map((r) => ({
      ID: r.id,
      District: `${r.district}, ${r.state}`,
      Centroid: `[${r.lon}, ${r.lat}]`,
      Population: r.population.toLocaleString(),
      Source: r.populationSource,
    })),
  );

  console.log('\n--- SQL EFFECT PREVIEW ---');
  for (const r of CANONICAL_REGIONS_SEED) {
    console.log(`INSERT INTO regions (id, country, state, district, locality, level, centroid, population, environment)
VALUES ('${r.id}', '${r.country}', '${r.state}', '${r.district}', '${r.locality}', '${r.level}'::admin_level_enum, ST_SetSRID(ST_MakePoint(${r.lon}, ${r.lat}), 4326), ${r.population}, '${r.environment}'::data_environment_enum)
ON CONFLICT (id) DO UPDATE SET
  locality = EXCLUDED.locality,
  centroid = EXCLUDED.centroid,
  population = EXCLUDED.population,
  updated_at = NOW();\n`);
  }
}

export async function executeSeed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const sql = neon(dbUrl);
  console.log('Applying canonical regions seed to Neon PostgreSQL...');

  for (const r of CANONICAL_REGIONS_SEED) {
    await sql`
      INSERT INTO regions (
        id, country, state, district, locality, level, centroid, population, environment
      ) VALUES (
        ${r.id},
        ${r.country},
        ${r.state},
        ${r.district},
        ${r.locality || null},
        ${r.level}::admin_level_enum,
        ST_SetSRID(ST_MakePoint(${r.lon}, ${r.lat}), 4326),
        ${r.population},
        ${r.environment}::data_environment_enum
      )
      ON CONFLICT (id) DO UPDATE SET
        locality = EXCLUDED.locality,
        centroid = EXCLUDED.centroid,
        population = EXCLUDED.population,
        updated_at = NOW();
    `;
    console.log(`  ✅ Seeded / Verified: ${r.district} (ID: ${r.id}, Pop: ${r.population})`);
  }

  const res = await sql`SELECT count(*) as c FROM regions WHERE environment = 'REAL';`;
  console.log(`Total REAL regions in database now: ${(res[0] as any).c}`);
}

// If run directly: preview or execute if --apply passed
if (require.main === module) {
  const isApply = process.argv.includes('--apply');
  if (isApply) {
    executeSeed().catch((err) => {
      console.error('Seed execution failed:', err);
      process.exit(1);
    });
  } else {
    previewSeedPlan().then(() => {
      console.log('Dry-run complete. Run with --apply after user approval.');
    });
  }
}
