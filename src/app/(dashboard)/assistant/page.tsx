import type { Metadata } from 'next';
import { IntelligenceAssistantDashboard } from '@/components/assistant';

export const metadata: Metadata = {
  title: 'Intelligence Assistant | Disastraaa',
  description:
    'AI-driven operational disaster decision support: natural language queries grounded in real-time hazard, alert, road, and logistics data.',
};

export default function AssistantPage() {
  return <IntelligenceAssistantDashboard />;
}
