'use client';
/* eslint-disable @next/next/no-img-element */

/**
 * EvidencePreview
 *
 * Reusable component for displaying citizen photo and video evidence attachments.
 * ⚠️  PROTOTYPE / DEMO DECISION SUPPORT
 *
 * Supported features:
 * - Image thumbnail preview with lightbox modal
 * - Video preview / player or card fallback
 * - Graceful fallback when preview URL is unavailable
 * - File metadata (size, MIME type, capture timestamp, status)
 * - Optional remove button for form input
 */

import type { ReportEvidence } from '@/lib/reports/types';
import { cn } from '@/lib/utils';
import {
  Camera,
  Film,
  Maximize2,
  Video,
  X
} from 'lucide-react';
import { useState } from 'react';

interface EvidencePreviewProps {
  evidence: ReportEvidence;
  onRemove?: () => void;
  readOnly?: boolean;
  showMetadata?: boolean;
  showMetadataBadge?: boolean;
  allowFullscreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EvidencePreview({
  evidence,
  onRemove,
  readOnly = false,
  showMetadata = true,
  showMetadataBadge = true,
  allowFullscreen = true,
  size = 'md',
  className,
}: EvidencePreviewProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isVideo =
    evidence.type === 'VIDEO' ||
    evidence.fileName?.toLowerCase().endsWith('.mp4') ||
    evidence.fileName?.toLowerCase().endsWith('.webm') ||
    evidence.fileName?.toLowerCase().endsWith('.mov');

  const statusColors = {
    AVAILABLE:   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    ASSESSED:    'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    FLAGGED:     'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    PROCESSING:  'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    UNAVAILABLE: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
  };

  const statusBadge = evidence.status && evidence.status in statusColors
    ? statusColors[evidence.status as keyof typeof statusColors]
    : statusColors.AVAILABLE;

  return (
    <>
      {/* ── Lightbox Modal for Photo / Video ── */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-surface-card rounded-xl overflow-hidden border border-white/10 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>

            {isVideo && evidence.previewUrl ? (
              <video
                src={evidence.previewUrl}
                controls
                autoPlay
                className="max-h-[70vh] w-auto mx-auto rounded"
              />
            ) : evidence.previewUrl && !imageError ? (
              <img
                src={evidence.previewUrl}
                alt={evidence.fileName}
                className="max-h-[70vh] w-auto mx-auto object-contain rounded"
              />
            ) : (
              <div className="w-80 h-64 bg-slate-800 rounded flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                {isVideo ? <Film className="w-12 h-12 mb-2 text-slate-500" /> : <Camera className="w-12 h-12 mb-2 text-slate-500" />}
                <p className="text-sm font-semibold text-slate-200">{evidence.fileName}</p>
                <p className="text-xs text-slate-400 mt-1">Structured verification evidence item.</p>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">Status: {evidence.status ?? 'AVAILABLE'}</p>
              </div>
            )}

            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-200 truncate">{evidence.fileName}</span>
              <span className="font-mono text-[11px]">{evidence.fileSize || 'Local metadata'}</span>
            </div>
            {evidence.caption && (
              <p className="text-xs text-slate-300 italic mt-1">{evidence.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Main Preview Card ── */}
      <div
        className={cn(
          'relative group rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] overflow-hidden transition-all',
          size === 'sm' && 'p-2',
          size === 'md' && 'p-2.5',
          size === 'lg' && 'p-3.5',
          className,
        )}
      >
        {/* Remove button */}
        {!readOnly && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-500 transition-colors shadow-sm"
            title="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Media Thumbnail Container */}
        <div
          onClick={() => setIsLightboxOpen(true)}
          className={cn(
            'relative rounded-lg overflow-hidden cursor-pointer bg-slate-200/80 dark:bg-white/5 flex items-center justify-center group-hover:brightness-105 transition-all',
            size === 'sm' && 'h-20',
            size === 'md' && 'h-28',
            size === 'lg' && 'h-40',
          )}
        >
          {evidence.previewUrl && !imageError && !isVideo ? (
            <img
              src={evidence.previewUrl}
              alt={evidence.fileName}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : isVideo && evidence.previewUrl ? (
            <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
              <video
                src={evidence.previewUrl}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
                ▶
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-2 text-center">
              {isVideo ? (
                <Video className="w-6 h-6 text-slate-400 mb-1" />
              ) : (
                <Camera className="w-6 h-6 text-slate-400 mb-1" />
              )}
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">
                {isVideo ? 'Video Evidence' : 'Photo Evidence'}
              </span>
            </div>
          )}

          {/* Hover zoom overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
            <Maximize2 className="w-5 h-5 drop-shadow" />
          </div>

          {/* Type Badge on thumbnail */}
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
            {isVideo ? <Film className="w-2.5 h-2.5" /> : <Camera className="w-2.5 h-2.5" />}
            <span>{isVideo ? 'VIDEO' : 'PHOTO'}</span>
          </div>
        </div>

        {/* Metadata Details */}
        {showMetadata && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span
                className="font-semibold text-slate-800 dark:text-slate-200 truncate"
                title={evidence.fileName}
              >
                {evidence.fileName}
              </span>
              {evidence.status && (
                <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase flex-shrink-0', statusBadge)}>
                  {evidence.status}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{evidence.fileSize || 'Local file'}</span>
              {evidence.source && (
                <span className="text-slate-500 truncate max-w-[120px]">
                  {evidence.source.replace('_', ' ')}
                </span>
              )}
            </div>

            {evidence.caption && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic line-clamp-1 pt-0.5">
                &ldquo;{evidence.caption}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
