import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Travel Safety & Route Planning | Disastraaa',
  description: 'Intelligent multi-hazard route planning, corridor risk assessment, and safe evacuation transit navigation.',
};

export default function TravelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
