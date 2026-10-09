'use client';

import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { brand } from '@/config/brand';
import { getDashboardNavGroupsForRole } from '@/config/nav';
import { getDemoUserContext, parseRoleFromCookie, ROLE_COOKIE_NAME } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import { ROLES, type Role } from '@/types/roles';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Bell,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Package,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Truck,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Icon registry — avoids dynamic require; extend when adding nav items
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  BarChart2,
  Sliders,
  Bot,
  Shield,
  ShieldAlert,
  Map,
  Bell,
  FileText,
  Home,
  Package,
  Activity,
  Calendar,
  Clock,
  Truck,
  Settings,
  AlertTriangle,
  ShieldCheck,
};

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>(ROLES.STATE_AUTHORITY);
  const [realUser, setRealUser] = useState<{
    uid: string;
    name: string;
    email: string;
    role: Role;
    authorityId?: string;
    department?: string;
    geographicScope?: string;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.authenticated && data.user) {
          setRealUser(data.user);
          setCurrentRole(data.user.role);
        } else {
          setRealUser(null);
          if (typeof document !== 'undefined') {
            const active = parseRoleFromCookie(document.cookie);
            setCurrentRole(active === ROLES.CITIZEN ? ROLES.STATE_AUTHORITY : active);
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        if (typeof document !== 'undefined') {
          const active = parseRoleFromCookie(document.cookie);
          setCurrentRole(active === ROLES.CITIZEN ? ROLES.STATE_AUTHORITY : active);
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
      window.location.href = '/map';
    }
  };

  const handleDemoSignOut = async () => {
    try {
      // Clear demo cookies and reset environment to REAL
      document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0`;
      document.cookie = 'disastraaa-env=REAL; path=/; max-age=604800; SameSite=Lax';
      try {
        localStorage.removeItem('disastraaa-demo-role');
      } catch {}
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/map';
    }
  };

  const userContext = getDemoUserContext(currentRole);
  const navGroups = getDashboardNavGroupsForRole(currentRole);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <aside
      className={cn(
        'relative flex-shrink-0 h-full flex flex-col',
        'bg-white dark:bg-surface-card border-r border-slate-200 dark:border-white/[0.06]',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-14' : 'w-60',
      )}
      aria-label="Dashboard navigation"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-3 border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0 justify-between">
        <Logo size="sm" showName={!collapsed} />
      </div>

      {/* Active Persona Banner */}
      <div className="px-2 py-2 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
        {!collapsed ? (
          <div className="p-2 rounded-lg bg-surface-base dark:bg-surface-elevated/70 border border-slate-200 dark:border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1',
                  realUser
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-accent/15 text-cyan-700 dark:text-accent border-accent/20',
                )}
              >
                {realUser && <ShieldCheck className="w-2.5 h-2.5" />}
                {realUser ? (realUser.authorityId || realUser.role) : userContext.role}
              </span>
              {realUser ? (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                  Verified
                </span>
              ) : (
                <Link
                  href="/demo"
                  title="Switch Operational Persona"
                  className="text-[10px] font-semibold text-slate-500 hover:text-accent flex items-center gap-0.5 transition-colors"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Switch</span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0 text-xs font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {realUser ? realUser.name : userContext.name}
                </p>
                <p className="text-[10px] text-slate-500 truncate leading-tight">
                  {realUser
                    ? (realUser.department || realUser.geographicScope || realUser.email)
                    : userContext.regionName}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            {realUser ? (
              <div
                title={`Verified Authority: ${realUser.name} (${realUser.authorityId})`}
                className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            ) : (
              <Link
                href="/demo"
                title={`Active Persona: ${userContext.name} (${userContext.role}) — Click to switch`}
                className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center border border-accent/30 hover:bg-accent/25 transition-colors"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Nav groups (Role-tailored) */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                {group.label}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon ? iconMap[item.icon] : null;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-2 py-2 rounded-lg',
                      'text-sm font-medium transition-colors duration-150',
                      active
                        ? 'bg-accent/15 dark:bg-accent/10 text-cyan-700 dark:text-accent font-semibold'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5',
                    )}
                  >
                    {Icon && (
                      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    )}
                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/10 text-slate-400 border border-white/10">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer controls: Public Portal link + Theme toggle */}
      <div className="p-2 border-t border-slate-200 dark:border-white/[0.06] flex-shrink-0 space-y-1.5">
        {realUser ? (
          <button
            type="button"
            onClick={handleRealSignOut}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold',
              'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150',
              collapsed && 'justify-center px-0',
            )}
            title="Sign Out from Real Authority Account"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDemoSignOut}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold',
              'text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-150',
              collapsed && 'justify-center px-0',
            )}
            title="Exit Simulation and Return to Public Real Map"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
            {!collapsed && <span>Exit Demo & Sign Out</span>}
          </button>
        )}


        <div className="flex items-center justify-between gap-1.5 pt-1">
          <ThemeToggle size="sm" showLabel={!collapsed} className={collapsed ? 'w-full px-0 justify-center' : ''} />
          {!collapsed && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 pr-1">
              {brand.version}
            </span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-[72px]',
          'w-6 h-6 rounded-full',
          'bg-white dark:bg-surface-elevated border border-slate-200 dark:border-white/10',
          'flex items-center justify-center',
          'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors',
          'shadow-md z-10',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>
    </aside>
  );
}
