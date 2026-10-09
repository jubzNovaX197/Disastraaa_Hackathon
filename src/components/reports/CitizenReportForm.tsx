'use client';
/* eslint-disable @next/next/no-img-element */

/**
 * CitizenReportForm
 *
 * Comprehensive Citizen / Field Incident Reporting workflow.
 *
 * Workflow:
 * 1. Select Incident Type (sensible disaster taxonomy)
 * 2. Enter Title & Description
 * 3. Live Geolocation ("Use My Current Location") + Interactive Map Pin picking
 * 4. Camera Photo ("Take Photo") + Gallery Upload ("Upload Photo")
 * 5. Reporter Identity (optional anonymous)
 * 6. Submission to API & Real Incident creation
 * 7. Professional Success Confirmation with "View on Live Map"
 */

import { LocationPickerMap, type IncidentLocationSource } from '@/components/map/LocationPickerMap';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import type { LngLat } from '@/data/types';
import {
  BLOCKAGE_CONFIG,
  EVIDENCE_LIMITS,
  REPORT_TYPE_CONFIG,
  REPORT_TYPES,
  validateEvidenceFile,
  type BlockageType,
  type CitizenReportItem,
  type CreateReportInput,
  type ReportEvidence,
  type ReportType,
} from '@/lib/reports';
import { cn } from '@/lib/utils';
import type { Severity } from '@/types';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  Send,
  ShieldAlert,
  Upload,
  User,
  X
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { EvidencePreview } from './EvidencePreview';

interface CitizenReportFormProps {
  onSubmitReport?: (input: CreateReportInput) => void | Promise<{ report: CitizenReportItem; incident: any }>;
  onViewOnMap?: (report: CitizenReportItem) => void;
  onCancel?: () => void;
  initialCoords?: LngLat;
  initialAddress?: string;
  className?: string;
}

