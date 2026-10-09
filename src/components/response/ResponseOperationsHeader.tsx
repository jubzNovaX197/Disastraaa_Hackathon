'use client';

import { AuthorityRoleSwitcher } from '@/components/auth/AuthorityRoleSwitcher';
import { LiveStatusIndicator } from '@/components/realtime/LiveStatusIndicator';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Badge } from '@/components/ui';
import { getDemoUserContext } from '@/lib/auth/roles';
import { type Role } from '@/types/roles';
import { RefreshCw, Search, Shield } from 'lucide-react';

interface ResponseOperationsHeaderProps {
  currentRole: Role;
  onRoleChange: (newRole: Role) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh?: () => void;
}

export function ResponseOperationsHeader({
  currentRole,
  onRoleChange,
  searchQuery,
  onSearchChange,
  onRefresh,
}: ResponseOperationsHeaderProps) {
  const userContext = getDemoUserContext(currentRole);

  return (
    <header className="bg-surface-card border border-white/[0.08] px-4 sm:px-6 py-4 rounded-2xl shadow-lg backdrop-blur-xl space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Role */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                Response Operations
              </h1>
              <Badge severity="CRITICAL" dot className="text-[11px] font-bold">
                Live Coordination Active
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="text-cyan-400 font-medium">{userContext.regionName}</span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span>Tactical Logistics, Multi-Agency Coordination & Resource Allocation</span>
            </p>
          </div>
        </div>

        {/* Right: Controls & Role Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
          <LiveStatusIndicator />

          <Badge className="text-[11px] bg-amber-500/10 text-amber-300 border-amber-500/30">
            Decision Support Only
          </Badge>

          <AuthorityRoleSwitcher currentRole={currentRole} onRoleChange={onRoleChange} />

          <ThemeToggle />

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-100 border border-white/10 transition-colors"
              title="Refresh operational telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Operational search input */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search operational zones, resource categories, shelters, roads, or field reports..."
            className="w-full text-xs bg-surface-elevated border border-white/10 rounded-xl pl-9 pr-4 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </header>
  );
}
