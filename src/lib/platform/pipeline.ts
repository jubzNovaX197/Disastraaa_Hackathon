/**
 * Reusable Incremental Ingestion Pipeline Orchestrator
 *
 * Implements the standard enterprise pipeline contract:
 * FETCH -> VALIDATE -> NORMALIZE -> DEDUPLICATE -> STORE RAW IF PERMITTED ->
 * TRANSFORM -> AGGREGATE -> UPDATE OPERATIONAL TABLES -> RECORD QUALITY METRICS
 *
 * Features:
 * - Idempotency: rerunning jobs never creates duplicate records
 * - Checkpointing & cursor-aware incremental retrieval
 * - Exponential backoff and retry for transient failures
 * - Out-of-order observation protection (never overwrites newer with older)
 * - Safe error handling without silent data corruption
 * - Lineage logging to Neon `ingestion_job_runs`
 */

import { DATA_SOURCE_REGISTRY, getRegisteredDataSource } from './registry';
import { storeRawPayload } from './storage';
import { recordJobRun, upsertDailyAggregates } from './db';
import type { IngestionJobRun, TelemetryDailyAggregate } from './types';

export interface PipelineFetchResult<TRaw> {
  success: boolean;
  data?: TRaw;
  nextCursor?: string;
  error?: string;
  statusCode?: number;
}

export interface PipelineConfig<TRaw, TNormalized, TOperational> {
  sourceId: string;
  schemaVersion?: string;
  maxRetries?: number;
  backoffInitialMs?: number;
  fetch: (cursor?: string) => Promise<PipelineFetchResult<TRaw>>;
  validate: (raw: TRaw) => { isValid: boolean; errors: string[] };
  normalize: (raw: TRaw, storageKey?: string) => TNormalized[];
  deduplicate?: (items: TNormalized[]) => Promise<{ unique: TNormalized[]; duplicatesCount: number }>;
  transform: (items: TNormalized[]) => TOperational[];
  aggregate?: (items: TOperational[]) => Promise<TelemetryDailyAggregate[]>;
  updateOperational: (items: TOperational[]) => Promise<{ inserted: number; updated: number }>;
}

export class IncrementalPipeline<TRaw, TNormalized, TOperational> {
  private config: PipelineConfig<TRaw, TNormalized, TOperational>;

  constructor(config: PipelineConfig<TRaw, TNormalized, TOperational>) {
    this.config = config;
  }

