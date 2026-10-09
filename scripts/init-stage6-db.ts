import fs from 'fs';
import path from 'path';

// Load .env.local if present
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

import { initializeStage6Tables } from '../src/lib/platform/db';
import { executeQuery } from '../src/lib/db';

async function main() {
  console.log('Initializing Stage 6 Lineage, Manifest & Aggregate tables in Neon PostgreSQL...');
  const res = await initializeStage6Tables();
  if (!res.success) {
    console.error('Failed to initialize Stage 6 tables:', res.error);
    process.exit(1);
  }
  console.log('✅ Stage 6 tables initialized successfully!');

  // Verify created tables
  const tables = await executeQuery<{ table_name: string }>(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('ingestion_job_runs', 'dataset_manifests', 'telemetry_daily_aggregates');
  `);

  console.log('Verified Stage 6 tables in Neon:', tables.map((t) => t.table_name));
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