export function CitizenReportForm({
  onSubmitReport,
  onViewOnMap,
  onCancel,
  initialCoords = [85.832, 19.81],
  initialAddress,
  className,
}: CitizenReportFormProps) {
  const { submitCitizenReport } = useLiveIntelligence();

  // Form State
  const [reportType, setReportType] = useState<ReportType>('FLOOD');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [address, setAddress] = useState(initialAddress ?? 'Puri Coastal Zone, Odisha');
  const [adminArea, setAdminArea] = useState('Puri District, Odisha');
  const [coords, setCoords] = useState<LngLat>(initialCoords);
  const [locationSource, setLocationSource] = useState<IncidentLocationSource>('DEFAULT');

  // Blocked Road details (conditional)
  const [roadName, setRoadName] = useState('');
  const [blockageType, setBlockageType] = useState<BlockageType>('FLOODING');
  const [roadSeverity, setRoadSeverity] = useState<'FULL' | 'PARTIAL'>('FULL');

  // Evidence attachments
  const [evidenceList, setEvidenceList] = useState<ReportEvidence[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Reporter Identity
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [reporterName, setReporterName] = useState('');

  // Status & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<CitizenReportItem | null>(null);

  // Hidden File Inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isRoadReport = reportType === 'BLOCKED_ROAD' || reportType === 'DAMAGED_ROAD';

  // Coordinate change callback from interactive location picker
  const handleCoordinatesChange = useCallback((
    newCoords: LngLat,
    suggestedLabel?: string,
    suggestedAdmin?: string,
    source?: IncidentLocationSource,
  ) => {
    setCoords(newCoords);
    if (suggestedLabel) setAddress(suggestedLabel);
    if (suggestedAdmin) setAdminArea(suggestedAdmin);
    if (source) setLocationSource(source);
    setErrorMessage(null);
  }, []);


  // Process chosen image file (from Camera or Gallery)
  const processImageFile = useCallback((file: File, source: 'DEVICE_CAMERA' | 'FILE_UPLOAD') => {
    const validation = validateEvidenceFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error ?? 'Invalid image file.');
      return;
    }

    if (evidenceList.length >= EVIDENCE_LIMITS.MAX_FILES) {
      setErrorMessage(`Maximum ${EVIDENCE_LIMITS.MAX_FILES} attachments allowed per report.`);
      return;
    }

    setIsProcessingImage(true);
    const isVideo = file.type.startsWith('video/');
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newEv: ReportEvidence = {
        id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: isVideo ? 'VIDEO' : 'PHOTO',
        fileName: file.name,
        mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        fileSizeBytes: file.size,
        fileSize: `${sizeMb} MB`,
        timestamp: new Date().toISOString(),
        source,
        status: 'AVAILABLE',
        caption: `${source === 'DEVICE_CAMERA' ? 'Live Camera Capture' : 'Device Upload'} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        previewUrl: dataUrl,
      };

      setEvidenceList((prev) => [...prev, newEv]);
      setIsProcessingImage(false);
      setErrorMessage(null);
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read photo file. Please try again.');
      setIsProcessingImage(false);
    };

    reader.readAsDataURL(file);
  }, [evidenceList.length]);

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0], 'DEVICE_CAMERA');
    }
    e.target.value = '';
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        processImageFile(files[i], 'FILE_UPLOAD');
      }
    }
    e.target.value = '';
  };

  const handleRemoveEvidence = (id: string) => {
    setEvidenceList((prev) => prev.filter((ev) => ev.id !== id));
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage('Please provide a brief headline or title (at least 3 characters).');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Please describe the observed conditions in detail (at least 5 characters).');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Please specify the location or landmark.');
      return;
    }

    if (
      !coords ||
      isNaN(coords[0]) ||
      isNaN(coords[1]) ||
      coords[0] < -180 ||
      coords[0] > 180 ||
      coords[1] < -90 ||
      coords[1] > 90
    ) {
      setErrorMessage('Please confirm a valid map pin location for the incident.');
      return;
    }

    const payload: CreateReportInput = {
      reportType,
      title: title.trim(),
      description: description.trim(),
      address: address.trim(),
      administrativeArea: adminArea.trim() || 'Odisha Disaster Corridor',
      coordinates: coords,
      severity,
      evidence: evidenceList,
      blockedRoadInfo: isRoadReport
        ? {
            roadName: roadName.trim() || address.trim(),
            blockageType,
            severity: roadSeverity,
            description: `${roadSeverity === 'FULL' ? 'Completely impassable' : 'Partially passable'}. ${description}`,
          }
        : undefined,
      reporterName: isAnonymous ? 'Anonymous Citizen' : (reporterName.trim() || 'Citizen Reporter'),
      isAnonymous,
    };

    setIsSubmitting(true);

    try {
      if (onSubmitReport) {
        const res = await onSubmitReport(payload);
        if (res && res.report) {
          setSubmittedReport(res.report);
        } else {
          // Fallback creation
          const fallback = await submitCitizenReport(payload);
          setSubmittedReport(fallback.report);
        }
      } else {
        const res = await submitCitizenReport(payload);
        setSubmittedReport(res.report);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── SUCCESS CONFIRMATION STATE ─────────────────────────────────────────────
  if (submittedReport) {
    const reportCfg = REPORT_TYPE_CONFIG[submittedReport.reportType] ?? REPORT_TYPE_CONFIG.OTHER;
    return (
      <div
        className={cn(
          'p-6 text-center space-y-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-2xl max-w-lg mx-auto font-sans animate-fade-in',
          className,
        )}
        role="alert"
        aria-live="polite"
      >
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Submission Confirmed
          </span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Incident Report Submitted
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-md mx-auto">
            Your ground intelligence report has been logged and synchronized with the District Command Center and emergency response teams.
          </p>
        </div>

        {/* Structured summary receipt */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 text-left text-xs space-y-2.5 font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/5">
            <span className="text-slate-400">Incident Tracking ID:</span>
            <span className="font-mono font-bold text-cyan-700 dark:text-accent text-sm">
              {submittedReport.id.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Incident Type:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>{reportCfg.icon}</span>
              <span>{reportCfg.label}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Location:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[220px]" title={submittedReport.address}>
              {submittedReport.address}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-slate-400 font-sans">Coordinates:</span>
            <span className="text-slate-600 dark:text-slate-400">
              {submittedReport.coordinates[1].toFixed(4)}°N, {submittedReport.coordinates[0].toFixed(4)}°E
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Submission Time:</span>
            <span className="text-slate-600 dark:text-slate-400">
              {new Date(submittedReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400">Initial Status:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              NEW · AWAITING AUTHORITY TRIAGE
            </span>
          </div>

          {submittedReport.evidence && submittedReport.evidence.length > 0 && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>Evidence Attached:</span>
              </span>
              <span>{submittedReport.evidence.length} photo(s) uploaded</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (onViewOnMap) {
                onViewOnMap(submittedReport);
              } else if (onCancel) {
                onCancel();
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <span>View on Live Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setSubmittedReport(null);
              setTitle('');
              setDescription('');
              setEvidenceList([]);
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN INCIDENT FORM ───────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden font-sans transition-colors',
        className,
      )}
      role="region"
      aria-label="Citizen / Field Disaster Incident Reporting"
    >
      {/* ── Form Header ── */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📢</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Report Disaster Incident
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-accent/20 text-cyan-800 dark:text-accent border border-accent/40 font-mono">
              CITIZEN / FIELD
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Submit verified ground observations, live location, and photo evidence to emergency command.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            aria-label="Close report form"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Form Body ── */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-fade-in">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* 1. Incident Type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            1. Disaster / Incident Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(REPORT_TYPES).map(([key, val]) => {
              const cfg = REPORT_TYPE_CONFIG[val];
              if (!cfg) return null;
              const isSelected = reportType === val;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => {
                    setReportType(val);
                    setSeverity(cfg.defaultSeverity);
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all',
                    isSelected
                      ? 'border-accent bg-accent/15 text-slate-900 dark:text-slate-100 ring-2 ring-accent shadow-sm'
                      : 'border-slate-200 dark:border-white/10 hover:bg-slate-100/70 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400',
                  )}
                >
                  <span className="text-xl flex-shrink-0">{cfg.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{cfg.label}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {cfg.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Blocked Road Details (Conditional) */}
        {isRoadReport && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
              <span>🚧</span>
              <span>Road Blockage Field Details</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Highway / Road Name
                </label>
                <input
                  type="text"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  placeholder="e.g. NH-16 / Grand Road Km 4"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Blockage Cause
                </label>
                <select
                  value={blockageType}
                  onChange={(e) => setBlockageType(e.target.value as BlockageType)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100"
                >
                  {Object.entries(BLOCKAGE_CONFIG).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                Passability Level
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRoadSeverity('FULL')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                    roadSeverity === 'FULL'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/50'
                      : 'border-slate-200 dark:border-white/10 text-slate-500',
                  )}
                >
                  ⛔ Completely Impassable (Full Block)
                </button>
                <button
                  type="button"
                  onClick={() => setRoadSeverity('PARTIAL')}
                  className={cn(
                    'flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                    roadSeverity === 'PARTIAL'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/50'
                      : 'border-slate-200 dark:border-white/10 text-slate-500',
                  )}
                >
                  ⚠️ Partially Blocked (4x4 or Emergency Only)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Title & Description */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              2. Incident Headline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Water 1m deep near hospital / tree blocking highway"
              maxLength={120}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                3. Observed Conditions & Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">{description.length}/500</span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you see: water depth, affected people, injured individuals, blocked culverts, live wire hazards..."
              maxLength={500}
              className="w-full text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100 resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 4. Live Geolocation & Interactive Map Pin Confirmation */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            4. Live Location & Confirmed Map Pin <span className="text-rose-500">*</span>
          </label>

          {/* Interactive Map Picker with Geolocation API */}
          <LocationPickerMap
            coordinates={coords}
            onCoordinatesChange={handleCoordinatesChange}
          />

          {/* Location distinction prompt */}
          {locationSource === 'AUTO_DEVICE' && (
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <span className="text-base flex-shrink-0">📍</span>
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold">Current Device Location Suggested: </span>
                <span>The map pin has been set to your device GPS coordinates. If the disaster or road obstruction occurred at a different spot, simply drag the pin or click on the map to set the actual incident location.</span>
              </div>
            </div>
          )}

          {/* Landmark & Administrative area fields */}
          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Location / Landmark Name</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Specific street, village, or landmark"
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">District / Region</label>
              <input
                type="text"
                value={adminArea}
                onChange={(e) => setAdminArea(e.target.value)}
                placeholder="e.g. Puri District, Odisha"
                className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 5. Severity Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            5. Estimated Severity Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { level: 'LOW', label: 'Low', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
              { level: 'MODERATE', label: 'Moderate', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
              { level: 'HIGH', label: 'High', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
              { level: 'CRITICAL', label: 'Critical', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40' },
            ].map((s) => (
              <button
                type="button"
                key={s.level}
                onClick={() => setSeverity(s.level as Severity)}
                className={cn(
                  'py-2 rounded-xl text-xs font-bold border transition-all text-center',
                  severity === s.level
                    ? `${s.color} ring-2 ring-offset-1 ring-current shadow-sm`
                    : 'border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Camera Photo & Gallery Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-accent" />
              <span>6. Incident Evidence Photos</span>
            </label>
            <span className="text-[10px] text-slate-400">JPG, PNG, WEBP · Max 10MB</span>
          </div>

          {/* Dual Action Buttons: Take Photo & Upload Photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Take Photo Button (Direct device camera capture on mobile) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessingImage}
              className="flex items-center justify-center gap-2 p-3 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 text-slate-800 dark:text-accent font-semibold text-xs transition-colors"
            >
              <Camera className="w-4 h-4 text-accent" />
              <span>Take Photo (Camera)</span>
            </button>

            {/* Upload Photo Button (Device Gallery / Filesystem) */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isProcessingImage}
              className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Upload from Gallery</span>
            </button>
          </div>

          {/* Hidden Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleGalleryChange}
            className="hidden"
          />

          {isProcessingImage && (
            <div className="p-3 text-center text-xs text-accent flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing photo evidence...</span>
            </div>
          )}

          {/* Evidence Previews List */}
          {evidenceList.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {evidenceList.map((ev) => (
                  <EvidencePreview
                    key={ev.id}
                    evidence={ev}
                    size="sm"
                    onRemove={() => handleRemoveEvidence(ev.id)}
                  />
                ))}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ {evidenceList.length} photo evidence attachment(s) confirmed and ready for submission.
              </p>
            </div>
          )}
        </div>

        {/* 7. Reporter Identity */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Reporter Identity</span>
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-slate-300 text-accent focus:ring-accent"
              />
              <span>Submit Anonymously</span>
            </label>
          </div>

          {!isAnonymous && (
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Your name or organization (e.g. Ramesh Kumar, Local Volunteer)"
              className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100"
            />
          )}
        </div>

        {/* Decision Support Safety Notice */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Official Triage Protocol:</strong> Submitted ground observations undergo preliminary scoring and are dispatched to the District Operations Command Center for verification and response assignment.
          </span>
        </div>

        {/* Submit Bar */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-white/10">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 transition-all flex items-center gap-2 shadow-lg shadow-accent/15 active:scale-98 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting Incident...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Incident Report</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
