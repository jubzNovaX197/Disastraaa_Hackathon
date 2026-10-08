import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

// Load .env.local if not already in environment
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

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_URL is not set in environment or .env.local.');
    process.exit(1);
  }

  console.log('Testing Neon PostgreSQL connection (credentials masked)...');
  const sql = neon(dbUrl);

  try {
    const versionResult = await sql`SELECT version();`;
    console.log('✅ PostgreSQL Connection Successful!');
    console.log('   Version:', (versionResult[0] as any)?.version?.slice(0, 60) + '...');

    try {
      const postgisResult = await sql`SELECT PostGIS_Version();`;
      console.log('✅ PostGIS Extension Verified!');
      console.log('   PostGIS Version:', (postgisResult[0] as any)?.postgis_version);
    } catch (err: any) {
      console.error('❌ PostGIS check failed:', err.message);
    }
  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
