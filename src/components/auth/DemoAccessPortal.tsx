'use client';

/**
 * DemoAccessPortal
 *
 * Professional role-based demo access portal for the Disastraaa platform.
 * Enables evaluators and presenters to assume operational personas and
 * immediately navigate to their role-specific dashboard.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  Globe2,
  Building2,
  MapPin,
  Truck,
  Eye,
  CheckCircle2,
  ArrowRight,
  Shield,
  User,
  Sparkles,
  Lock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ROLES, type Role } from '@/types/roles';
import {
  ROLE_COOKIE_NAME,
  DEMO_ROLES_CONFIG,
  parseRoleFromCookie,
  getDemoUserContext,
  type DemoRoleDefinition,
} from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  ShieldAlert,
  Globe2,
  Building2,
  MapPin,
  Truck,
};

interface DemoAccessPortalProps {
  initialRole?: Role;
}

export function DemoAccessPortal({ initialRole }: DemoAccessPortalProps) {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<Role>(initialRole ?? ROLES.CITIZEN);
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const active = parseRoleFromCookie(document.cookie);
      setCurrentRole(active);
    }
  }, []);

  const handleSelectRole = (role: Role, targetRoute: string) => {
    setLoadingRole(role);
    // 1. Set cookies (valid 7 days)
    document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(role)}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `disastraaa-env=DEMO; path=/; max-age=604800; SameSite=Lax`;

    // 2. LocalStorage backup
    try {
      localStorage.setItem('disastraaa-demo-role', role);
    } catch {
      // ignore
    }

    setCurrentRole(role);

    // 3. Smooth transition to role dashboard
    setTimeout(() => {
      router.push(targetRoute);
      router.refresh();
    }, 250);
  };

  const activeContext = getDemoUserContext(currentRole);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient mesh */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-10">
        {/* Top Breadcrumb & Return to Map */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/map" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              Public Live Map
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-medium">Demo Access Portal</span>
          </div>

          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            ← Back to Public Map
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Operational Role Simulation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Disastraaa Role-Based Demo Access
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Disastraaa enforces multi-tier Role-Based Access Control (RBAC) across government jurisdictions.
            Select an operational role below to enter the corresponding command center, analytics dashboard, or tactical field view.
          </p>

          {/* Active session bar if an operational role is already assumed */}
          {currentRole !== ROLES.CITIZEN && (
            <div className="mt-4 p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl inline-flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="text-slate-400">Current Active Session:</span>
              <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                {activeContext.name} ({activeContext.role})
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">{activeContext.regionName}</span>
              <Link
                href={
                  currentRole === ROLES.SUPER_ADMIN
                    ? '/governance'
                    : currentRole === ROLES.NATIONAL_AUTHORITY
                    ? '/analytics'
                    : currentRole === ROLES.FIELD_OPERATOR
                    ? '/operations'
                    : '/dashboard'
                }
                className="ml-2 font-semibold text-accent hover:underline flex items-center gap-1"
              >
                Resume Active Dashboard →
              </Link>
            </div>
          )}
        </div>

        {/* 5 Authority Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEMO_ROLES_CONFIG.map((roleDef: DemoRoleDefinition) => {
            const Icon = ICON_MAP[roleDef.icon] ?? Shield;
            const isCurrent = currentRole === roleDef.role;
            const isLoading = loadingRole === roleDef.role;

            return (
              <div
                key={roleDef.role}
                className={cn(
                  'relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200',
                  'bg-surface-card/90 backdrop-blur-xl hover:shadow-xl hover:-translate-y-0.5',
                  isCurrent
                    ? 'border-cyan-500/60 ring-2 ring-cyan-500/20 shadow-cyan-500/10'
                    : 'border-white/[0.08] hover:border-white/20',
                )}
              >
                {/* Header: Clearance pill & Active indicator */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                        roleDef.badgeVariant === 'critical'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : roleDef.badgeVariant === 'warning'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : roleDef.badgeVariant === 'accent'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : roleDef.badgeVariant === 'info'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                      )}
                    >
                      {roleDef.clearanceLabel}
                    </span>

                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    )}
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border',
                        roleDef.badgeVariant === 'critical'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : roleDef.badgeVariant === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : roleDef.badgeVariant === 'accent'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : roleDef.badgeVariant === 'info'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {roleDef.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {roleDef.jurisdiction}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    {roleDef.shortDesc}
                  </p>

                  {/* Simulated Officer Persona */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>Simulated Persona:</span>
                    </div>
                    <div className="font-semibold text-slate-200">
                      {roleDef.assignedOfficer}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {roleDef.officerTitle}
                    </div>
                  </div>

                  {/* Key Capabilities */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Role Capabilities:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {roleDef.primaryCapabilities.map((cap, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-cyan-400 text-xs font-bold leading-none mt-0.5">·</span>
                          <span className="leading-snug">{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Enter Button */}
                <div className="pt-5 mt-4 border-t border-white/[0.06]">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSelectRole(roleDef.role, roleDef.defaultDashboard)}
                    className={cn(
                      'w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md',
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-cyan-500/40',
                    )}
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Loading Clearance...</span>
                    ) : (
                      <>
                        <span>{isCurrent ? 'Enter Dashboard' : `Enter as ${roleDef.name}`}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Public Citizen Card (Unrestricted Entry) */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-white/10 text-slate-400 flex items-center justify-center flex-shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Public Citizen / Field Reporter</h4>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                  Public Mode · Zero Clearance
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Explore the public Live Situation Map, early warnings, route safety evaluation, and citizen disaster incident reporting.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSelectRole(ROLES.CITIZEN, '/map')}
            className="w-full sm:w-auto flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <span>Continue as Public Citizen</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Environment Notice */}
        <div className="p-4 rounded-xl bg-surface-card/50 border border-white/[0.05] text-xs text-slate-400 text-center space-y-1">
          <p className="font-medium text-slate-300 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-accent" />
            Demo Environment
          </p>
          <p className="text-[11px] text-slate-500 max-w-2xl mx-auto">
            Each role opens a simulated operational dashboard using demo data, separate from any real operational records. Selections are remembered for this browser session only.
          </p>
        </div>
      </div>
    </div>
  );
}
