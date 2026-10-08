/**
 * Citizen Disaster Reporting — Evidence Intelligence Types
 *
 * ⚠️  PROTOTYPE / DEMO MODEL
 * Context and metadata-based evidence assessment.
 * NOT real computer vision or pixel-level AI analysis yet.
 */

// ── Evidence Kinds & Statuses ────────────────────────────────────────────────

export const EVIDENCE_TYPES = {
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE', // backwards compatibility alias for PHOTO
} as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[keyof typeof EVIDENCE_TYPES];

export const EVIDENCE_STATUSES = {
  AVAILABLE:   'AVAILABLE',
  PROCESSING:  'PROCESSING',
  ASSESSED:    'ASSESSED',
  FLAGGED:     'FLAGGED',
  UNAVAILABLE: 'UNAVAILABLE',
} as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[keyof typeof EVIDENCE_STATUSES];

export const EVIDENCE_SOURCES = {
  DEVICE_CAMERA:         'DEVICE_CAMERA',
  FILE_UPLOAD:           'FILE_UPLOAD',
  COMMUNITY_SUBMISSION:  'COMMUNITY_SUBMISSION',
  CITIZEN_UPLOAD:        'CITIZEN_UPLOAD',
  FIRST_RESPONDER:       'FIRST_RESPONDER',
  FIELD_PATROL:          'FIELD_PATROL',
  DRONE_FEED:            'DRONE_FEED',
  DEMO_DATA:             'DEMO_DATA',
} as const;

export type EvidenceSource = (typeof EVIDENCE_SOURCES)[keyof typeof EVIDENCE_SOURCES];

// ── Technical Metadata ───────────────────────────────────────────────────────

export interface EvidenceMetadata {
  width?: number;
  height?: number;
  durationSeconds?: number;
  deviceModel?: string;
  hasGeolocation?: boolean;
  coordinates?: [number, number];
  locationEstimate?: string;
  exifTimestamp?: string;
  estimatedResolution?: string;
  format?: string;
}

// ── Structured Evidence Item ─────────────────────────────────────────────────

export interface StructuredReportEvidence {
  id: string;
  type: EvidenceType;
  fileName: string;
  mimeType?: string;
  fileSizeBytes?: number;
  sizeBytes?: number;
  fileSize?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  timestamp?: string; // ISO-8601 or empty
  source?: EvidenceSource;
  status?: EvidenceStatus;
  caption?: string;
  metadata?: EvidenceMetadata;
}

// ── Assessment Flags ─────────────────────────────────────────────────────────

export const EVIDENCE_FLAGS = {
  NO_EVIDENCE:          'NO_EVIDENCE',
  INVALID_FILE:         'INVALID_FILE',
  INSUFFICIENT_CONTEXT: 'INSUFFICIENT_CONTEXT',
  SEVERITY_MISMATCH:    'SEVERITY_MISMATCH',
  LOCATION_MISSING:     'LOCATION_MISSING',
  TIME_MISSING:         'TIME_MISSING',
  MULTIPLE_EVIDENCE:    'MULTIPLE_EVIDENCE',
  REQUIRES_REVIEW:      'REQUIRES_REVIEW',
} as const;

export type EvidenceFlag = (typeof EVIDENCE_FLAGS)[keyof typeof EVIDENCE_FLAGS];

export type EvidenceQualityIndicator =
  | 'HIGH_QUALITY'
  | 'ADEQUATE'
  | 'LIMITED'
  | 'INSUFFICIENT';

export type ContextConsistency =
  | 'CONSISTENT'
  | 'PLAUSIBLE'
  | 'UNCORROBORATED'
  | 'INCONSISTENT';

export type EvidenceConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

// ── Assessment Result ────────────────────────────────────────────────────────

export interface PreliminaryEvidenceAssessment {
  /** Overall evidence completeness score (0–100) */
  completeness: number;
  /** Rating of evidence resolution, quantity, and metadata */
  qualityIndicator: EvidenceQualityIndicator;
  /** Contextual match between reported hazard, location, severity, and media */
  contextConsistency: ContextConsistency;
  /** Preliminary confidence level based strictly on metadata/context */
  confidence: EvidenceConfidence;
  /** Composite score (0–100) */
  score: number;
  /** Informational diagnostic flags */
  flags: EvidenceFlag[];
  /** Human-readable checklist of assessed factors */
  indicators: string[];
  /** Summary description with disclaimer */
  summary: string;
  /** Timestamp when assessment was computed */
  assessedAt: string;
  /** Architecture placeholder for future real Computer Vision plug-in */
  futureCvCompatibility?: FutureCvCompatibility;
}

// ── Future Computer Vision Architecture Readiness ────────────────────────────

export interface FutureCvCompatibility {
  supportedPipelines: ('FLOOD_WATER_SEGMENTATION' | 'STRUCTURAL_DAMAGE_DETECTION' | 'DEBRIS_CLASSIFICATION' | 'CROWD_DENSITY')[];
  readinessStatus: 'READY_FOR_CV_PIPELINE' | 'INSUFFICIENT_IMAGE_DATA' | 'VIDEO_STREAM_REQUIRED';
  modelTargetNote: string;
  pipelineTarget?: string;
  status?: string;
  notes?: string;
}

/** Interface for future CV integration (NOT implemented in prototype) */
export interface FutureComputerVisionResult {
  detectedObjects: { label: string; confidence: number; boundingBox?: [number, number, number, number] }[];
  visualDamageScore: number;
  inundationDetected: boolean;
  modelIdentifier: string;
  processedAt: string;
}
