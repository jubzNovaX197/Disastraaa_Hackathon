'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { isAuthorizedForOperations } from '@/lib/auth/roles';
import { AuthorityAccessGate } from '@/components/auth/AuthorityAccessGate';
import { SimulatorHeader } from './SimulatorHeader';
import { ScenarioSetupPanel } from './ScenarioSetupPanel';
import { ScenarioSummaryBanner } from './ScenarioSummaryBanner';
import { BeforeAfterComparisonGrid } from './BeforeAfterComparisonGrid';
import { RiskImpactSimulationPanel } from './RiskImpactSimulationPanel';
import { ShelterResourceSimulationPanel } from './ShelterResourceSimulationPanel';
import { RoadAlertSimulationPanel } from './RoadAlertSimulationPanel';
import { ResponseRequirementsCard } from './ResponseRequirementsCard';
import { SimulationTimelineStepper } from './SimulationTimelineStepper';
import { SimulationMapSection } from './SimulationMapSection';
import { ScenarioComparisonModal } from './ScenarioComparisonModal';
import { DEFAULT_SCENARIO_CONFIG } from '@/lib/simulation/presets';
import { runSimulation } from '@/lib/simulation/engine';
import { aggregateCommandCenterData } from '@/lib/commandCenter/aggregator';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import type {
  ScenarioConfiguration,
  SimulationResult,
  ScenarioPreset,
} from '@/lib/simulation/types';
import { ROLES, type Role } from '@/types/roles';

interface ResponseSimulatorDashboardProps {
  initialRole?: Role;
}

export function ResponseSimulatorDashboard({
  initialRole = ROLES.STATE_AUTHORITY,
}: ResponseSimulatorDashboardProps) {
  const [role, setRole] = useState<Role>(initialRole);
  const [config, setConfig] = useState<ScenarioConfiguration>(DEFAULT_SCENARIO_CONFIG);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const { environment, switchEnvironment } = useLiveIntelligence();

  // Available Regions from Command Center priority locations
  const availableRegions = useMemo(() => {
    const ccData = aggregateCommandCenterData({ environment });
    return ccData.priorityLocations.map((l) => ({
      id: l.id,
      name: `${l.name} (${l.district})`,
    }));
  }, [environment]);

  // Primary active simulation result
  const [result, setResult] = useState<SimulationResult>(() =>
    runSimulation(DEFAULT_SCENARIO_CONFIG, environment),
  );

  // Sync result on environment or config change
  useEffect(() => {
    setResult(runSimulation(config, environment));
  }, [config, environment]);

  // Immediate recalculation when configuration changes so all controls respond in real time
  const handleConfigChange = useCallback(
    (newConfig: ScenarioConfiguration) => {
      setConfig(newConfig);
      setResult(runSimulation(newConfig, environment));
    },
    [environment],
  );

  // Run simulation handler (with visual calculation pulse)
  const handleRunSimulation = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => {
      setResult(runSimulation(config, environment));
      setIsCalculating(false);
    }, 150);
  }, [config, environment]);

  // Reset scenario handler
  const handleResetScenario = useCallback(() => {
    setConfig(DEFAULT_SCENARIO_CONFIG);
    setResult(runSimulation(DEFAULT_SCENARIO_CONFIG, environment));
  }, [environment]);

  // Preset selection handler
  const handleSelectPreset = useCallback(
    (preset: ScenarioPreset) => {
      const newConfig: ScenarioConfiguration = {
        id: preset.id,
        name: preset.name,
        hazard: preset.hazard,
        intensity: preset.intensity,
        duration: preset.duration,
        targetRegionId: preset.targetRegionId,
        populationExposureMultiplier: 1.0,
        advanced: preset.advanced,
      };
      setConfig(newConfig);
      setResult(runSimulation(newConfig, environment));
    },
    [environment],
  );

  // Authority Access Gate
  if (!isAuthorizedForOperations(role)) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
        <AuthorityAccessGate
          currentRole={role}
          onClearanceGranted={(newRole: Role) => setRole(newRole)}
        />
      </div>
    );
  }

  const isRealEmpty = environment === 'REAL' && availableRegions.length === 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* 1. Header */}
      <SimulatorHeader
        role={role}
        onRunSimulation={handleRunSimulation}
        onResetScenario={handleResetScenario}
        onSelectPreset={handleSelectPreset}
        onOpenComparison={() => setIsComparing(true)}
        isRunning={isCalculating}
      />

      {isRealEmpty ? (
        /* Empty State Banner for REAL mode when insufficient real operational data */
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-surface-card rounded-2xl border border-dashed border-slate-200 dark:border-white/10 shadow-sm space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Insufficient real operational data for simulation.
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The Response Simulator performs predictive impact modeling across active disaster hazards, affected road corridors, and jurisdiction telemetry. No verified real-time hazard corridors or operational emergencies are currently active in the REAL environment.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => switchEnvironment('DEMO')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md shadow-purple-600/20 flex items-center gap-2"
            >
              <span>Switch to Demo Environment</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Scenario Setup Panel */}
          <ScenarioSetupPanel
            config={config}
            onChange={handleConfigChange}
            availableRegions={availableRegions}
          />

          {/* 3. Scenario Summary Banner */}
          <ScenarioSummaryBanner result={result} />

          {/* 4. Before / After Comparison Grid */}
          <BeforeAfterComparisonGrid result={result} />

          {/* 5. Risk & Impact Simulation Panel */}
          <RiskImpactSimulationPanel result={result} />

          {/* 6. Shelter & Resource Readiness Simulation */}
          <ShelterResourceSimulationPanel result={result} />

          {/* 7. Road Conditions & Scenario Alert Conditions */}
          <RoadAlertSimulationPanel result={result} />

          {/* 8. Actionable Response Requirements Card */}
          <ResponseRequirementsCard requirements={result.responseRequirements} />

          {/* 9. Timeline Progression (T+0 to T+72h) */}
          <SimulationTimelineStepper timeline={result.timeline} />

          {/* 10. Geospatial Simulation Map */}
          <SimulationMapSection result={result} />

          {/* 11. Dual Scenario Comparison Modal */}
          {isComparing && (
            <ScenarioComparisonModal
              currentResult={result}
              onClose={() => setIsComparing(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
