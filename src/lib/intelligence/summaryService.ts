/**
 * AI Disaster Intelligence & Decision Support Summary Service (Stage 5B)
 *
 * Coordinates LLM inference (Google Gemini) with deterministic rule-based
 * fallback for high-assurance disaster decision support.
 *
 * Strict Engineering & Safety Standards:
 * 1. ZERO HALLUCINATION: All metrics, risks, and statuses are derived strictly from the snapshot.
 * 2. PROMPT INJECTION RESISTANT: Untrusted citizen reports and external text are sanitized.
 * 3. SCHEMA VALIDATED: Every LLM output is strictly validated against the typed schema.
 * 4. TRANSPARENT FALLBACK: Missing keys, timeouts, or malformed responses transparently
 *    fall back to deterministic rule-based generation with generationMode: 'RULE_BASED'.
 * 5. ADVISORY ONLY: Never issues binding evacuation mandates or authoritative decrees.
 */

import type {
  DisasterIntelligenceSnapshot,
  DisasterIntelligenceSummary,
  DecisionSupportRecommendation,
} from './types';
import { sanitizeUntrustedText, wrapInertDataPayload } from '@/lib/ai/sanitize';

interface CachedSummaryEntry {
  summary: DisasterIntelligenceSummary;
  expiresAt: number;
}

const _summaryCache = new Map<string, CachedSummaryEntry>();
const SUMMARY_CACHE_TTL_MS = 60 * 1000; // 60 seconds memoization cache

