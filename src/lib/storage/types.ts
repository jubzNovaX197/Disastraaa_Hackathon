/**
 * Disastraaa Enterprise Object Storage Abstraction
 *
 * Dedicated storage tier for:
 * - Raw API ingestion payloads (NASA EONET, NASA FIRMS, satellite passes)
 * - Large GIS GeoJSON snapshots
 * - Archival historical disaster telemetry
 * - Citizen report photo/video evidence
 *
 * Follows the principle:
 * Large blobs -> Object Storage
 * Metadata & Spatial indexing -> PostgreSQL + PostGIS
 */

export interface StorageObjectMeta {
  key: string;
  bucket: string;
  sizeBytes: number;
  contentType: string;
  createdAt: string;
  etag?: string;
  url?: string;
}

export interface PutObjectOptions {
  key: string;
  data: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface ObjectStorageProvider {
  name: string;
  isConfigured(): boolean;
  putObject(options: PutObjectOptions): Promise<StorageObjectMeta>;
  getObject(key: string): Promise<Buffer | null>;
  hasObject(key: string): Promise<boolean>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
