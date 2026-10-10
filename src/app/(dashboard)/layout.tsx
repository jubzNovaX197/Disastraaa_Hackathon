import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
import { resolveActiveRole } from '@/lib/auth/resolveRole';

/**
 * Dashboard layout — fixed desktop sidebar / mobile drawer + scrollable main area with live intelligence ticker.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const initialRole = await resolveActiveRole();
  return <DashboardLayoutClient initialRole={initialRole}>{children}</DashboardLayoutClient>;
}
