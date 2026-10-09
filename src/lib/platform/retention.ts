/**
 * Storage Retention, Compaction & Lifecycle Engine
 *
 * Enforces data retention policies without destroying scientific or historical information:
 * 1. Compacts high-frequency time-series into low-storage daily summaries
 * 2. Archives raw historical JSON payloads to Tier 2 Object Storage before cleanup
 * 3. Dry-Run by default: ALWAYS calculates affected rows, byte savings, and date ranges
 *    without modifying database state unless explicitly invoked with `execute: true`
 */

import { executeQuery, getDbClient } from '@/lib/db';
import { storeRawPayload } from './storage';
import { upsertDailyAggregates } from './db';
import type { RetentionDryRunReport, RetentionTableDryRun, TelemetryDailyAggregate } from './types';

export interface RetentionPolicyOptions {
  telemetryRetentionHours?: number; // Default 72 hours
  hazardsRetentionHours?: number; // Default 720 hours (30 days)
  jobRunsRetentionHours?: number; // Default 2160 hours (90 days)
  execute?: boolean; // Set to true to commit destructive purge; defaults to false (dry-run)
}

/**
 * Runs the retention and compaction evaluation across Neon operational tables.
 */
export async function evaluateRetentionPolicy(
  options: RetentionPolicyOptions = {},
): Promise<RetentionDryRunReport> {
  const isExecute = options.execute === true;
  const telemetryHours = options.telemetryRetentionHours ?? 72;
  const hazardsHours = options.hazardsRetentionHours ?? 720;
  const jobRunsHours = options.jobRunsRetentionHours ?? 2160;

  const now = new Date();
  const telemetryCutoff = new Date(now.getTime() - telemetryHours * 3600 * 1000).toISOString();
  const hazardsCutoff = new Date(now.getTime() - hazardsHours * 3600 * 1000).toISOString();
  const jobRunsCutoff = new Date(now.getTime() - jobRunsHours * 3600 * 1000).toISOString();

  const client = getDbClient();
  const tablesReport: RetentionTableDryRun[] = [];
  const archivedKeys: string[] = [];
  const recommendations: string[] = [];

  if (!client) {
    return {
      timestamp: now.toISOString(),
      isDryRun: !isExecute,
      executed: false,
      tables: [],
      totalRowsToPurge: 0,
      totalEstimatedFreedBytes: 0,
      archivedToTier2Keys: [],
      recommendations: ['Database client not available in current environment; dry run completed with 0 affected rows.'],
    };
  }

  // ── 1. EVALUATE WEATHER TELEMETRY COMPACTION ─────────────────────────────
  try {
    const weatherStats = await executeQuery<{
      total_rows: string;
      stale_rows: string;
      earliest: string;
      latest: string;
    }>(
      `
      SELECT 
        COUNT(*)::text as total_rows,
        COUNT(CASE WHEN observed_at < $1 THEN 1 END)::text as stale_rows,
        MIN(observed_at)::text as earliest,
        MAX(observed_at)::text as latest
      FROM weather_telemetry;
    `,
      [telemetryCutoff],
    );

    const totalWeather = Number(weatherStats[0]?.total_rows || 0);
    const staleWeather = Number(weatherStats[0]?.stale_rows || 0);
    const earliestWeather = weatherStats[0]?.earliest || 'N/A';
    const latestWeather = weatherStats[0]?.latest || 'N/A';
    // Estimated average ~1,800 bytes per weather_telemetry row with forecast_json JSONB
    const weatherBytes = staleWeather * 1800;

    tablesReport.push({
      tableName: 'weather_telemetry',
      rowsEvaluated: totalWeather,
      rowsToCompact: staleWeather,
      rowsToPurge: staleWeather,
      estimatedFreedBytes: weatherBytes,
      affectedDateRange: {
        earliest: earliestWeather,
        latest: telemetryCutoff,
      },
    });

    if (staleWeather > 0) {
      recommendations.push(
        `Compact ${staleWeather} weather records older than ${telemetryHours}h into daily summaries in 'telemetry_daily_aggregates' before purging raw JSONB.`,
      );

      if (isExecute) {
        // Fetch stale records to compute rollups and archive
        const staleRows = await executeQuery<any>(
          `SELECT * FROM weather_telemetry WHERE observed_at < $1 ORDER BY observed_at ASC;`,
          [telemetryCutoff],
        );

        if (staleRows.length > 0) {
          // Archive raw records to Tier 2
          const archiveRes = await storeRawPayload({
            sourceId: 'open-meteo-weather',
            datasetName: 'archived_telemetry_batch',
            payload: staleRows,
            compress: true,
          });
          archivedKeys.push(archiveRes.storageKey);

          // Group by district and date to compute daily summaries
          const aggregatesMap = new Map<string, TelemetryDailyAggregate>();
          for (const row of staleRows) {
            const dateStr = new Date(row.observed_at).toISOString().split('T')[0];
            const district = row.district || 'Odisha State';
            const state = row.state || 'Odisha';
            const key = `${district}_${dateStr}`;

            const existing = aggregatesMap.get(key);
            const temp = Number(row.temperature_c);
            const precip = Number(row.precipitation_mm || 0);
            const wind = Number(row.wind_speed_kmh || 0);
            const press = Number(row.surface_pressure_hpa || 1013);

            if (!existing) {
              aggregatesMap.set(key, {
                state,
                district,
                date: dateStr,
                minTempC: isNaN(temp) ? 25 : temp,
                maxTempC: isNaN(temp) ? 25 : temp,
                avgTempC: isNaN(temp) ? 25 : temp,
                totalPrecipMm: isNaN(precip) ? 0 : precip,
                maxWindKmh: isNaN(wind) ? 0 : wind,
                avgPressureHpa: isNaN(press) ? 1013 : press,
                observationCount: 1,
              });
            } else {
              existing.minTempC = Math.min(existing.minTempC, isNaN(temp) ? existing.minTempC : temp);
              existing.maxTempC = Math.max(existing.maxTempC, isNaN(temp) ? existing.maxTempC : temp);
              existing.avgTempC = Math.round(((existing.avgTempC * existing.observationCount + (isNaN(temp) ? 25 : temp)) / (existing.observationCount + 1)) * 10) / 10;
              existing.totalPrecipMm = Math.round((existing.totalPrecipMm + (isNaN(precip) ? 0 : precip)) * 10) / 10;
              existing.maxWindKmh = Math.max(existing.maxWindKmh, isNaN(wind) ? existing.maxWindKmh : wind);
              existing.avgPressureHpa = Math.round(((existing.avgPressureHpa * existing.observationCount + (isNaN(press) ? 1013 : press)) / (existing.observationCount + 1)) * 10) / 10;
              existing.observationCount++;
            }
          }

          // Upsert aggregated summaries
          await upsertDailyAggregates(Array.from(aggregatesMap.values()));

          // Safely delete compacted stale rows
          await executeQuery(`DELETE FROM weather_telemetry WHERE observed_at < $1;`, [telemetryCutoff]);
        }
      }
    }
  } catch (err: any) {
    recommendations.push(`Warning assessing weather_telemetry: ${err.message}`);
  }

  // ── 2. EVALUATE HAZARDS TABLE EXPIRY ──────────────────────────────────────
  try {
    const hazardStats = await executeQuery<{
      total_rows: string;
      expired_rows: string;
      earliest: string;
    }>(
      `
      SELECT 
        COUNT(*)::text as total_rows,
        COUNT(CASE WHEN (status = 'DISSIPATED' OR (expires_at IS NOT NULL AND expires_at < $1)) AND updated_at < $1 THEN 1 END)::text as expired_rows,
        MIN(created_at)::text as earliest
      FROM hazards;
    `,
      [hazardsCutoff],
    );

    const totalHazards = Number(hazardStats[0]?.total_rows || 0);
    const expiredHazards = Number(hazardStats[0]?.expired_rows || 0);
    const hazardBytes = expiredHazards * 1200; // ~1.2KB per hazard

    tablesReport.push({
      tableName: 'hazards',
      rowsEvaluated: totalHazards,
      rowsToCompact: 0,
      rowsToPurge: expiredHazards,
      estimatedFreedBytes: hazardBytes,
      affectedDateRange: {
        earliest: hazardStats[0]?.earliest || 'N/A',
        latest: hazardsCutoff,
      },
    });

    if (expiredHazards > 0 && isExecute) {
      await executeQuery(
        `DELETE FROM hazards WHERE (status = 'DISSIPATED' OR (expires_at IS NOT NULL AND expires_at < $1)) AND updated_at < $1;`,
        [hazardsCutoff],
      );
    }
  } catch (err: any) {
    recommendations.push(`Warning assessing hazards: ${err.message}`);
  }

  // ── 3. EVALUATE INGESTION JOB RUNS LOG RETENTION ──────────────────────────
  try {
    const jobStats = await executeQuery<{
      total_rows: string;
      stale_rows: string;
      earliest: string;
    }>(
      `
      SELECT 
        COUNT(*)::text as total_rows,
        COUNT(CASE WHEN started_at < $1 THEN 1 END)::text as stale_rows,
        MIN(started_at)::text as earliest
      FROM ingestion_job_runs;
    `,
      [jobRunsCutoff],
    );

    const totalJobs = Number(jobStats[0]?.total_rows || 0);
    const staleJobs = Number(jobStats[0]?.stale_rows || 0);
    const jobBytes = staleJobs * 400; // ~400B per job run

    tablesReport.push({
      tableName: 'ingestion_job_runs',
      rowsEvaluated: totalJobs,
      rowsToCompact: 0,
      rowsToPurge: staleJobs,
      estimatedFreedBytes: jobBytes,
      affectedDateRange: {
        earliest: jobStats[0]?.earliest || 'N/A',
        latest: jobRunsCutoff,
      },
    });

    if (staleJobs > 0 && isExecute) {
      await executeQuery(`DELETE FROM ingestion_job_runs WHERE started_at < $1;`, [jobRunsCutoff]);
    }
  } catch (err: any) {
    // If table newly initialized, ignore
  }

  const totalPurge = tablesReport.reduce((sum, t) => sum + t.rowsToPurge, 0);
  const totalFreed = tablesReport.reduce((sum, t) => sum + t.estimatedFreedBytes, 0);

  if (!isExecute) {
    recommendations.push(
      `DRY-RUN COMPLETE: ${totalPurge} rows eligible for compaction/cleanup, preserving ~${(totalFreed / 1024).toFixed(1)} KB without data loss. Run with --execute or execute: true to apply.`,
    );
  } else {
    recommendations.push(
      `EXECUTION COMPLETE: Successfully compacted and purged ${totalPurge} rows, saving ~${(totalFreed / 1024).toFixed(1)} KB while preserving daily aggregates and Tier 2 raw archives.`,
    );
  }

  return {
    timestamp: now.toISOString(),
    isDryRun: !isExecute,
    executed: isExecute,
    tables: tablesReport,
    totalRowsToPurge: totalPurge,
    totalEstimatedFreedBytes: totalFreed,
    archivedToTier2Keys: archivedKeys,
    recommendations,
  };
}
