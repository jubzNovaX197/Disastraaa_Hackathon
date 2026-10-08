/**
 * Citizen Disaster Reporting — Preliminary Evidence Assessment Engine
 *
 * ⚠️  PROTOTYPE / DEMO DECISION SUPPORT
 *
 * Deterministic assessment based strictly on metadata, completeness,
 * and report contextual consistency.
 *
 * 🛑 NOT COMPUTER VISION / NOT PIXEL-LEVEL AI ANALYSIS.
 * Labeled explicitly as "Preliminary Evidence Assessment".
 */

import type { Severity } from '@/types';
import type {
  EvidenceFlag,
  EvidenceQualityIndicator,
  ContextConsistency,
  EvidenceConfidence,
  PreliminaryEvidenceAssessment,
  StructuredReportEvidence,
  FutureCvCompatibility,
} from './types';

export interface EvidenceAssessmentContext {
  reportType: string;
  hazardType?: string;
  severity: Severity;
  description?: string;
  address?: string;
  coordinates: [number, number];
  timestamp?: string;
  hasNearbyRisk?: boolean;
  hasNearbyAlert?: boolean;
  confirmCount?: number;
  nearbyRiskZone?: any;
  nearbyAlert?: any;
}

export function assessPreliminaryEvidence(
  evidenceList: StructuredReportEvidence[] = [],
  context: EvidenceAssessmentContext,
): PreliminaryEvidenceAssessment {
  const flags: EvidenceFlag[] = [];
  const indicators: string[] = [];
  const assessedAt = new Date().toISOString();

  // Timestamp check
  const hasTimestamp = Boolean(context.timestamp) || evidenceList.some((e) => Boolean(e.timestamp && e.timestamp.length > 0));
  if (!hasTimestamp) {
    flags.push('TIME_MISSING');
    indicators.push('Observation timestamp not recorded in evidence metadata');
  }

  // ── 1. Check if evidence is missing ──
  if (evidenceList.length === 0) {
    flags.push('NO_EVIDENCE');
    indicators.push('No photo or video attachments provided by reporter');

    if (context.severity === 'CRITICAL' || context.severity === 'HIGH') {
      flags.push('SEVERITY_MISMATCH');
      indicators.push('High-severity hazard reported without corroborating visual evidence');
    }

    if (!context.address || context.address.trim().length < 4) {
      flags.push('LOCATION_MISSING');
      indicators.push('Specific street location or landmark not specified');
    }

    const summary = 'Preliminary Evidence Assessment: No visual evidence attached. Triage relying on text description and community corroboration. (Not verified by computer vision).';

    return {
      completeness: 0,
      qualityIndicator: 'INSUFFICIENT',
      contextConsistency: 'UNCORROBORATED',
      confidence: 'LOW',
      score: 15,
      flags,
      indicators,
      summary,
      assessedAt,
      futureCvCompatibility: {
        supportedPipelines: [],
        readinessStatus: 'INSUFFICIENT_IMAGE_DATA',
        modelTargetNote: 'No visual media available for computer vision inference pipeline.',
      },
    };
  }

  // ── 2. Multiple evidence check ──
  if (evidenceList.length >= 2) {
    flags.push('MULTIPLE_EVIDENCE');
    indicators.push(`${evidenceList.length} evidence attachments corroborating incident from multiple perspectives`);
  } else {
    indicators.push('1 visual evidence attachment attached for review');
  }

  // ── 3. Completeness & Metadata evaluation ──
  let completenessScore = 30; // base for having at least 1 file
  let validFileCount = 0;
  let hasVideo = false;

  for (const item of evidenceList) {
    if (item.type === 'VIDEO') hasVideo = true;

    // Check size & extension validity
    if (item.fileName && item.fileName.length > 3) {
      validFileCount += 1;
    }
    if (item.fileSize) completenessScore += 10;
    if (item.caption && item.caption.length >= 5) completenessScore += 15;
    if (item.previewUrl || item.thumbnailUrl) completenessScore += 10;
    if (item.metadata?.width || item.metadata?.estimatedResolution) completenessScore += 15;
  }

  completenessScore = Math.min(100, completenessScore);

  // ── 4. Contextual consistency check ──
  let consistencyScore = 30;
  let contextConsistency: ContextConsistency = 'PLAUSIBLE';

  const hasNearbyRisk = context.hasNearbyRisk ?? Boolean(context.nearbyRiskZone);
  const hasNearbyAlert = context.hasNearbyAlert ?? Boolean(context.nearbyAlert);
  const desc = context.description ?? '';

  if (hasNearbyRisk) {
    consistencyScore += 30;
    indicators.push('Observation location directly correlates with designated disaster risk zone');
  }

  if (hasNearbyAlert) {
    consistencyScore += 25;
    indicators.push('Observation coincides with active public emergency warning footprint');
  }

  if (desc.length >= 35) {
    consistencyScore += 15;
  } else {
    flags.push('INSUFFICIENT_CONTEXT');
    indicators.push('Short textual description provided with evidence');
  }

  if (consistencyScore >= 75) {
    contextConsistency = 'CONSISTENT';
  } else if (consistencyScore >= 50) {
    contextConsistency = 'PLAUSIBLE';
  } else {
    contextConsistency = 'UNCORROBORATED';
  }

  // ── 5. Urgency / Review flags ──
  if (
    context.severity === 'CRITICAL' ||
    context.reportType === 'MEDICAL_EMERGENCY' ||
    context.reportType === 'DAMAGED_BUILDING'
  ) {
    flags.push('REQUIRES_REVIEW');
    indicators.push('Life-safety risk or critical damage flagged — priority authority inspection recommended');
  }

  // ── 6. Quality Indicator ──
  let qualityIndicator: EvidenceQualityIndicator = 'LIMITED';
  if (completenessScore >= 80) {
    qualityIndicator = 'HIGH_QUALITY';
    indicators.push('High-quality evidence metadata with timestamps and valid media previews');
  } else if (completenessScore >= 50) {
    qualityIndicator = 'ADEQUATE';
    indicators.push('Adequate evidence metadata for preliminary decision support');
  } else {
    qualityIndicator = 'LIMITED';
  }

  // ── 7. Overall Composite Evidence Score & Confidence ──
  const compositeScore = Math.round(completenessScore * 0.5 + consistencyScore * 0.5);

  let confidence: EvidenceConfidence = 'LOW';
  if (compositeScore >= 75 && contextConsistency === 'CONSISTENT') {
    confidence = 'HIGH';
  } else if (compositeScore >= 45) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  // ── 8. Future Computer Vision Architecture Recommendations ──
  const suggestedPipelines: FutureCvCompatibility['supportedPipelines'] = [];
  if (context.reportType === 'FLOOD' || context.reportType === 'WATER_LEVEL') {
    suggestedPipelines.push('FLOOD_WATER_SEGMENTATION');
  }
  if (context.reportType === 'DAMAGED_BUILDING' || context.reportType === 'DAMAGED_ROAD') {
    suggestedPipelines.push('STRUCTURAL_DAMAGE_DETECTION');
  }
  if (context.reportType === 'BLOCKED_ROAD' || context.reportType === 'LANDSLIDE') {
    suggestedPipelines.push('DEBRIS_CLASSIFICATION');
  }
  if (context.reportType === 'SHELTER_ISSUE') {
    suggestedPipelines.push('CROWD_DENSITY');
  }

  const futureCvCompatibility: FutureCvCompatibility = {
    supportedPipelines: suggestedPipelines.length > 0 ? suggestedPipelines : ['FLOOD_WATER_SEGMENTATION'],
    readinessStatus: hasVideo ? 'VIDEO_STREAM_REQUIRED' : 'READY_FOR_CV_PIPELINE',
    modelTargetNote: `Architecture ready for production Vision Model pipeline (${suggestedPipelines.join(', ') || 'GENERAL_DISASTER_DETECTION'}).`,
  };

  const summary = `Preliminary Evidence Assessment: ${qualityIndicator.replace('_', ' ')} (${confidence} Confidence, Score: ${compositeScore}/100, ${contextConsistency}). Assessed based on metadata and report context. Not verified by automated pixel CV.`;

  return {
    completeness: completenessScore,
    qualityIndicator,
    contextConsistency,
    confidence,
    score: compositeScore,
    flags,
    indicators,
    summary,
    assessedAt,
    futureCvCompatibility,
  };
}
