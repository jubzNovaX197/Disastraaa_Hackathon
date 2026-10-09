'use client';

/**
 * BasemapSelector — interactive selector for switching base map tile layers.
 *
 * Supports:
 * - Dark (CARTO Dark Matter)
 * - Light (CARTO Positron)
 * - Streets (CARTO Voyager)
 * - Satellite (Real optical imagery from ESRI World Imagery + boundary reference)
 *
 * Satellite imagery acts strictly as an imagery BASE layer.
 * Disaster intelligence overlays (Risk, Impact, Alerts, Reports, Roads, Shelters)
 * remain completely functional and independent above it.
 */

import { BASEMAP_OPTIONS, type BasemapStyleId } from '@/config/map';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BasemapSelectorProps {
  currentBasemap: BasemapStyleId;
  onChangeBasemap: (id: BasemapStyleId) => void;
  className?: string;
}

export function BasemapSelector({
  currentBasemap,
  onChangeBasemap,
  className,
}: BasemapSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeOption =
    BASEMAP_OPTIONS.find((opt) => opt.id === currentBasemap) ?? BASEMAP_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={cn('relative pointer-events-auto', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Change basemap style"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur-md transition-all active:scale-98 border',
          open
            ? 'bg-slate-200 dark:bg-surface-elevated text-slate-900 dark:text-slate-100 border-slate-300 dark:border-white/20'
            : 'bg-white/95 dark:bg-surface-elevated/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-overlay border-slate-200 dark:border-white/10',
        )}
      >
        <Globe className="w-3.5 h-3.5 text-accent" />
        <span className="flex items-center gap-1.5">
          <span>{activeOption.icon}</span>
          <span>{activeOption.label}</span>
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Flyout menu */}
      {open && (
        <div
          className={cn(
            'absolute top-full left-0 mt-1.5 w-64 z-30',
            'rounded-xl shadow-2xl p-2.5',
            'bg-white/98 dark:bg-surface-card/95 backdrop-blur-xl',
            'border border-slate-200 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5',
            'animate-slide-up',
          )}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-white/[0.08]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Basemap Layer
            </span>
            <span className="text-[10px] text-accent font-medium">Real-Time GIS</span>
          </div>

          <div className="space-y-1">
            {BASEMAP_OPTIONS.map((opt) => {
              const isSelected = opt.id === currentBasemap;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChangeBasemap(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all',
                    isSelected
                      ? 'bg-accent/15 text-accent border border-accent/30 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06]',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{opt.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate max-w-[150px]">
                        {opt.id === 'satellite' ? 'NASA / ESRI Optical Imagery' : 'Vector base layer'}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Attribution footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-[9px] text-slate-400 dark:text-slate-500 leading-tight">
            Active: {activeOption.attribution}
          </div>
        </div>
      )}
    </div>
  );
}
