import { brand } from '@/config/brand';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  size?:      'sm' | 'md' | 'lg';
  showName?:  boolean;
  href?:      string;
  className?: string;
}

const sizeMap = {
  sm: { wrap: 'w-7 h-7', text: 'text-base' },
  md: { wrap: 'w-9 h-9', text: 'text-lg'   },
  lg: { wrap: 'w-12 h-12', text: 'text-2xl' },
};

/**
 * Renders the platform logo mark + wordmark.
 * Brand name is pulled from config — never hard-coded here.
 */
export function Logo({ size = 'md', showName = true, href = '/map', className }: LogoProps) {
  const sz = sizeMap[size];

  const mark = (
    <span className={cn('flex items-center gap-2.5', className)}>
      {/* Icon mark: radar / signal arcs */}
      <span
        className={cn(
          sz.wrap,
          'relative flex-shrink-0 rounded-lg flex items-center justify-center',
          'bg-gradient-to-br from-accent/80 to-accent/40',
          'shadow-[0_0_16px_rgba(34,211,238,0.28)]',
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-[65%] h-[65%]">
          {/* Centre dot */}
          <circle cx="12" cy="12" r="2" fill="#080C18" />
          {/* Inner arcs */}
          <path d="M12 8C9.79 8 8 9.79 8 12"   stroke="#080C18" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          <path d="M12 16C14.21 16 16 14.21 16 12" stroke="#080C18" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          {/* Outer arcs */}
          <path d="M12 5C8.13 5 5 8.13 5 12"   stroke="#080C18" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
          <path d="M12 19C15.87 19 19 15.87 19 12" stroke="#080C18" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
        </svg>
      </span>

      {showName && (
        <span className={cn(sz.text, 'font-bold tracking-tight text-slate-900 dark:text-slate-100')}>
          {brand.name}
        </span>
      )}
    </span>
  );

  if (!href) return mark;

  return (
    <Link
      href={href}
      className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      {mark}
    </Link>
  );
}
