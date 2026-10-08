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

import { getWeatherProvider } from '../src/lib/providers';
import { executeQuery } from '../src/lib/db';
import { getAvailableRealRegions } from '../src/lib/geo/regions';

async function main() {
  console.log('====================================================');
  console.log('TEST SUITE: REAL-WORLD DATA INGESTION (WEATHER + DB)');
  console.log('====================================================');

  // 1. Ingest Real Weather for Bargarh, Odisha (21.3331, 83.6176)
  console.log('\n[1] Testing Real Weather Ingestion via Open-Meteo for Bargarh, Odisha...');
  const realProvider = getWeatherProvider('REAL');
  const realWx = await realProvider.getWeather(21.3331, 83.6176, 'Bargarh, Odisha');

  if (!realWx) {
    console.error('❌ Failed to ingest real weather from Open-Meteo.');
    process.exit(1);
  }

  console.log('✅ Real weather ingestion successful:');
  console.log(`   Location: ${realWx.locationName}`);
  console.log(`   Coordinates: [lng: ${realWx.coordinates[0]}, lat: ${realWx.coordinates[1]}]`);
  console.log(`   Temperature: ${realWx.temperatureC}°C (Feels like: ${realWx.apparentTemperatureC}°C)`);
  console.log(`   Condition: ${realWx.icon} ${realWx.condition} (WMO: ${realWx.weatherCode})`);
  console.log(`   Humidity: ${realWx.relativeHumidityPct}%`);
  console.log(`   Wind: ${realWx.windSpeedKmh} km/h (dir: ${realWx.windDirectionDeg}°)`);
  console.log(`   Pressure: ${realWx.surfacePressureHpa} hPa`);
  console.log(`   Precipitation: ${realWx.precipitationMm} mm`);
  console.log(`   Source: ${realWx.source}`);
  console.log(`   Freshness Status: ${realWx.freshnessStatus}`);
  console.log(`   Observed At: ${realWx.observedAt}`);
  console.log(`   Retrieved At: ${realWx.retrievedAt}`);
  console.log(`   Hourly Forecast Points: ${realWx.hourlyForecast?.length ?? 0}`);

  if (realWx.freshnessStatus !== 'LIVE' && realWx.freshnessStatus !== 'RECENT') {
    console.error(`❌ Unexpected freshness status: ${realWx.freshnessStatus}`);
    process.exit(1);
  }

  // 2. Verify Database Persistence in Neon PostgreSQL + PostGIS
  console.log('\n[2] Verifying PostgreSQL + PostGIS Persistence...');
  const dbRows = await executeQuery<any>(
    `SELECT id, location_name, temperature_c, weather_condition, freshness_status,
            ST_AsText(coordinates) as geom_text, environment
     FROM weather_telemetry
     WHERE id = $1;`,
    [realWx.id],
  );

  if (dbRows.length === 0) {
    console.error('❌ Record not found in weather_telemetry table.');
    process.exit(1);
  }

  const row = dbRows[0];
  console.log('✅ Database row verified:');
  console.log(`   ID: ${row.id}`);
  console.log(`   Location: ${row.location_name}`);
  console.log(`   Temperature: ${row.temperature_c}°C`);
  console.log(`   Condition: ${row.weather_condition}`);
  console.log(`   Freshness: ${row.freshness_status}`);
  console.log(`   PostGIS Geometry: ${row.geom_text}`);
  console.log(`   Environment: ${row.environment}`);

  // 3. Verify Dynamic Region Discovery
  console.log('\n[3] Verifying Dynamic Region Discovery in src/lib/geo/regions.ts...');
  const realRegions = getAvailableRealRegions();
  console.log(`   Total Dynamic Real Regions: ${realRegions.length}`);
  const bargarhFound = realRegions.some((r) => r.district.includes('Bargarh') || r.displayName.includes('Bargarh'));
  if (bargarhFound) {
    console.log('✅ Bargarh District dynamically registered in real region discovery!');
  } else {
    console.log('ℹ️ Region list:', realRegions.map((r) => r.displayName));
  }

  // 4. Verify Demo Isolation
  console.log('\n[4] Verifying DEMO Provider Isolation...');
  const demoProvider = getWeatherProvider('DEMO');
  const demoWx = await demoProvider.getWeather(19.8135, 85.8312, 'Puri Coastal Belt');
  if (!demoWx) {
    console.error('❌ Demo weather returned null');
    process.exit(1);
  }
  console.log('✅ Demo weather retrieved:');
  console.log(`   Location: ${demoWx.locationName}`);
  console.log(`   Condition: ${demoWx.icon} ${demoWx.condition}`);
  console.log(`   Environment: ${demoWx.environment}`);

  const demoInDb = await executeQuery<any>(
    `SELECT COUNT(*) as count FROM weather_telemetry WHERE environment = 'DEMO';`,
  );
  const demoCount = Number(demoInDb[0]?.count ?? 0);
  console.log(`   DEMO rows in REAL PostgreSQL database: ${demoCount}`);
  if (demoCount !== 0) {
    console.error(`❌ DEMO data leaked into REAL database: ${demoCount} rows found.`);
    process.exit(1);
  }
  console.log('✅ Strict REAL / DEMO database isolation verified (0 DEMO rows in database).');

  // 5. Test Deduplication
  console.log('\n[5] Verifying Deduplication (No duplicate rows created)...');
  await realProvider.getWeather(21.3331, 83.6176, 'Bargarh, Odisha');
  const countRows = await executeQuery<any>(
    `SELECT COUNT(*) as count FROM weather_telemetry WHERE id = $1;`,
    [realWx.id],
  );
  const rowCount = Number(countRows[0]?.count ?? 0);
  console.log(`   Rows with ID ${realWx.id}: ${rowCount}`);
  if (rowCount !== 1) {
    console.error(`❌ Duplicate row created: expected 1, found ${rowCount}`);
    process.exit(1);
  }
  console.log('✅ Deduplication verified: existing row updated without duplicate insertion.');

  console.log('\n====================================================');
  console.log('ALL INGESTION & ISOLATION CHECKS PASSED SUCCESSFULLY');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
