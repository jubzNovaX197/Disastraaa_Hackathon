/**
 * Citizen Disaster Reporting — Evidence Intelligence Rules
 *
 * ⚠️  PROTOTYPE / DEMO RULES
 * Context and metadata validation rules.
 * NOT pixel-level computer vision.
 */

import type {
  ContextConsistency,
  EvidenceConfidence,
  EvidenceFlag,
  EvidenceQualityIndicator,
} from './types';

// ── Validation Limits ────────────────────────────────────────────────────────

export const EVIDENCE_LIMITS = {
  MAX_FILES: 5,
  MAX_PHOTO_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_VIDEO_SIZE_BYTES: 30 * 1024 * 1024, // 30 MB
  SUPPORTED_IMAGE_MIMES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ],
  SUPPORTED_VIDEO_MIMES: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/ogg',
  ],
  SUPPORTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.mov'],
} as const;

// ── Evidence Flag Configurations ─────────────────────────────────────────────

export const EVIDENCE_FLAG_CONFIG: Record<
  EvidenceFlag,
  {
    label: string;
    icon: string;
    bg: string;
    text: string;
    color: string;
    border: string;
    description: string;
  }
> = {
  NO_EVIDENCE: {
    label: 'No Evidence Attached',
    icon: '📷',
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    color: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
    description: 'Report contains textual observations only; no photos or videos were attached.',
  },
  INVALID_FILE: {
    label: 'Invalid / Unsupported File',
    icon: '⚠️',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    color: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    description: 'File size exceeds prototype limit or uses an unverified format.',
  },
  INSUFFICIENT_CONTEXT: {
    label: 'Evidence Context Requires Review',
    icon: '🔍',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    color: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    description: 'Brief description makes it difficult to correlate evidence with exact incident site.',
  },
  SEVERITY_MISMATCH: {
    label: 'Severity / Evidence Mismatch',
    icon: '⚡',
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    text: 'text-orange-600 dark:text-orange-400',
    color: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    description: 'Critical or High severity was declared but no visual evidence was provided.',
  },
  LOCATION_MISSING: {
    label: 'Location Information Missing',
    icon: '📍',
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    color: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
    description: 'Geographic coordinates or landmark details are absent.',
  },
  TIME_MISSING: {
    label: 'Timestamp Missing',
    icon: '🕒',
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    color: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
    description: 'Observation timestamp was not recorded.',
  },
  MULTIPLE_EVIDENCE: {
    label: 'Multiple Evidence Items Attached',
    icon: '📸',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    color: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    description: 'Multiple angles or media items corroborate the ground observation.',
  },
  REQUIRES_REVIEW: {
    label: 'Requires Priority Review',
    icon: '🚨',
    bg: 'bg-rose-500/15 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400 font-bold',
    color: 'text-rose-600 dark:text-rose-400 font-bold',
    border: 'border-rose-500/40',
    description: 'High-impact physical damage or life-safety risk flagged for authority verification.',
  },
};

// ── Quality Indicator Metadata ────────────────────────────────────────────────

export const QUALITY_CONFIG: Record<
  EvidenceQualityIndicator,
  { label: string; badge: string; bg: string; color: string; border: string; description: string }
> = {
  HIGH_QUALITY: {
    label: 'High-Quality Evidence',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/15',
    color: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    description: 'High-resolution media with technical timestamp & device specs.',
  },
  ADEQUATE: {
    label: 'Adequate Quality',
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    bg: 'bg-sky-500/15',
    color: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30',
    description: 'Standard media capture sufficient for incident triage.',
  },
  LIMITED: {
    label: 'Limited Quality',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    bg: 'bg-amber-500/15',
    color: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    description: 'Low resolution or incomplete metadata; manual review recommended.',
  },
  INSUFFICIENT: {
    label: 'Insufficient Quality / None',
    badge: 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30',
    bg: 'bg-slate-500/15',
    color: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-500/30',
    description: 'No visual evidence or unverified format.',
  },
};

// ── Consistency Metadata ──────────────────────────────────────────────────────

export const CONSISTENCY_CONFIG: Record<
  ContextConsistency,
  { label: string; badge: string; bg: string; color: string; border: string; description: string }
> = {
  CONSISTENT: {
    label: 'Contextually Consistent',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/15',
    color: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    description: 'Evidence aligns with reported hazard type, severity, and nearby threat zones.',
  },
  PLAUSIBLE: {
    label: 'Plausible Ground Observation',
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    bg: 'bg-sky-500/15',
    color: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30',
    description: 'Evidence plausible but reported outside primary active hazard footprint.',
  },
  UNCORROBORATED: {
    label: 'Uncorroborated Context',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    bg: 'bg-amber-500/15',
    color: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    description: 'Limited field information available to cross-reference with active warnings.',
  },
  INCONSISTENT: {
    label: 'Inconsistent / Contradictory',
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    bg: 'bg-rose-500/15',
    color: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    description: 'Reported severity or hazard contradicts official sensor benchmarks.',
  },
};

// ── Confidence Metadata ───────────────────────────────────────────────────────

export const EVIDENCE_CONFIDENCE_CONFIG: Record<
  EvidenceConfidence,
  { label: string; badge: string; bg: string; color: string; border: string }
> = {
  HIGH: {
    label: 'High Evidence Confidence',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    bg: 'bg-emerald-500/15',
    color: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  MEDIUM: {
    label: 'Medium Evidence Confidence',
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    bg: 'bg-sky-500/15',
    color: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30',
  },
  LOW: {
    label: 'Low Evidence Confidence',
    badge: 'bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30',
    bg: 'bg-slate-500/15',
    color: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
};

// ── Client-Side File Validator ────────────────────────────────────────────────

export function validateEvidenceFile(file: File): { valid: boolean; error?: string } {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `Unsupported file type "${file.name}". Supported: JPG, PNG, WEBP, MP4, WEBM.`,
    };
  }

  if (isImage && file.size > EVIDENCE_LIMITS.MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image "${file.name}" exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    };
  }

  if (isVideo && file.size > EVIDENCE_LIMITS.MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video "${file.name}" exceeds 30 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
    };
  }

  return { valid: true };
}
