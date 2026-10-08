import type { Metadata } from 'next';
import { PersonnelManagementPanel } from '@/components/auth/PersonnelManagementPanel';

export const metadata: Metadata = {
  title: 'Personnel & Authority Management',
  description: 'Authorize and invite operational disaster management personnel per RBAC hierarchy.',
};

export default function PersonnelPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1400px] w-full mx-auto space-y-6">
      <PersonnelManagementPanel />
    </div>
  );
}
