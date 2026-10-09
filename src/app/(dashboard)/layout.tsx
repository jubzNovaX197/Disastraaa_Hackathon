import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';

/**
 * Dashboard layout — fixed desktop sidebar / mobile drawer + scrollable main area with live intelligence ticker.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
