import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size    = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  isLoading?: boolean;
  leftIcon?:  ReactNode;
  rightIcon?: ReactNode;
  children:   ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-accent hover:bg-accent/90 text-surface-base font-semibold shadow-[0_0_20px_rgba(34,211,238,0.2)]',
  secondary: 'bg-surface-card hover:bg-surface-elevated text-slate-100 border border-white/10 hover:border-white/20',
  ghost:     'hover:bg-white/5 text-slate-400 hover:text-slate-100',
  danger:    'bg-critical hover:bg-critical/90 text-white font-semibold',
  outline:   'border border-accent/50 text-accent hover:bg-accent/10',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 h-7',
  md: 'px-4 py-2   text-sm gap-2   h-9',
  lg: 'px-6 py-2.5 text-sm gap-2   h-10',
};

export function Button({
  variant   = 'primary',
  size      = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        'transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}
