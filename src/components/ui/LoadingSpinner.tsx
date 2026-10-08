import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?:      'sm' | 'md' | 'lg';
  label?:     string;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
};

export function LoadingSpinner({ size = 'md', label, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full border-white/10 border-t-accent animate-spin',
          sizeMap[size],
        )}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && (
        <p className="text-xs text-slate-500">{label}</p>
      )}
    </div>
  );
}
