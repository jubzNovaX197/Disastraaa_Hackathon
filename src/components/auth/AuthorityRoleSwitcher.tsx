'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronDown, Check, UserCheck, Lock } from 'lucide-react';
import { ROLES, type Role } from '@/types/roles';
import { ROLE_COOKIE_NAME } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: { role: Role; label: string; desc: string; access: 'Governance' | 'National' | 'State' | 'District' | 'Field' | 'None' }[] = [
  {
    role: ROLES.SUPER_ADMIN,
    label: 'Super Admin',
    desc: 'Platform governance, multi-agency RBAC policies & security audit trail',
    access: 'Governance',
  },
  {
    role: ROLES.NATIONAL_AUTHORITY,
    label: 'National Authority (NDMA)',
    desc: 'National situation monitoring, cross-state intelligence & central coordination',
    access: 'National',
  },
  {
    role: ROLES.STATE_AUTHORITY,
    label: 'State Authority (SEOC)',
    desc: 'Full statewide command, alert authorization & resource allocation',
    access: 'State',
  },
  {
    role: ROLES.DISTRICT_AUTHORITY,
    label: 'District Authority (DEOC)',
    desc: 'District-level incident operations & ground response clearance',
    access: 'District',
  },
  {
    role: ROLES.FIELD_OPERATOR,
    label: 'Field Operator (NDRF)',
    desc: 'Tactical field logistics, rescue teams & incident evidence capture',
    access: 'Field',
  },
  {
    role: ROLES.CITIZEN,
    label: 'Public Citizen (Unauthorized)',
    desc: 'Public viewing portal; Operations Command Center restricted',
    access: 'None',
  },
];

interface AuthorityRoleSwitcherProps {
  currentRole: Role;
  onRoleChange?: (newRole: Role) => void;
  className?: string;
  compact?: boolean;
}

export function AuthorityRoleSwitcher({
  currentRole,
  onRoleChange,
  className,
  compact = false,
}: AuthorityRoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSelectRole = (newRole: Role) => {
    // Set cookie valid for 7 days
    document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(newRole)}; path=/; max-age=604800; SameSite=Lax`;
    setOpen(false);
    if (onRoleChange) {
      onRoleChange(newRole);
    } else {
      router.refresh();
    }
  };

  const currentOption = ROLE_OPTIONS.find((r) => r.role === currentRole) ?? ROLE_OPTIONS[0];
  const isUnauthorized = currentRole === ROLES.CITIZEN;

  return (
    <div className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm',
          isUnauthorized
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
            : 'bg-accent/15 dark:bg-accent/10 text-cyan-700 dark:text-accent border border-accent/30 hover:bg-accent/20',
        )}
        aria-expanded={open}
        aria-haspopup="true"
        title="Switch simulated authorization role"
      >
        {isUnauthorized ? (
          <Lock className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Shield className="w-3.5 h-3.5 text-accent" />
        )}
        <div className="text-left">
          <span className="font-semibold">{currentOption.label}</span>
          {!compact && (
            <span className="hidden sm:inline-block ml-1.5 opacity-75 text-[10px]">
              [{currentOption.access} Access]
            </span>
          )}
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 opacity-70 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-white dark:bg-surface-elevated border border-slate-200 dark:border-white/10 shadow-2xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-white/[0.06] mb-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-accent" />
                Simulate Authority Role
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Test authority-facing clearance and role gating in prototype mode.
              </p>
            </div>

            <div className="space-y-1">
              {ROLE_OPTIONS.map((item) => {
                const isSelected = item.role === currentRole;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleSelectRole(item.role)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start justify-between gap-2',
                      isSelected
                        ? 'bg-accent/15 dark:bg-accent/15 text-accent font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5',
                    )}
                    role="menuitem"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{item.label}</span>
                        {item.role === ROLES.CITIZEN ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                            Restricted
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-safe/10 text-safe font-bold border border-safe/20">
                            Cleared
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <a
                href="/demo"
                onClick={() => setOpen(false)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-between text-[11px] font-medium transition-colors"
              >
                <span>Full Demo Access Portal</span>
                <span className="text-accent font-semibold">Open →</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
