'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  MapPin,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Compass,
  Building2,
  Calendar,
} from 'lucide-react';
import type { RealAlert } from '@/lib/alerts/types';
import type { DemoAlert } from '@/data/types';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

const HAZARD_ICON: Record<string, string> = {
  FLOOD: '🌊',
  CYCLONE: '🌀',
  HEATWAVE: '🌡️',
  LIGHTNING: '⚡',
  LANDSLIDE: '⛰️',
  DROUGHT: '🏜️',
  STORM_SURGE: '🌊',
  OTHER: '⚠️',
};

const SEVERITY_BORDER: Record<string, string> = {
  CRITICAL: 'border-l-rose-500 hover:border-rose-500/40',
  HIGH: 'border-l-orange-500 hover:border-orange-500/40',
  MODERATE: 'border-l-amber-500 hover:border-amber-500/40',
  LOW: 'border-l-emerald-500 hover:border-emerald-500/40',
};

interface AlertCardProps {
  alert: RealAlert | DemoAlert;
  isDemo?: boolean;
}

export function AlertCard({ alert, isDemo = false }: AlertCardProps) {
  const [showDirectives, setShowDirectives] = useState(false);
  const realAlert = alert as RealAlert;

  const hazardIcon = HAZARD_ICON[alert.type] ?? '⚠️';
  const borderClass = SEVERITY_BORDER[alert.severity] ?? 'border-l-slate-400';

  const isLive = alert.isActive && realAlert.freshnessStatus !== 'STALE';
  const isStale = !alert.isActive || realAlert.freshnessStatus === 'STALE';

  const issuedDate = new Date(alert.issuedAt);
  const formattedIssued = isNaN(issuedDate.getTime())
    ? alert.issuedAt
    : issuedDate.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const expiresDate = alert.expiresAt ? new Date(alert.expiresAt) : null;
  const formattedExpires =
    expiresDate && !isNaN(expiresDate.getTime())
      ? expiresDate.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  return (
    <article
      className={cn(
        'rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.08] shadow-sm',
        'border-l-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between',
        borderClass,
      )}
    >
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Top Badges & Meta */}
        <div className="flex items-start justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              {hazardIcon}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {alert.type}
            </span>
            <Badge severity={alert.severity} dot>
              {alert.severity}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {isDemo ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                SCENARIO SIMULATION
              </span>
            ) : isLive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE BROADCAST
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                EXPIRED ADVISORY
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {alert.title}
        </h3>

        {/* Message body */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {alert.message}
        </p>

        {/* Directives / Official Instructions (from CAP) */}
        {realAlert.instruction && (
          <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDirectives(!showDirectives)}
              className="w-full px-3 py-2 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Action Suggested by Issuing Authority</span>
              </span>
              {showDirectives ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showDirectives && (
              <div className="p-3 pt-0 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line border-t border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.01]">
                {realAlert.instruction}
              </div>
            )}
          </div>
        )}

        {/* Region & Location Details */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">{alert.regionName}</span>
          </div>

          {alert.coordinates && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              [{alert.coordinates[0].toFixed(2)}°E, {alert.coordinates[1].toFixed(2)}°N]
            </span>
          )}

          <Link
            href={`/map?lat=${alert.coordinates[1]}&lng=${alert.coordinates[0]}&zoom=9`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline ml-auto"
          >
            <Compass className="w-3 h-3" />
            <span>View on Map</span>
          </Link>
        </div>
      </div>

      {/* Footer Provenance & Timestamps */}
      <div className="px-4 py-3 sm:px-5 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 rounded-b-2xl">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">
            {realAlert.sourceAgency || (isDemo ? 'Contingency Scenario Engine' : 'India Meteorological Department (IMD)')}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Issued: {formattedIssued}</span>
          </div>

          {formattedExpires && (
            <div className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>Valid until: {formattedExpires}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
