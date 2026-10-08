'use client';

/**
 * RouteMapOverlay — wires RoutePlanner into the existing DisasterMap (Task 13 + 14).
 *
 * Sits as an absolute overlay panel (right side desktop, bottom sheet mobile).
 * Calls onRouteSelected / onRouteClear to let DisasterMap draw the route line.
 * Calls onDestinationSelected / onDestinationClear to draw destination marker & safety buffer.
 * Does NOT touch any other map layers.
 *
 * ⚠️  PROTOTYPE ROUTE & DESTINATION INTELLIGENCE — decision support prototype.
 */

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { RoutePlanner } from './RoutePlanner';
import type { RouteResult } from '@/lib/routing/types';
import type { LngLat } from '@/data/types';
import type { DestinationSafetyResult, DestinationSafetyStatus } from '@/lib/destination/types';

interface RouteMapOverlayProps {
  onRouteSelected: (coords: LngLat[], mode: RouteResult['mode']) => void;
  onRouteClear: () => void;
  onDestinationSelected?: (coords: LngLat, safetyScore: number, status: DestinationSafetyStatus) => void;
  onDestinationClear?: () => void;
  onCorridorHighlighted?: (points: Array<{ coordinates: [number, number]; risk: string; name: string }>) => void;
  className?: string;
}

export function RouteMapOverlay({
  onRouteSelected,
  onRouteClear,
  onDestinationSelected,
  onDestinationClear,
  onCorridorHighlighted,
  className,
}: RouteMapOverlayProps) {
  const [open, setOpen] = useState(false);

  const handleRouteClear = useCallback(() => {
    onRouteClear();
    onDestinationClear?.();
    onCorridorHighlighted?.([]);
  }, [onRouteClear, onDestinationClear, onCorridorHighlighted]);

  return (
    <>
      {/* Toggle button — vertically stacked in map tools */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur-md transition-all active:scale-98 border',
          open
            ? 'bg-accent text-slate-950 hover:bg-accent/90 border-accent/50'
            : 'bg-white/95 dark:bg-surface-elevated/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-overlay border-slate-200 dark:border-white/10',
          className
        )}
        title="Travel & Safe Route Planner"
        aria-label={open ? 'Close Travel Intelligence' : 'Open Travel Safety & Routes'}
      >
        <span>🗺️</span>
        <span>{open ? 'Close Travel Intelligence' : 'Travel Safety & Routes'}</span>
      </button>

      {/* Floating 1/3rd width overlay panel — does not touch topbar or bottom edge */}
      {open && (
        <div
          className={cn(
            'fixed z-40 pointer-events-auto',
            // Mobile: floating card with margin gaps
            'inset-x-3 top-20 bottom-5 sm:inset-x-auto sm:right-4 sm:w-[26rem]',
            // Tablet/Desktop: 1/3rd width (~27rem-31rem), 16px gap below 64px navbar (top-20 = 80px), 20px gap above bottom (bottom-5)
            'md:top-20 md:bottom-5 md:right-4 md:w-[27rem] lg:w-[29rem] xl:w-[31rem]',
            'max-h-[calc(100vh-6.25rem)]',
            'flex flex-col overflow-hidden',
            'rounded-2xl',
            'bg-white/98 dark:bg-surface-card/98 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-2xl ring-1 ring-black/10 dark:ring-white/5'
          )}
          role="dialog"
          aria-label="Travel Safety & Route Planner"
        >
          {/* Panel header */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-4.5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-100/95 dark:bg-surface-elevated/95 rounded-t-2xl backdrop-blur-xl flex-shrink-0">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-accent">
                EMERGENCY TRANSIT PLANNING &amp; CORRIDOR RISK
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>🗺️ Safe Routes &amp; Journey Risk</span>
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                handleRouteClear();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm"
              aria-label="Close travel planner"
            >
              ✕
            </button>
          </div>

          {/* Planner body with dedicated scrolling */}
          <div className="p-3.5 sm:p-4 flex-1 min-h-0 overflow-y-auto space-y-3.5">
            <RoutePlanner
              onRouteSelected={onRouteSelected}
              onRouteClear={handleRouteClear}
              onDestinationSelected={onDestinationSelected}
              onCorridorHighlighted={onCorridorHighlighted}
            />
          </div>
        </div>
      )}
    </>
  );
}
