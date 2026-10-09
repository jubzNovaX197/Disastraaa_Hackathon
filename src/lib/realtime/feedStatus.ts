import type { LiveConnectionStatus } from './types';

export function getFeedLabel(environment: 'REAL' | 'DEMO', status: LiveConnectionStatus, activeAlerts: number) {
  if (status === 'updating' || status === 'reconnecting') return 'Loading feed';
  if (status === 'offline') return 'Feed unavailable';
  if (status === 'delayed') return 'Feed degraded / stale';
  if (status === 'paused') return 'Feed paused';
  if (environment === 'DEMO') return 'Simulated scenario';
  return activeAlerts > 0 ? `${activeAlerts} active alerts` : 'No active alerts in received feed';
}
