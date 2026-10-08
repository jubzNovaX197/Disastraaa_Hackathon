'use client';

/**
 * RoadCard
 *
 * Card component for list views, feeds, and travel safe route directories.
 */

import {
  AlertTriangle,
  ArrowRight,
  Clock,
  MapPin,
  Navigation,
  Shield,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import {
  ROAD_STATUS_CONFIG,
  ROAD_BLOCKAGE_CONFIG,
  ROAD_TYPE_CONFIG,
  type RoadSegment,
} from '@/lib/roads';

interface RoadCardProps {
  road: RoadSegment;
  isSelected?: boolean;
  onSelect: (road: RoadSegment) => void;
  className?: string;
}

export function RoadCard({
  road,
  isSelected = false,
  onSelect,
  className,
}: RoadCardProps) {
  const statusCfg   = ROAD_STATUS_CONFIG[road.status] ?? ROAD_STATUS_CONFIG.UNKNOWN;
  const blockageCfg = ROAD_BLOCKAGE_CONFIG[road.blockageType] ?? ROAD_BLOCKAGE_CONFIG.UNKNOWN;
  const typeCfg     = ROAD_TYPE_CONFIG[road.roadType] ?? ROAD_TYPE_CONFIG.MAJOR_ROAD;

  return (
    <div
      onClick={() => onSelect(road)}
      className={cn(
        'p-3.5 rounded-xl border transition-all cursor-pointer font-sans text-left group',
        isSelected
          ? 'bg-slate-50 dark:bg-white/10 border-accent shadow-md ring-1 ring-accent'
          : 'bg-white dark:bg-surface-card border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs">{typeCfg.icon}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              {typeCfg.label}
            </span>
            {road.code && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 font-bold text-slate-700 dark:text-slate-300">
                {road.code}
              </span>
            )}
            {road.isVerified && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                <Shield className="w-2.5 h-2.5" />
                <span>VERIFIED</span>
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-accent transition-colors leading-snug">
            {road.name}
          </h3>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-accent flex-shrink-0" />
            <span className="truncate">{road.administrativeArea}</span>
          </p>
        </div>

        {/* Status Badge */}
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase flex-shrink-0 flex items-center gap-1', statusCfg.badge)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
          <span>{statusCfg.label}</span>
        </span>
      </div>

      {/* Blockage or Guidance snippet */}
      {(road.status === 'BLOCKED' || road.status === 'PARTIALLY_BLOCKED' || road.status === 'CLOSED') ? (
        <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/60 dark:border-white/5 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
              <span>{blockageCfg.icon}</span>
              <span>{blockageCfg.label}</span>
            </span>
            {road.estimatedDelayMinutes && (
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                +{road.estimatedDelayMinutes}m
              </span>
            )}
          </div>
          {road.alternateRoute && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5 text-accent" />
              <span>Alt: {road.alternateRoute}</span>
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
          {road.travelRisk.travelAdvice}
        </p>
      )}

      {/* Footer metadata */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{timeAgo(road.lastUpdated)}</span>
        </span>

        <div className="flex items-center gap-2">
          {road.relatedReportIds.length > 0 && (
            <span className="font-mono text-[10px]">
              {road.relatedReportIds.length} report(s)
            </span>
          )}
          <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
            Risk: {road.travelRisk.score}/100
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}
