/**
 * AI Disaster Intelligence Assistant — Engine Orchestrator
 *
 * Core pipeline:
 * User Question → Intent Detection → Relevant Disaster Data → Structured Analysis → AI Explanation → Sources
 */

import { detectAssistantIntent } from './intent';
import { buildGroundedContext } from './context';
import { GeminiProvider } from './providers/gemini-provider';
import { DeterministicProvider } from './providers/deterministic-provider';
import type { AssistantQueryRequest, AssistantResponsePayload } from './types';

export class AssistantEngine {
  private geminiProvider = new GeminiProvider();
  private deterministicProvider = new DeterministicProvider();

  async processQuery(request: AssistantQueryRequest): Promise<AssistantResponsePayload> {
    const { question, locationFocus, liveOverrides, secondsSinceSync, role } = request;

    // 1. Detect Intent & Location Focus
    const { intent, extractedLocation } = detectAssistantIntent(question, locationFocus);
    const activeLocation = extractedLocation || locationFocus;

    // 2. Build Structured Context Slice with live database grounding
    const context = await buildGroundedContext({
      intent,
      targetLocation: activeLocation,
      liveOverrides,
      secondsSinceSync,
      role,
    });

    // 3. Choose Provider: If Gemini has key, use it; otherwise use Deterministic engine
    const provider = this.geminiProvider.isAvailable()
      ? this.geminiProvider
      : this.deterministicProvider;

    // 4. Generate data-grounded response
    const response = await provider.generateResponse({
      question,
      intent,
      context,
      locationFocus: activeLocation,
      role,
    });

    return response;
  }
}

export const assistantEngine = new AssistantEngine();
