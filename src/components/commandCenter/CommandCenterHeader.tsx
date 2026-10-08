'use client';

import { useState, useEffect } from 'react';
import { Shield, Radio, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui';
import { LiveStatusIndicator } from '@/components/realtime/LiveStatusIndicator';
import { ROLES, type Role } from '@/types/roles';
import { getDemoUserContext } from '@/lib/auth/roles';
import type { AppEnvironment } from '@/lib/env';
import { cn } from '@/lib/utils';

interface SafeUser {
  uid: string;
  name: string;
  email: string;
  role: Role;
  authorityId?: string;
  department?: string;
  geographicScope?: string;
}

interface CommandCenterHeaderProps {
  currentRole: Role;
  onRoleChange?: (newRole: Role) => void;
  activeDisastersCount: number;
  highestRiskLocation: string;
  environment?: AppEnvironment;
  onRefresh?: () => void;
  currentUser?: SafeUser | null;
}

function getRoleLabel(role: Role): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return 'National Incident Directorate (L5)';
    case ROLES.NATIONAL_AUTHORITY:
      return 'National Disaster Management Authority (NDMA)';
    case ROLES.STATE_AUTHORITY:
      return 'State Disaster Management Authority (SEOC)';
    case ROLES.DISTRICT_AUTHORITY:
      return 'District Emergency Operations Cell (DEOC)';
    case ROLES.FIELD_OPERATOR:
    case ROLES.OPERATIONS:
      return 'Field Tactical Operations Command (NDRF)';
    default:
      return 'Emergency Operations Command';
  }
}

export function CommandCenterHeader({
  currentRole,
  activeDisastersCount,
  highestRiskLocation,
  environment = 'REAL',
  currentUser: initialUser,
}: CommandCenterHeaderProps) {
  const [user, setUser] = useState<SafeUser | null>(initialUser ?? null);
  const demoContext = getDemoUserContext(currentRole);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      return;
    }
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  // Derive authority identity and scope strictly from authenticated context
  const authorityScopeLabel = user
    ? `${user.department || getRoleLabel(user.role)} · ${user.geographicScope || 'Operational Jurisdiction'}`
    : environment === 'REAL'
      ? `${getRoleLabel(currentRole)} · State Operational Jurisdiction`
      : `Simulation Persona: ${getRoleLabel(currentRole)} · ${demoContext.regionName}`;

  return (
    <header className="relative bg-gradient-to-r from-slate-900/95 via-surface-card to-slate-900/95 border border-white/[0.08] px-5 sm:px-7 py-5 rounded-2xl shadow-xl backdrop-blur-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Authority Context & Platform Heading */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent shadow-sm flex-shrink-0">
            <Shield className="w-6 h-6" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Command Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                {authorityScopeLabel}
              </span>
              <Badge
                severity={activeDisastersCount > 0 ? 'CRITICAL' : 'LOW'}
                dot={activeDisastersCount > 0}
                className="text-[11px] font-bold"
              >
                {activeDisastersCount} Active Emergencies
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Current operational situation and decision-support overview
            </p>
          </div>
        </div>

        {/* Right: Operational Telemetry & Decision Support */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated/80 border border-white/[0.08] text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-safe animate-pulse" />
            <span className="font-mono text-[11px]">
              {environment === 'REAL' ? 'LIVE SEOC FEED ONLINE' : 'SIMULATION FEED ACTIVE'}
            </span>
          </div>

          <LiveStatusIndicator />

          <Badge className="text-xs py-1 px-2.5 bg-amber-500/10 text-amber-300 border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-400" />
            Decision-Support Only
          </Badge>
        </div>
      </div>

      {/* Operational alert ticker banner */}
      <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 gap-2 overflow-x-auto">
        {environment === 'REAL' ? (
          <div className="flex items-center gap-2 min-w-max">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                activeDisastersCount > 0 ? 'bg-critical animate-ping' : 'bg-emerald-400',
              )}
            />
            <span className="font-semibold text-slate-200">Operational Focus:</span>
            <span
              className={cn(
                'font-bold',
                activeDisastersCount > 0 ? 'text-critical' : 'text-emerald-400',
              )}
            >
              {highestRiskLocation}
            </span>
            <span className="text-slate-500">|</span>
            <span>
              {activeDisastersCount > 0
                ? 'Operational early warning telemetry active'
                : 'National warning feeds standing by · Zero active civil evacuations'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-max">
            <span className="w-2 h-2 rounded-full bg-critical animate-ping" />
            <span className="font-semibold text-slate-200">Priority Operational Focus:</span>
            <span className="text-critical font-bold">{highestRiskLocation}</span>
            <span className="text-slate-500">|</span>
            <span>Wind velocities 175 km/h · Dam outflow 8.2 lakh cusecs · Evacuations active</span>
          </div>
        )}
        <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
          UTC+05:30 · SYNOPTIC T0
        </span>
      </div>
    </header>
  );
}
