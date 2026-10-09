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

import { buildAndRegisterMlBenchmarks } from '../src/lib/platform/mlPipeline';

async function main() {
  console.log('Building and registering ML benchmark datasets in Tier 2/3 storage and Neon manifests...');
  const { floodManifest, cycloneManifest } = await buildAndRegisterMlBenchmarks();

  console.log('✅ Registered Flood Inundation Benchmark Manifest:');
  console.log(`   ID: ${floodManifest.id}`);
  console.log(`   Storage Key: ${floodManifest.storageKey}`);
  console.log(`   Rows: ${floodManifest.rowCount} | Size: ${floodManifest.sizeBytes} bytes`);
  console.log(`   Target Label: ${floodManifest.targetLabel}`);
  console.log(`   Zero-Leakage Status: ${floodManifest.leakageCheckStatus}`);

  console.log('\n✅ Registered Cyclone Damage Benchmark Manifest:');
  console.log(`   ID: ${cycloneManifest.id}`);
  console.log(`   Storage Key: ${cycloneManifest.storageKey}`);
  console.log(`   Rows: ${cycloneManifest.rowCount} | Size: ${cycloneManifest.sizeBytes} bytes`);
  console.log(`   Target Label: ${cycloneManifest.targetLabel}`);
  console.log(`   Zero-Leakage Status: ${cycloneManifest.leakageCheckStatus}`);
}

main().catch((err) => {
  console.error('Fatal error building ML benchmarks:', err);
  process.exit(1);
});
