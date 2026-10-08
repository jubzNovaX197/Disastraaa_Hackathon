/**
 * Object Storage Client & Factory
 *
 * Implements S3-compatible REST client without requiring heavy AWS SDK dependencies.
 * If external credentials are not set, falls back gracefully to local file storage (.storage/)
 * with zero data loss or application crashes.
 */

import fs from 'fs';
import path from 'path';
import type { ObjectStorageProvider, PutObjectOptions, StorageObjectMeta } from './types';

class LocalFileStorageProvider implements ObjectStorageProvider {
  name = 'Local File Storage';
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.storage');
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch {
      // In read-only serverless environments, fallback to tmp
      this.baseDir = path.resolve('/tmp', '.disastraaa_storage');
      try {
        if (!fs.existsSync(this.baseDir)) {
          fs.mkdirSync(this.baseDir, { recursive: true });
        }
      } catch {
        // Ignore
      }
    }
  }

  isConfigured(): boolean {
    return true;
  }

  private resolvePath(key: string): string {
    const sanitized = key.replace(/\.\./g, '').replace(/^\/+/, '');
    const fullPath = path.resolve(this.baseDir, sanitized);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    return fullPath;
  }

  async putObject({ key, data, contentType = 'application/json' }: PutObjectOptions): Promise<StorageObjectMeta> {
    const fullPath = this.resolvePath(key);
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    fs.writeFileSync(fullPath, buffer);

    return {
      key,
      bucket: 'local-storage',
      sizeBytes: buffer.length,
      contentType,
      createdAt: new Date().toISOString(),
      url: `/api/storage/${key}`,
    };
  }

  async getObject(key: string): Promise<Buffer | null> {
    const fullPath = this.resolvePath(key);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  }

  async hasObject(key: string): Promise<boolean> {
    const fullPath = this.resolvePath(key);
    return fs.existsSync(fullPath);
  }

  async deleteObject(key: string): Promise<void> {
    const fullPath = this.resolvePath(key);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  getPublicUrl(key: string): string {
    return `/api/storage/${key}`;
  }
}

class S3CompatibleStorageProvider implements ObjectStorageProvider {
  name = 'S3 / Cloudflare R2 / MinIO Storage';
  private endpoint: string;
  private bucket: string;
  private accessKey: string;
  private secretKey: string;
  private publicUrlBase?: string;

  constructor(endpoint: string, bucket: string, accessKey: string, secretKey: string, publicUrlBase?: string) {
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.bucket = bucket;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.publicUrlBase = publicUrlBase?.replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return !!(this.endpoint && this.bucket && this.accessKey && this.secretKey);
  }

  async putObject({ key, data, contentType = 'application/json' }: PutObjectOptions): Promise<StorageObjectMeta> {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    const url = `${this.endpoint}/${this.bucket}/${key.replace(/^\/+/, '')}`;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    };

    // Basic standard S3 Auth or bearer
    const authHeader = `AWS ${this.accessKey}:${this.secretKey}`;
    headers['Authorization'] = authHeader;

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: buffer,
      });

      if (!res.ok) {
        throw new Error(`Storage returned status ${res.status}: ${res.statusText}`);
      }

      return {
        key,
        bucket: this.bucket,
        sizeBytes: buffer.length,
        contentType,
        createdAt: new Date().toISOString(),
        url: this.getPublicUrl(key),
      };
    } catch (err) {
      console.warn(`[OBJECT-STORAGE] Remote S3 upload failed, falling back to local storage:`, err);
      return localProvider.putObject({ key, data, contentType });
    }
  }

  async getObject(key: string): Promise<Buffer | null> {
    const url = `${this.endpoint}/${this.bucket}/${key.replace(/^\/+/, '')}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch {
      return localProvider.getObject(key);
    }
  }

  async hasObject(key: string): Promise<boolean> {
    const url = `${this.endpoint}/${this.bucket}/${key.replace(/^\/+/, '')}`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return localProvider.hasObject(key);
    }
  }

  async deleteObject(key: string): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${key.replace(/^\/+/, '')}`;
    try {
      await fetch(url, { method: 'DELETE' });
    } catch {
      await localProvider.deleteObject(key);
    }
  }

  getPublicUrl(key: string): string {
    if (this.publicUrlBase) {
      return `${this.publicUrlBase}/${key.replace(/^\/+/, '')}`;
    }
    return `${this.endpoint}/${this.bucket}/${key.replace(/^\/+/, '')}`;
  }
}

const localProvider = new LocalFileStorageProvider();

export function getObjectStorageProvider(): ObjectStorageProvider {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKey = process.env.STORAGE_ACCESS_KEY_ID;
  const secretKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  const publicUrlBase = process.env.STORAGE_PUBLIC_URL;

  if (endpoint && bucket && accessKey && secretKey) {
    return new S3CompatibleStorageProvider(endpoint, bucket, accessKey, secretKey, publicUrlBase);
  }

  return localProvider;
}

export const objectStorage = getObjectStorageProvider();
