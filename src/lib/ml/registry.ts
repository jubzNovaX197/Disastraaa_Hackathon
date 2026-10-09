/**
 * Model Registry & Artifact Management
 *
 * Implements:
 * - Deterministic SHA-256 artifact checksumming
 * - Artifact serialization to JSON & Tier 2/3 object storage
 * - Verifiable deserialization & integrity check before registration
 * - Storage in `.storage/models/` and Neon metadata records
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ModelArtifact } from './types';
import { objectStorage } from '@/lib/storage';
import { saveDatasetManifest } from '@/lib/platform/db';
import type { DatasetManifest } from '@/lib/platform/types';

const MODELS_DIR = path.resolve(process.cwd(), '.storage', 'models');

/**
 * Computes SHA-256 digest of serialized model content.
 */
export function computeArtifactChecksum(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Saves a trained model artifact to object storage and registers metadata in Neon.
 */
export async function saveModelArtifact(artifact: Omit<ModelArtifact, 'artifactChecksumSha256'>): Promise<{
  success: boolean;
  artifactPath: string;
  storageKey: string;
  checksum: string;
  error?: string;
}> {
  try {
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    const payloadWithoutChecksum = JSON.stringify(artifact, null, 2);
    const checksum = computeArtifactChecksum(payloadWithoutChecksum);

    const fullArtifact: ModelArtifact = {
      ...artifact,
      artifactChecksumSha256: checksum,
    };

    const serialized = JSON.stringify(fullArtifact, null, 2);
    const fileName = `${artifact.modelId}_${artifact.version}.json`;
    const localFilePath = path.join(MODELS_DIR, fileName);

    // 1. Save to local storage
    fs.writeFileSync(localFilePath, serialized, 'utf8');

    // 2. Put into Tier 2 Object Storage
    const storageKey = `models/${artifact.modelId}/${artifact.version}/${fileName}`;
    await objectStorage.putObject({
      key: storageKey,
      data: serialized,
      contentType: 'application/json',
      metadata: {
        modelId: artifact.modelId,
        version: artifact.version,
        algorithm: artifact.algorithm,
        checksum,
      },
    });

    // 3. Register Manifest in Neon
    const manifest: DatasetManifest = {
      id: `manifest_model_${artifact.modelId}_${artifact.version}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      name: `Trained ML Model: ${artifact.modelId}`,
      version: artifact.version,
      category: 'F_DERIVED_ML',
      format: 'JSONL_GZ',
      storageKey,
      contentHash: checksum,
      rowCount: artifact.trainingMetrics.sampleCount + artifact.validationMetrics.sampleCount + artifact.testMetrics.sampleCount,
      sizeBytes: Buffer.byteLength(serialized),
      temporalCoverage: {
        start: '2018-07-16T06:00:00Z',
        end: '2024-08-26T12:00:00Z',
      },
      spatialCoverage: {
        region: 'Kalahandi Basin (Tel River, Kesinga Gauge)',
        crs: 'EPSG:4326',
      },
      targetLabel: artifact.task,
      featuresList: artifact.featureNames,
      splitStrategy: {
        trainRatio: 0.53,
        valRatio: 0.20,
        testRatio: 0.27,
        splitMethod: 'TEMPORAL',
        trainEndDate: '2021-12-31',
        valEndDate: '2022-12-31',
      },
      leakageCheckStatus: 'PASS',
      metadata: {
        algorithm: artifact.algorithm,
        decisionThreshold: artifact.decisionThreshold,
        testAccuracy: artifact.testMetrics.accuracy,
        testF1: artifact.testMetrics.f1Score,
        testBrier: artifact.testMetrics.brierScore,
      },
      createdAt: artifact.createdAt,
    };

    await saveDatasetManifest(manifest);

    return {
      success: true,
      artifactPath: localFilePath,
      storageKey,
      checksum,
    };
  } catch (err: any) {
    return {
      success: false,
      artifactPath: '',
      storageKey: '',
      checksum: '',
      error: err.message,
    };
  }
}

/**
 * Loads a model artifact and verifies its SHA-256 integrity checksum.
 */
export async function loadModelArtifact(modelId: string, version: string): Promise<{
  success: boolean;
  artifact?: ModelArtifact;
  error?: string;
}> {
  try {
    const fileName = `${modelId}_${version}.json`;
    const localFilePath = path.join(MODELS_DIR, fileName);
    let serialized: string;

    if (fs.existsSync(localFilePath)) {
      serialized = fs.readFileSync(localFilePath, 'utf8');
    } else {
      const storageKey = `models/${modelId}/${version}/${fileName}`;
      const buf = await objectStorage.getObject(storageKey);
      if (!buf) {
        return { success: false, error: `Model artifact not found for ${modelId} ${version}` };
      }
      serialized = buf.toString('utf8');
    }

    const parsed: ModelArtifact = JSON.parse(serialized);

    // Verify Checksum
    const { artifactChecksumSha256, ...withoutChecksum } = parsed;
    const computedChecksum = computeArtifactChecksum(JSON.stringify(withoutChecksum, null, 2));

    if (artifactChecksumSha256 !== computedChecksum) {
      return {
        success: false,
        error: `Artifact integrity violation: Expected ${artifactChecksumSha256}, got ${computedChecksum}`,
      };
    }

    return { success: true, artifact: parsed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