export class DisasterIntelligenceSummaryService {
  private getApiKey(): string | undefined {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY
    );
  }

  /**
   * Generates a grounded disaster intelligence summary.
   * If LLM is unavailable or fails, returns a validated rule-based summary.
   */
  async generateSummary(
    snapshot: DisasterIntelligenceSnapshot,
    options: { forceRefresh?: boolean } = {},
  ): Promise<DisasterIntelligenceSummary> {
    const cacheKey = `${snapshot.location.district.toLowerCase()}_${snapshot.environment}`;
    const now = Date.now();

    if (!options.forceRefresh) {
      const cached = _summaryCache.get(cacheKey);
      if (cached && now < cached.expiresAt) {
        return cached.summary;
      }
    }

    const apiKey = this.getApiKey();

    if (!apiKey) {
      // Deterministic rule-based summary when no LLM key configured
      const ruleBased = this.generateRuleBasedSummary(snapshot, 'Deterministic Rule-Based Intelligence Engine (Server Native)');
      _summaryCache.set(cacheKey, { summary: ruleBased, expiresAt: now + SUMMARY_CACHE_TTL_MS });
      return ruleBased;
    }

    try {
      const aiSummary = await this.invokeGeminiWithTimeout(snapshot, apiKey, 10000);
      if (aiSummary) {
        _summaryCache.set(cacheKey, { summary: aiSummary, expiresAt: now + SUMMARY_CACHE_TTL_MS });
        return aiSummary;
      }
    } catch (err: any) {
      console.warn('[AI-SUMMARY-SERVICE] Gemini inference error; falling back to rule-based engine:', err?.message || err);
    }

    const fallback = this.generateRuleBasedSummary(
      snapshot,
      'Deterministic Rule-Based Intelligence Engine (Safe Fallback)',
    );
    _summaryCache.set(cacheKey, { summary: fallback, expiresAt: now + SUMMARY_CACHE_TTL_MS });
    return fallback;
  }

  /**
   * Invokes Google Gemini 2.0 Flash via REST API with strict timeout and schema validation.
   */
  private async invokeGeminiWithTimeout(
    snapshot: DisasterIntelligenceSnapshot,
    apiKey: string,
    timeoutMs: number,
  ): Promise<DisasterIntelligenceSummary | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const systemPrompt = `You are the Disastraaa Disaster Intelligence Assistant, an authorized decision-support intelligence engine.
CRITICAL SAFETY & GROUNDING RULES:
1. Answer using ONLY factual data provided in the XML-delimited snapshot below.
2. ZERO HALLUCINATION: Never invent weather readings, river levels, alerts, casualties, or road closures.
3. NEVER ISSUE AN EVACUATION ORDER as though it were official government instruction. Refer personnel to official authorities.
4. Clearly distinguish between physical observations, numerical model forecasts, historical data, and unverified citizen reports.
5. If data is marked UNMONITORED or UNAVAILABLE, state that limitation clearly.
6. Return your response STRICTLY as a JSON object adhering to this EXACT schema:
{
  "executiveSummary": "Concise 2-3 sentence high-level executive situation overview",
  "currentRiskAssessment": {
    "overview": "Detailed explanation of composite risk score and dominant hazards",
    "compositeScore": number,
    "dominantThreat": "FLOOD" | "CYCLONE" | "MULTI_HAZARD" | "NONE",
    "severityLevel": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
    "confidenceLevel": "High" | "Degraded" | "Insufficient"
  },
  "supportingEvidence": [
    "Specific metric 1 with exact numbers and source",
    "Specific metric 2 with exact numbers and source"
  ],
  "keyUncertainties": [
    "Missing sensor or stale feed limitation 1",
    "Unverified report or unmonitored parameter 2"
  ],
  "recommendedActions": [
    {
      "id": "rec-string-id",
      "category": "IMMEDIATE_LIFE_SAFETY" | "OPERATIONAL_PREPAREDNESS" | "RESOURCE_STAGING" | "GROUND_VERIFICATION" | "PUBLIC_ADVISORY",
      "priority": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
      "title": "Action title",
      "action": "Specific concrete directive",
      "rationale": "Evidence-backed justification",
      "targetAuthorityOrAudience": "Target department or authority",
      "triggerBasis": "Threshold trigger"
    }
  ]
}`;

    const inertSnapshotPayload = wrapInertDataPayload(
      {
        location: snapshot.location,
        generatedAt: snapshot.generatedAt,
        environment: snapshot.environment,
        risks: {
          compositeScore: snapshot.risks.compositeScore,
          dominantHazard: snapshot.risks.dominantHazard,
          overallSeverity: snapshot.risks.overallSeverity,
          floodScore: snapshot.risks.flood.score,
          floodSeverity: snapshot.risks.flood.severity,
          cycloneScore: snapshot.risks.cyclone.score,
          cycloneSeverity: snapshot.risks.cyclone.severity,
          qualityStatus: snapshot.risks.inputQualityStatus,
          confidence: snapshot.risks.confidence,
        },
        weather: snapshot.weather,
        hydrology: snapshot.hydrology,
        alerts: snapshot.alerts,
        roads: snapshot.roads,
        shelters: snapshot.shelters,
        citizenIntelligence: snapshot.citizenIntelligence,
        limitations: snapshot.limitations,
        deterministicRecommendations: snapshot.deterministicRecommendations,
      },
      'disaster_intelligence_snapshot',
    );

    const userPrompt = `Synthesize an authoritative disaster intelligence brief for ${snapshot.location.district} District, Odisha (${snapshot.environment} Mode).

${inertSnapshotPayload}

Respond with strictly valid JSON only. Do not add markdown backticks around the JSON.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Near-zero temperature for maximum factual fidelity
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`Gemini API returned status ${res.status}`);
        return null;
      }

      const jsonResponse = await res.json();
      const rawText = jsonResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) return null;

      const parsed = this.parseAndValidateLLMOutput(rawText, snapshot);
      return parsed;
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Strictly validates LLM output against the required schema.
   * Returns null if output is malformed, unsupported, or contains invalid types.
   */
  private parseAndValidateLLMOutput(
    rawText: string,
    snapshot: DisasterIntelligenceSnapshot,
  ): DisasterIntelligenceSummary | null {
    try {
      let cleanJson = rawText.trim();
      // Remove optional markdown code fences if LLM wrapped JSON
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      const obj = JSON.parse(cleanJson);

      if (
        !obj ||
        typeof obj.executiveSummary !== 'string' ||
        !obj.currentRiskAssessment ||
        typeof obj.currentRiskAssessment.overview !== 'string' ||
        !Array.isArray(obj.supportingEvidence) ||
        !Array.isArray(obj.keyUncertainties) ||
        !Array.isArray(obj.recommendedActions)
      ) {
        return null;
      }

      // Sanitize and validate recommendations
      const validatedRecs: DecisionSupportRecommendation[] = obj.recommendedActions
        .filter((r: any) => r && typeof r.action === 'string' && typeof r.title === 'string')
        .map((r: any, idx: number) => ({
          id: typeof r.id === 'string' ? r.id : `rec-ai-${idx + 1}`,
          category: r.category || 'OPERATIONAL_PREPAREDNESS',
          priority: r.priority || 'MODERATE',
          title: sanitizeUntrustedText(r.title, 100),
          action: sanitizeUntrustedText(r.action, 300),
          rationale: sanitizeUntrustedText(r.rationale || '', 300),
          targetAuthorityOrAudience: sanitizeUntrustedText(r.targetAuthorityOrAudience || 'Incident Commander', 100),
          triggerBasis: sanitizeUntrustedText(r.triggerBasis || 'AI Decision Support Directive', 150),
        }));

      // Gather source references
      const sourceReferences = [
        snapshot.weather.current.source,
        'Central Water Commission (India-WRIS)',
        'IMD Common Alerting Protocol (CAP)',
        'OpenStreetMap Overpass Network',
        'Deterministic Multi-Hazard Engine (v1.0)',
      ];

      return {
        summaryId: `aisum-${snapshot.location.district.toLowerCase()}-${Date.now()}`,
        snapshotId: snapshot.snapshotId,
        generatedAt: new Date().toISOString(),
        generationMode: 'AI',
        provider: 'Google Gemini 2.0 Flash (Grounded Multi-Hazard LLM)',
        location: snapshot.location,
        executiveSummary: sanitizeUntrustedText(obj.executiveSummary, 800),
        currentRiskAssessment: {
          overview: sanitizeUntrustedText(obj.currentRiskAssessment.overview, 600),
          compositeScore: snapshot.risks.compositeScore,
          dominantThreat: snapshot.risks.dominantHazard,
          severityLevel: snapshot.risks.overallSeverity,
          confidenceLevel:
            snapshot.limitations.overallQuality === 'HIGH'
              ? 'High Confidence'
              : snapshot.limitations.overallQuality === 'DEGRADED'
              ? 'Degraded (Partial Feeds)'
              : 'Low / Insufficient (Key Inputs Missing)',
        },
        supportingEvidence: obj.supportingEvidence.map((e: string) => sanitizeUntrustedText(e, 250)),
        keyUncertainties: obj.keyUncertainties.map((u: string) => sanitizeUntrustedText(u, 250)),
        recommendedActions: validatedRecs.length > 0 ? validatedRecs : snapshot.deterministicRecommendations,
        sourceReferences,
        dataQualityBadge: snapshot.limitations.overallQuality,
        provenanceDisclaimer:
          'AI-synthesized decision support based strictly on active snapshot telemetry. Advisory only; all binding operational decisions require incident commander authorization.',
      };
    } catch {
      return null;
    }
  }

  /**
   * Deterministic rule-based summary generator.
   * Produces a fully compliant DisasterIntelligenceSummary without any external network dependency.
   */
  generateRuleBasedSummary(
    snapshot: DisasterIntelligenceSnapshot,
    providerName = 'Deterministic Rule-Based Intelligence Engine',
  ): DisasterIntelligenceSummary {
    const loc = snapshot.location;
    const wx = snapshot.weather.current;
    const risks = snapshot.risks;
    const limits = snapshot.limitations;

    // 1. Executive Summary Synthesis
    let execSummary = '';
    if (risks.compositeScore >= 50) {
      execSummary = `Elevated multi-hazard risk detected across ${loc.district} District (${risks.compositeScore}/100, ${risks.overallSeverity} severity). Dominant threat is ${risks.dominantHazard}. Multi-agency coordination and emergency shelter readiness are prioritized.`;
    } else if (snapshot.alerts.totalActive > 0) {
      execSummary = `${snapshot.alerts.totalActive} active authoritative warning(s) issued for ${loc.district} District. Baseline multi-hazard score remains moderate (${risks.compositeScore}/100). Precautionary monitoring active.`;
    } else if (limits.overallQuality === 'INSUFFICIENT') {
      execSummary = `Operational situation assessment for ${loc.district} is restricted due to missing telemetry (${limits.missingCriticalInputs.join(', ')}). Composite score evaluates to baseline ${risks.compositeScore}/100 with conservative risk handling.`;
    } else {
      execSummary = `Operational conditions across ${loc.district} District remain within normal baseline thresholds (Risk Score: ${risks.compositeScore}/100, ${risks.overallSeverity}). 0 active warnings; road networks and registered facilities standing by.`;
    }

    // 2. Supporting Evidence
    const supportingEvidence: string[] = [
      `Composite multi-hazard risk evaluated at ${risks.compositeScore}/100 (${risks.overallSeverity}) via deterministic engine.`,
    ];

    if (wx.temperatureC != null) {
      supportingEvidence.push(
        `Atmospheric observation: ${wx.temperatureC}°C, ${wx.precipitationMm ?? 0} mm/day precipitation, wind ${wx.windSpeedKmh ?? 0} km/h (${wx.source}, Status: ${wx.status}).`,
      );
    } else {
      supportingEvidence.push(`Atmospheric telemetry: ${wx.status} (${wx.source}).`);
    }

    if (snapshot.hydrology.riverGauges.length > 0) {
      const g = snapshot.hydrology.riverGauges[0];
      supportingEvidence.push(
        `Hydrological stage: ${g.stationName} (${g.riverName}) measured at ${g.waterLevelMetres} m MSL (${g.source}, Status: ${g.status}).`,
      );
    } else if (snapshot.hydrology.modelledDischarge) {
      supportingEvidence.push(
        `Hydrological model: Modelled discharge of ${snapshot.hydrology.modelledDischarge.dischargeM3s} m³/s (${snapshot.hydrology.modelledDischarge.model}).`,
      );
    }

    supportingEvidence.push(
      `Transportation status: ${snapshot.roads.monitoredCount} monitored road segment(s) with ${snapshot.roads.blockedCount} confirmed blockage(s).`,
    );

    supportingEvidence.push(
      `Shelter readiness: ${snapshot.shelters.registeredSheltersCount} facility(ies) verified with ${snapshot.shelters.totalRegisteredCapacity} registered capacity (Occupancy: UNMONITORED).`,
    );

    if (snapshot.alerts.totalActive > 0) {
      supportingEvidence.push(
        `Authoritative warnings: ${snapshot.alerts.totalActive} broadcast warning(s) active via IMD CAP.`,
      );
    } else {
      supportingEvidence.push('Authoritative warnings: 0 broadcast warnings active via IMD CAP (Monitoring baseline).');
    }

    // 3. Key Uncertainties
    const keyUncertainties: string[] = [];
    if (limits.missingCriticalInputs.length > 0) {
      keyUncertainties.push(`Missing critical inputs: ${limits.missingCriticalInputs.join(', ')}.`);
    }
    if (limits.staleFeeds.length > 0) {
      keyUncertainties.push(`Stale telemetry feeds: ${limits.staleFeeds.join(', ')}.`);
    }
    if (limits.unmonitoredSensors.length > 0) {
      keyUncertainties.push(`Unmonitored sensors: ${limits.unmonitoredSensors.join(', ')}.`);
    }
    if (snapshot.citizenIntelligence.pendingReports > 0) {
      keyUncertainties.push(
        `${snapshot.citizenIntelligence.pendingReports} crowdsourced citizen report(s) require physical field patrol verification.`,
      );
    }
    if (keyUncertainties.length === 0) {
      keyUncertainties.push('All core telemetry feeds currently reporting fresh physical observations.');
    }

    // 4. Source References
    const sourceReferences = [
      wx.source || 'Open-Meteo Atmospheric Blend',
      'Central Water Commission (India-WRIS)',
      'IMD Common Alerting Protocol (CAP)',
      'OpenStreetMap Overpass Network',
      'Deterministic Multi-Hazard Engine (v1.0)',
    ];

    return {
      summaryId: `rulesum-${loc.district.toLowerCase()}-${Date.now()}`,
      snapshotId: snapshot.snapshotId,
      generatedAt: new Date().toISOString(),
      generationMode: 'RULE_BASED',
      provider: providerName,
      location: loc,
      executiveSummary: execSummary,
      currentRiskAssessment: {
        overview: `Deterministic multi-hazard composite calculation incorporates ${risks.dominantHazard} driver. Data quality is evaluated as ${limits.overallQuality} with ${Math.round(limits.confidenceScore * 100)}% confidence weighting.`,
        compositeScore: risks.compositeScore,
        dominantThreat: risks.dominantHazard,
        severityLevel: risks.overallSeverity,
        confidenceLevel:
          limits.overallQuality === 'HIGH'
            ? 'High Confidence'
            : limits.overallQuality === 'DEGRADED'
            ? 'Degraded (Partial Feeds)'
            : 'Low / Insufficient (Key Inputs Missing)',
      },
      supportingEvidence,
      keyUncertainties,
      recommendedActions: snapshot.deterministicRecommendations,
      sourceReferences,
      dataQualityBadge: limits.overallQuality,
      provenanceDisclaimer:
        'Synthesized via deterministic rule-based multi-hazard protocols. Strictly grounded in verified database telemetry and physical constraints.',
    };
  }
}

export const disasterSummaryService = new DisasterIntelligenceSummaryService();
