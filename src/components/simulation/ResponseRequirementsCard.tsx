'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { SimulatedResponseSummary } from '@/lib/simulation/types';
import { formatNumber } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  HeartPulse,
  Home,
  LifeBuoy,
  Package,
  Sailboat,
  Truck,
  Users
} from 'lucide-react';

interface ResponseRequirementsCardProps {
  requirements: SimulatedResponseSummary;
}

export function ResponseRequirementsCard({ requirements }: ResponseRequirementsCardProps) {
  const items = [
    {
      label: 'Additional Potable Water',
      value: `+${formatNumber(requirements.additionalWater)}`,
      unit: 'units / packets',
      icon: LifeBuoy,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Additional Medical Rations',
      value: `+${formatNumber(requirements.additionalMedical)}`,
      unit: 'trauma & sterile kits',
      icon: HeartPulse,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
    {
      label: 'Additional Rescue Personnel',
      value: `+${requirements.additionalRescueTeams}`,
      unit: 'NDRF / ODRAF teams',
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'All-Terrain Transport Vehicles',
      value: `+${requirements.additionalVehicles}`,
      unit: '4x4 / high-clearance units',
      icon: Truck,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Inundation Evacuation Boats',
      value: `+${requirements.additionalBoats}`,
      unit: 'motorized inflatable craft',
      icon: Sailboat,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      label: 'Additional Shelter Capacity',
      value: requirements.additionalShelterBeds > 0 ? `+${formatNumber(requirements.additionalShelterBeds)}` : '0',
      unit: 'requisitioned beds',
      icon: Home,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Emergency Family Kits',
      value: `+${formatNumber(requirements.additionalEmergencyKits)}`,
      unit: 'tarps & essentials',
      icon: Package,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      label: 'Operational Food Supplies',
      value: `+${formatNumber(requirements.additionalFood)}`,
      unit: 'dry ration packets',
      icon: CheckCircle2,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10 border-teal-500/20',
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
      <DataProvenance model source="Simulated" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-500" />
            <span>Simulated Response Logistics Requirements</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Incremental logistics, personnel, and life-safety assets required to mitigate scenario deficits
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">
                    {item.label}
                  </span>
                  <div className={`p-1 rounded ${item.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                </div>
                <div className={`text-xl font-extrabold mt-1.5 ${item.color}`}>
                  {item.value}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {item.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
