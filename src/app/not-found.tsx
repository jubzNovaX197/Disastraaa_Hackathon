import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <p className="text-7xl font-bold text-accent/30 mb-2 font-mono tracking-tighter">
          404
        </p>
        <h1 className="text-xl font-semibold text-slate-100 mb-2">
          Page not found
        </h1>
        <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/map"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-card border border-white/10 rounded-lg text-sm text-slate-100 hover:border-white/20 transition-all"
        >
          ← Return to map
        </Link>
      </div>
    </div>
  );
}
