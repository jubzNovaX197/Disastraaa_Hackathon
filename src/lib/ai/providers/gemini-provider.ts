/**
 * AI Disaster Intelligence Assistant — Google Gemini Provider
 *
 * Grounded LLM provider using Google Generative AI REST API.
 * Uses strict context injection — model is prohibited from inventing ungrounded figures.
 * Falls back transparently to DeterministicProvider if API key is missing or fails.
 */

import type { AIProvider, GenerateInput } from './provider.interface';
import type { AssistantResponsePayload, DataQualityBadge, StructuredSections } from '../types';
import { DeterministicProvider } from './deterministic-provider';

export class GeminiProvider implements AIProvider {
  readonly name = 'Google Gemini 2.0 Flash (Grounded LLM)';
  private fallback = new DeterministicProvider();

  private getApiKey(): string | undefined {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY
    );
  }

  isAvailable(): boolean {
    return !!this.getApiKey();
  }

  async generateResponse(input: GenerateInput): Promise<AssistantResponsePayload> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      // Graceful fallback to deterministic provider if no external key is configured
      return this.fallback.generateResponse(input);
    }

    const { question, intent, context, locationFocus } = input;

    const systemPrompt = `You are the Disastraaa AI Disaster Intelligence Assistant, an authorized decision-support intelligence tool for emergency response coordinators.
CRITICAL RULES:
1. You must answer using ONLY the structured context provided in the JSON payload below.
2. NEVER invent numbers, names, casualties, coordinates, alerts, or road conditions.
3. If specific information is missing from the context, explicitly state that it is unavailable in the current operational feed.
4. Distinguish between verified, predicted, and simulated data where applicable.
5. Format your output strictly in Markdown with these EXACT headings:
### Situation
[Concise 2-3 sentence overview]

### Key Factors
* [Bullet point]
* [Bullet point]
* [Bullet point]

### Current Data
* **[Metric Name]**: [Value]
* **[Metric Name]**: [Value]

### Operational Context
[What existing emergency management directives or systems recommend]

### Data Freshness
[Mention last update time and source feed]`;

    const userPrompt = `USER QUESTION: "${question}"
TARGET LOCATION: ${locationFocus || 'Coastal Operational Basin (All Sectors)'}
DETECTED INTENT: ${intent}

STRUCTURED OPERATIONAL CONTEXT JSON:
${JSON.stringify(context, null, 2)}

Provide a concise, data-grounded response according to the exact required format.`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2, // Low temperature for high factual accuracy
            maxOutputTokens: 800,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`Gemini API returned status ${res.status}, falling back to deterministic engine`);
        return this.fallback.generateResponse(input);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return this.fallback.generateResponse(input);
      }

      // Parse structured sections from generated markdown
      const sections = this.parseSections(rawText, context.dataFreshness.lastSyncFormatted);

      const sources = ['Risk Intelligence', 'Active Alerts', 'Command Operations'];
      if (context.recentLiveEvents?.length) sources.push('Live Intelligence');
      if (context.relevantRoads?.length) sources.push('Road Intelligence');
      if (context.relevantShelters?.length) sources.push('Shelter Readiness');
      if (context.relevantResources?.length) sources.push('Resource Readiness');

      const dataQuality: DataQualityBadge[] = ['VERIFIED', 'PREDICTED', 'SIMULATED'];

      return {
        text: rawText,
        intent,
        sources,
        dataQuality,
        structuredSections: sections,
        providerUsed: this.name,
        locationFocus,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('Gemini invocation error, falling back to deterministic engine:', err);
      return this.fallback.generateResponse(input);
    }
  }

  private parseSections(text: string, freshnessStr: string): StructuredSections {
    const extractSection = (heading: string): string => {
      const regex = new RegExp(`###\\s*${heading}[\\r\\n]+([\\s\\S]*?)(?=###|$)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    };

    const situation = extractSection('Situation') || 'Operational conditions actively monitored.';
    const keyFactorsRaw = extractSection('Key Factors');
    const keyFactors = keyFactorsRaw
      ? keyFactorsRaw
          .split('\n')
          .map((l) => l.replace(/^[\*\-\d\.]+\s*/, '').trim())
          .filter(Boolean)
      : ['Multi-hazard impacts evaluated', 'Real-time telemetry continuous'];

    const currentDataRaw = extractSection('Current Data');
    const currentData: Record<string, string | number> = {};
    if (currentDataRaw) {
      currentDataRaw.split('\n').forEach((line) => {
        const m = line.match(/\*\*(.*?)\*\*:\s*(.*)/);
        if (m) {
          currentData[m[1].trim()] = m[2].trim();
        }
      });
    }

    const operationalContext =
      extractSection('Operational Context') || 'State Emergency Operations Center guidelines active.';
    const dataFreshness =
      extractSection('Data Freshness') || `Synchronized ${freshnessStr} (Simulated Live Feed)`;

    return {
      situation,
      keyFactors,
      currentData,
      operationalContext,
      dataFreshness,
    };
  }
}
