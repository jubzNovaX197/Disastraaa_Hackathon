'use client';

/**
 * LayerControl — responsive panel for toggling disaster map layers.
 *
 * On mobile: collapsed by default, expands via toggle button.
 * On desktop: always visible as a side panel.
 * Supports both dark and light themes.
 */

import { useState } from 'react';
import { Layers, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LayerToggle {
  id: string;
  label: string;
  icon: string;
  color: string;
  enabled: boolean;
}

interface LayerControlProps {
  layers: LayerToggle[];
  onToggle: (id: string) => void;
  className?: string;
}

export function LayerControl({ layers, onToggle, className }: LayerControlProps) {
  const [open, setOpen] = useState(false);
  const enabledCount = layers.filter((l) => l.enabled).length;

  return (
    <div className={cn('relative pointer-events-auto', className)}>
      {/* Minimized trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Minimize layer control' : 'Expand layer control'}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur-md transition-all active:scale-98 border',
          open
            ? 'bg-slate-200 dark:bg-surface-elevated text-slate-900 dark:text-slate-100 border-slate-300 dark:border-white/20'
            : 'bg-white/95 dark:bg-surface-elevated/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-overlay border-slate-200 dark:border-white/10'
        )}
      >
        <Layers className="w-3.5 h-3.5 text-accent" />
        <span>Map Layers</span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold">
          {enabledCount}/{layers.length}
        </span>
        <ChevronDown
          className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown flyout */}
      {open && (
        <div
          className={cn(
            'absolute top-full left-0 mt-1.5 w-60 z-30',
            'rounded-xl shadow-2xl p-3',
            'bg-white/98 dark:bg-surface-card/95 backdrop-blur-xl',
            'border border-slate-200 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5',
            'animate-slide-up'
          )}
        >
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Map Layers</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="Minimize layers"
              aria-label="Minimize layers"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <LayerList layers={layers} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
}

// ── Inner list ────────────────────────────────────────────────────────────────

function LayerList({
  layers,
  onToggle,
  onClose,
}: {
  layers: LayerToggle[];
  onToggle: (id: string) => void;
  onClose?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {onClose && (
        <li className="flex items-center justify-between mb-1 pb-2 border-b border-slate-200/80 dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Layers</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </li>
      )}
      {layers.map((layer) => (
        <li key={layer.id}>
          <button
            onClick={() => onToggle(layer.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left',
              'transition-all text-sm',
              layer.enabled
                ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-slate-100 font-medium'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
            )}
            aria-pressed={layer.enabled}
          >
            {/* Colour dot */}
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
              style={{
                backgroundColor: layer.color,
                opacity: layer.enabled ? 1 : 0.3,
              }}
            />
            {/* Icon + label */}
            <span className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-xs leading-none">{layer.icon}</span>
              <span className="text-xs font-medium truncate">{layer.label}</span>
            </span>
            {/* Toggle indicator */}
            <span
              className={cn(
                'w-7 h-4 rounded-full flex-shrink-0 relative transition-colors',
                layer.enabled ? 'bg-accent' : 'bg-slate-300 dark:bg-white/10',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                  layer.enabled ? 'translate-x-3.5' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
