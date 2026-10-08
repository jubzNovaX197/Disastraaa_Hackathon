/**
 * AI Disaster Intelligence Assistant — Provider Interface
 *
 * Pluggable provider abstraction enabling seamless transitions between:
 * - Deterministic Structured Rule Provider (zero external dependency / offline decision support)
 * - Gemini Provider (Google Generative AI)
 * - Future Anthropic / OpenAI / Local LLM providers
 */

import type { Role } from '@/types/roles';
import type { AssistantIntent, AssistantResponsePayload, StructuredContextPayload } from '../types';

export interface GenerateInput {
  question: string;
  intent: AssistantIntent;
  context: StructuredContextPayload;
  locationFocus?: string;
  role?: Role;
  isAuthorizedOperations?: boolean;
}

export interface AIProvider {
  readonly name: string;
  isAvailable(): boolean;
  generateResponse(input: GenerateInput): Promise<AssistantResponsePayload>;
}
