import { cn, severityConfig } from '@/lib/utils';
import type { Severity } from '@/types';

interface BadgeProps {
  children:   React.ReactNode;
  severity?:  Severity;
  className?: string;
  dot?:       boolean;
}

/**
 * If `severity` is provided the badge uses the semantic colour for
 * that severity level. Otherwise it renders a neutral slate badge.
 */
export function Badge({ children, severity, className, dot }: BadgeProps) {
  if (severity) {
    const cfg = severityConfig[severity];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
          'text-xs font-medium border',
          cfg.color, cfg.bg, cfg.border,
          className,
        )}
      >
        {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />}
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
        'text-xs font-medium',
        'bg-white/5 text-slate-400 border border-white/10',
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />}
      {children}
    </span>
  );
}
