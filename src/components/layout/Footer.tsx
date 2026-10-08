import { Logo } from '@/components/brand/Logo';
import { brand } from '@/config/brand';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Logo size="sm" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <p className="text-xs text-slate-500">
              {brand.version} · Decision Support System
            </p>
            <p className="text-xs text-slate-500">
              Disaster intelligence for India
            </p>
            <p className="text-xs text-slate-500">
              Authoritative Feeds &amp; Public Incident Intelligence
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
