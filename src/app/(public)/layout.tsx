import { PublicNav } from '@/components/layout/PublicNav';

/**
 * Public layout — wraps all routes in the (public) group.
 * Adds the fixed top nav; each page manages its own top padding
 * and optional footer so the map page can be truly full-screen.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      {children}
    </>
  );
}