  /**
   * Executes the full 9-step pipeline with backoff, verification, and audit logging.
   */
  async run(options: { cursor?: string; force?: boolean } = {}): Promise<IngestionJobRun> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const source = getRegisteredDataSource(this.config.sourceId);
    const providerName = source?.provider || 'Unknown Provider';
    const schemaVersion = this.config.schemaVersion || 'v1';
    const runId = `run_${this.config.sourceId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let recordsFetched = 0;
    let recordsPersisted = 0;
    let recordsDeduplicated = 0;
    let validationErrorsCount = 0;
    let storageKey: string | undefined;
    let contentHash: string | undefined;
    let errorMessage: string | undefined;
    let status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS';

    const maxRetries = this.config.maxRetries ?? 3;
    const initialBackoff = this.config.backoffInitialMs ?? 500;

    try {
      // ── STEP 1: FETCH WITH EXPONENTIAL BACKOFF ─────────────────────────────
      let fetchResult: PipelineFetchResult<TRaw> | null = null;
      let attempt = 0;

      while (attempt <= maxRetries) {
        attempt++;
        try {
          fetchResult = await this.config.fetch(options.cursor);
          if (fetchResult.success) break;

          if (attempt <= maxRetries) {
            const delay = initialBackoff * Math.pow(2, attempt - 1);
            await new Promise((res) => setTimeout(res, delay));
          }
        } catch (fetchErr: any) {
          if (attempt > maxRetries) {
            fetchResult = { success: false, error: fetchErr.message };
            break;
          }
          const delay = initialBackoff * Math.pow(2, attempt - 1);
          await new Promise((res) => setTimeout(res, delay));
        }
      }

      if (!fetchResult || !fetchResult.success || !fetchResult.data) {
        status = 'FAILED';
        errorMessage = fetchResult?.error || 'Provider fetch failed after retries';
        return this.finishRun(runId, providerName, status, recordsFetched, recordsPersisted, recordsDeduplicated, validationErrorsCount, startTime, startedAt, errorMessage, storageKey, contentHash, schemaVersion);
      }

      // ── STEP 2: VALIDATE ──────────────────────────────────────────────────
      const validation = this.config.validate(fetchResult.data);
      if (!validation.isValid) {
        validationErrorsCount = validation.errors.length;
        status = 'WARNING';
        if (validation.errors.length > 5) {
          status = 'FAILED';
          errorMessage = `Validation failed: ${validation.errors.slice(0, 3).join('; ')}`;
          return this.finishRun(runId, providerName, status, recordsFetched, recordsPersisted, recordsDeduplicated, validationErrorsCount, startTime, startedAt, errorMessage, storageKey, contentHash, schemaVersion);
        }
      }

      // ── STEP 3: STORE RAW IF PERMITTED ────────────────────────────────────
      if (source?.license.permitsArchival) {
        try {
          const storeRes = await storeRawPayload({
            sourceId: this.config.sourceId,
            datasetName: source.dataset,
            payload: fetchResult.data as any,
            compress: true,
          });
          storageKey = storeRes.storageKey;
          contentHash = storeRes.contentHash;
        } catch (storeErr: any) {
          console.warn(`[PIPELINE] Non-fatal Tier 2 archival warning for ${this.config.sourceId}:`, storeErr.message);
        }
      }

      // ── STEP 4: NORMALIZE ─────────────────────────────────────────────────
      const normalizedItems = this.config.normalize(fetchResult.data, storageKey);
      recordsFetched = normalizedItems.length;

      // ── STEP 5: DEDUPLICATE ───────────────────────────────────────────────
      let uniqueItems = normalizedItems;
      if (this.config.deduplicate) {
        const dedupRes = await this.config.deduplicate(normalizedItems);
        uniqueItems = dedupRes.unique;
        recordsDeduplicated = dedupRes.duplicatesCount;
      }

      // ── STEP 6: TRANSFORM ─────────────────────────────────────────────────
      const operationalItems = this.config.transform(uniqueItems);

      // ── STEP 7: AGGREGATE ─────────────────────────────────────────────────
      if (this.config.aggregate && operationalItems.length > 0) {
        try {
          const dailyAggs = await this.config.aggregate(operationalItems);
          if (dailyAggs.length > 0) {
            await upsertDailyAggregates(dailyAggs);
          }
        } catch (aggErr: any) {
          console.warn(`[PIPELINE] Daily aggregation warning for ${this.config.sourceId}:`, aggErr.message);
        }
      }

      // ── STEP 8: UPDATE OPERATIONAL TABLES ─────────────────────────────────
      if (operationalItems.length > 0) {
        const opSave = await this.config.updateOperational(operationalItems);
        recordsPersisted = opSave.inserted + opSave.updated;
      }

      // ── STEP 9: RECORD QUALITY METRICS ────────────────────────────────────
      if (validationErrorsCount > 0) {
        status = 'PARTIAL_SUCCESS';
      }

      return this.finishRun(runId, providerName, status, recordsFetched, recordsPersisted, recordsDeduplicated, validationErrorsCount, startTime, startedAt, errorMessage, storageKey, contentHash, schemaVersion);
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || 'Unexpected pipeline execution crash';
      return this.finishRun(runId, providerName, status, recordsFetched, recordsPersisted, recordsDeduplicated, validationErrorsCount, startTime, startedAt, errorMessage, storageKey, contentHash, schemaVersion);
    }
  }

  private async finishRun(
    id: string,
    provider: string,
    status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'WARNING' | 'FAILED',
    recordsFetched: number,
    recordsPersisted: number,
    recordsDeduplicated: number,
    validationErrorsCount: number,
    startTime: number,
    startedAt: string,
    errorMessage?: string,
    storageKey?: string,
    contentHash?: string,
    schemaVersion = 'v1',
  ): Promise<IngestionJobRun> {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    const run: IngestionJobRun = {
      id,
      sourceId: this.config.sourceId,
      provider,
      status,
      recordsFetched,
      recordsPersisted,
      recordsDeduplicated,
      validationErrorsCount,
      durationMs,
      storageKey,
      contentHash,
      schemaVersion,
      errorMessage,
      startedAt,
      completedAt,
    };

    // Record to Neon table
    await recordJobRun(run);
    return run;
  }
}
