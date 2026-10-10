'use client';

import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { publicNavLinks } from '@/config/nav';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import { parseRoleFromCookie, ROLE_COOKIE_NAME } from '@/lib/auth/roles';
import { getFeedLabel } from '@/lib/realtime/feedStatus';
import { cn } from '@/lib/utils';
import { ROLES, type Role } from '@/types/roles';
import { KeyRound, LogOut, Map, Menu, Shield, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SafeUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  authorityId?: string;
  department?: string;
  geographicScope?: string;
}

export function PublicNav() {
  const { environment, status, overrides } = useLiveIntelligence();
  const [open, setOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>(ROLES.CITIZEN);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [realUser, setRealUser] = useState<SafeUser | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleToggleEnvironment = async (newEnv: 'REAL' | 'DEMO') => {
    if (newEnv === environment) return;
    try {
      const res = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: newEnv }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {}
  };

  const handleOpenReport = () => {
    if (pathname === '/map') {
      window.dispatchEvent(new CustomEvent('disastraaa:open-report'));
    } else {
      router.push('/reports');
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Fast initial check for client-accessible marker cookie
    if (typeof document !== 'undefined') {
      const hasMarker = document.cookie.includes('disastraaa-logged-in=1');
      if (hasMarker) {
        setIsAuthenticated(true);
      }
    }

    // Authoritative session check via /api/auth/me
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setRealUser(data.user);
          setCurrentRole(data.user.role);
          setIsDemo(false);
        } else {
          setIsAuthenticated(false);
          setRealUser(null);
          if (typeof document !== 'undefined') {
            document.cookie = 'disastraaa-logged-in=; path=/; max-age=0';
            const parsed = parseRoleFromCookie(document.cookie);
            const envMatch = document.cookie.match(/(?:^|; )disastraaa-env=([^;]*)/);
            const envVal = envMatch ? decodeURIComponent(envMatch[1]).toUpperCase() : '';
            const isDemoActive = envVal === 'DEMO' || parsed !== ROLES.CITIZEN;
            setIsDemo(isDemoActive);
            setCurrentRole(isDemoActive ? parsed : ROLES.CITIZEN);
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAuthenticated(false);
        setRealUser(null);
        if (typeof document !== 'undefined') {
          const parsed = parseRoleFromCookie(document.cookie);
          const envMatch = document.cookie.match(/(?:^|; )disastraaa-env=([^;]*)/);
          const envVal = envMatch ? decodeURIComponent(envMatch[1]).toUpperCase() : '';
          const isDemoActive = envVal === 'DEMO' || parsed !== ROLES.CITIZEN;
          setIsDemo(isDemoActive);
          setCurrentRole(isDemoActive ? parsed : ROLES.CITIZEN);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleRealSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      document.cookie = 'disastraaa-logged-in=; path=/; max-age=0';
      document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0`;
      document.cookie = 'disastraaa-env=REAL; path=/; max-age=604800; SameSite=Lax';
      try {
        localStorage.removeItem('disastraaa-demo-role');
      } catch {}
      setIsAuthenticated(false);
      setRealUser(null);
      window.location.href = '/map';
    }
  };

  const handleExitDemo = async () => {
    document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0`;
    document.cookie = 'disastraaa-env=REAL; path=/; max-age=604800; SameSite=Lax';
    try {
      localStorage.removeItem('disastraaa-demo-role');
    } catch {}
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/map';
  };

  const getDashboardHref = (role: Role) => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return '/governance';
      case ROLES.NATIONAL_AUTHORITY:
        return '/analytics';
      case ROLES.FIELD_OPERATOR:
        return '/operations';
      case ROLES.CITIZEN:
      case ROLES.REGISTERED_USER:
        return '/map';
      default:
        return '/dashboard';
    }
  };

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-surface-base/80 dark:bg-surface-base/80 backdrop-blur-xl border-b border-white/[0.06] dark:border-white/[0.06] transition-colors" />

      <nav
        className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between"
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          {environment === 'DEMO' ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              SIMULATION MODE
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {getFeedLabel(environment, status, overrides.alerts.filter(alert => alert.isActive).length)}
            </span>
          )}
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-0.5">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive(link.href)
                  ? 'text-cyan-700 dark:text-accent bg-accent/15 dark:bg-accent/10 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Action Controls */}
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenReport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 border border-accent/40 shadow-sm transition-all active:scale-95 flex-shrink-0"
            title="Report Disaster Incident"
          >
            <span>📢</span>
            <span>Report Incident</span>
          </button>
          <ThemeToggle size="sm" showLabel={false} />

          {/* STATE 1: REAL AUTHENTICATED USER */}
          {isAuthenticated ? (
            <>
              {currentRole === ROLES.CITIZEN || currentRole === ROLES.REGISTERED_USER ? (
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/15 dark:bg-accent/10 text-cyan-700 dark:text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                >
                  <Map className="w-3.5 h-3.5" />
                  Live Map
                </Link>
              ) : (
                <Link
                  href={getDashboardHref(currentRole)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent/15 dark:bg-accent/10 text-cyan-700 dark:text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={handleRealSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 border border-slate-200 dark:border-white/10 hover:border-red-500/30 transition-colors"
                title="Sign out of your account"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </>
          ) : isDemo ? (
            /* STATE 2: DEMO ENVIRONMENT */
            <>
              {currentRole === ROLES.CITIZEN ? (
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                  title="Switch simulated role or explore authority command centers"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Demo Roles
                </Link>
              ) : (
                <Link
                  href={getDashboardHref(currentRole)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={handleExitDemo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-500 hover:bg-amber-500/10 border border-amber-500/30 transition-colors"
                title="Exit Simulation Mode and Return to Real Operational Data"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit Demo
              </button>
            </>
          ) : (
            /* STATE 3: PUBLIC / NOT AUTHENTICATED */
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/demo"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-accent/30 text-cyan-600 dark:text-accent hover:bg-accent/10 transition-colors"
              >
                Demo
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile REAL / SIMULATION Mode Selector */}
          <div className="flex items-center p-0.5 rounded-full bg-slate-900/90 dark:bg-surface-elevated/95 border border-white/10 shadow-xs">
            <button
              type="button"
              onClick={() => handleToggleEnvironment('REAL')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] xs:text-[11px] font-semibold transition-all',
                environment === 'REAL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200',
              )}
              title="Switch to Real Operational Mode"
              aria-pressed={environment === 'REAL'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleEnvironment('DEMO')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] xs:text-[11px] font-semibold transition-all',
                environment === 'DEMO'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200',
              )}
              title="Switch to Demo Simulation Mode"
              aria-pressed={environment === 'DEMO'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Sim</span>
            </button>
          </div>

          {/* Compact Report Button on Mobile */}
          <button
            type="button"
            onClick={handleOpenReport}
            className="inline-flex items-center gap-1 px-2 xs:px-2.5 py-1 rounded-lg text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 border border-accent/40 shadow-xs transition-all active:scale-95 flex-shrink-0"
            title="Report Disaster Incident"
          >
            <span>📢</span>
            <span className="hidden xs:inline">Report</span>
          </button>

          <ThemeToggle size="sm" className="hidden sm:inline-flex" />

          <button
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white/98 dark:bg-surface-card border-b border-slate-200 dark:border-white/[0.06] shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="px-4 py-3 flex flex-col gap-0.5">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'text-cyan-700 dark:text-accent bg-accent/15 dark:bg-accent/10 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5',
                )}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-2 mt-1 border-t border-slate-200 dark:border-white/[0.06] flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  {currentRole === ROLES.CITIZEN || currentRole === ROLES.REGISTERED_USER ? (
                    <Link
                      href="/map"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent/15 text-cyan-700 dark:text-accent border border-accent/30"
                    >
                      <Map className="w-4 h-4" />
                      Live Map
                    </Link>
                  ) : (
                    <Link
                      href={getDashboardHref(currentRole)}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent/15 text-cyan-700 dark:text-accent border border-accent/30"
                    >
                      <Shield className="w-4 h-4" />
                      Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      handleRealSignOut();
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </>
              ) : isDemo ? (
                <>
                  {currentRole === ROLES.CITIZEN ? (
                    <Link
                      href="/demo"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    >
                      <KeyRound className="w-4 h-4" />
                      Demo Roles
                    </Link>
                  ) : (
                    <Link
                      href={getDashboardHref(currentRole)}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    >
                      <Shield className="w-4 h-4" />
                      Open Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      handleExitDemo();
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-500 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Exit Demo &amp; Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/demo"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-accent/30 text-cyan-600 dark:text-accent hover:bg-accent/10 transition-colors"
                  >
                    Demo
                  </Link>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between px-1">
              <span className="text-xs text-slate-500">Theme Appearance</span>
              <ThemeToggle size="sm" showLabel={true} />
            </div>




          </div>
        </div>
      )}
    </header>
  );
}
