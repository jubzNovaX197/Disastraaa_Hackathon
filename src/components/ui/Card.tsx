import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const cardVariant = {
  default:  'bg-surface-card border border-white/[0.07]',
  elevated: 'bg-surface-elevated border border-white/10',
  glass:    'glass',
};

const cardPadding = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn('rounded-xl', cardVariant[variant], cardPadding[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ── CardHeader ───────────────────────────────────────────────────────────────

export function CardHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ── CardTitle ────────────────────────────────────────────────────────────────

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-sm font-semibold text-slate-100 tracking-wide', className)}>
      {children}
    </h3>
  );
}

// ── CardSection ──────────────────────────────────────────────────────────────

export function CardSection({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-t border-white/[0.06] pt-4 mt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
