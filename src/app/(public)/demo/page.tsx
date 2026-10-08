import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ROLE_COOKIE_NAME, parseRoleFromCookie } from '@/lib/auth/roles';
import { DemoAccessPortal } from '@/components/auth/DemoAccessPortal';

export const metadata: Metadata = {
  title: 'Demo Access · Role-Based Evaluation Portal',
  description: 'Select an operational disaster-management role to evaluate Disastraaa command centers and response workflows.',
};

export default async function DemoPage() {
  const cookieStore = await cookies();
  const rawRole = cookieStore.get(ROLE_COOKIE_NAME)?.value;
  const initialRole = parseRoleFromCookie(rawRole ? `${ROLE_COOKIE_NAME}=${rawRole}` : undefined);

  return <DemoAccessPortal initialRole={initialRole} />;
}
