/**
 * Travel Risk Engine — Route + Destination Combined Risk
 *
 * ⚠️  PROTOTYPE DECISION SUPPORT — NOT LIVE EMERGENCY FORECAST
 *
 * Combines route transit risk (Task 13 engine output) with destination safety
 * risk into a unified, explainable Overall Travel Risk metric.
 *
 * Formula:
 *   Destination Risk = 100 - Destination Safety Score
 *   Overall Travel Risk = round(0.55 * Route Risk + 0.45 * Destination Risk)
 *   (If route contains impassable blocked segments, overall risk floor is 78 CRITICAL).
 */

import type { RouteComparison, RouteResult } from '@/lib/routing/types';
import type { Severity } from '@/types';
import type {
  DestinationSafetyResult,
  DestinationSafetyStatus,
  RouteOptionMetrics,
  TravelRiskResult,
} from './types';

function riskScoreToStatus(score: number): DestinationSafetyStatus {
  if (score <= 25) return 'SAFE';
  if (score <= 50) return 'CAUTION';
  if (score <= 75) return 'HIGH_RISK';
  return 'CRITICAL';
}

function riskScoreToSeverity(score: number): Severity {
  if (score <= 25) return 'LOW';
  if (score <= 50) return 'MODERATE';
  if (score <= 75) return 'HIGH';
  return 'CRITICAL';
}

export interface TravelRiskInput {
  routeResult?: RouteResult | null;
  destinationSafety: DestinationSafetyResult;
  comparisonRoutes?: RouteComparison | null;
}

export function calculateTravelRisk({
  routeResult,
  destinationSafety,
  comparisonRoutes,
}: TravelRiskInput): TravelRiskResult {
  const destSafetyScore = destinationSafety.safetyScore;
  const destRiskScore = Math.max(0, Math.min(100, 100 - destSafetyScore));
  const destRiskSeverity = riskScoreToSeverity(destRiskScore);

  // If no route calculated yet, return destination-focused travel risk
  if (!routeResult || !routeResult.found) {
    return {
      hasRoute: false,
      routeRiskScore: 0,
      routeRiskSeverity: 'LOW',
      destinationSafetyScore: destSafetyScore,
      destinationRiskScore: destRiskScore,
      destinationRiskSeverity: destRiskSeverity,
      overallTravelRiskScore: destRiskScore,
      overallTravelStatus: riskScoreToStatus(destRiskScore),
      formulaExplanation:
        'No route calculated. Overall travel risk reflects destination baseline risk.',
      recommendation:
        destRiskScore > 50
          ? 'Destination has elevated hazard conditions. Select an origin point to evaluate safe travel corridors.'
          : 'Destination is currently in a safe sector. Plan your transit route to confirm road conditions.',
    };
  }

  const routeRiskScore = routeResult.riskScore;
  const routeRiskSeverity = routeResult.riskSeverity;

  // Calculate combined risk
  let rawCombined = Math.round(0.55 * routeRiskScore + 0.45 * destRiskScore);

  // Penalty if route traverses blocked road
  const hasBlockedSegment = routeResult.segments.some((s) => s.isBlocked);
  if (hasBlockedSegment) {
    rawCombined = Math.max(rawCombined, 78);
  }

  const overallTravelRiskScore = Math.max(0, Math.min(100, rawCombined));
  const overallTravelStatus = riskScoreToStatus(overallTravelRiskScore);

  const formulaExplanation = hasBlockedSegment
    ? `Overall Travel Risk (${overallTravelRiskScore}/100) elevated to CRITICAL because route traverses blocked/closed infrastructure.`
    : `Overall Travel Risk (${overallTravelRiskScore}/100) = 55% Route Risk (${routeRiskScore}/100) + 45% Destination Risk (${destRiskScore}/100).`;

  let recommendation = 'Route and destination conditions indicate low risk for travel.';
  if (overallTravelStatus === 'CRITICAL') {
    recommendation =
      'Travel is NOT advised under current scenario. Corridor or destination is under critical disaster threat.';
  } else if (overallTravelStatus === 'HIGH_RISK') {
    recommendation =
      'Elevated danger along corridor and/or destination. Non-emergency transit should be deferred.';
  } else if (overallTravelStatus === 'CAUTION') {
    recommendation =
      'Exercise caution. Expect weather-related transit delays and monitor emergency advisories.';
  }

  // Build comparison metrics if comparisonRoutes provided
  let routeComparison: TravelRiskResult['routeComparison'];
  if (comparisonRoutes) {
    const calcMetrics = (res: RouteResult): RouteOptionMetrics => {
      if (!res.found) {
        return {
          distanceKm: 0,
          totalMinutes: 0,
          routeRiskScore: 0,
          destRiskScore,
          overallRiskScore: 0,
          status: 'CRITICAL',
        };
      }
      let comb = Math.round(0.55 * res.riskScore + 0.45 * destRiskScore);
      if (res.segments.some((s) => s.isBlocked)) {
        comb = Math.max(comb, 78);
      }
      const score = Math.max(0, Math.min(100, comb));
      return {
        distanceKm: res.totalDistanceKm,
        totalMinutes: res.totalMinutes,
        routeRiskScore: res.riskScore,
        destRiskScore,
        overallRiskScore: score,
        status: riskScoreToStatus(score),
      };
    };

    routeComparison = {
      shortest: calcMetrics(comparisonRoutes.shortest),
      safest: calcMetrics(comparisonRoutes.safest),
      alternative: comparisonRoutes.alternative.found
        ? calcMetrics(comparisonRoutes.alternative)
        : undefined,
    };
  }

  return {
    hasRoute: true,
    routeMode: routeResult.mode,
    routeRiskScore,
    routeRiskSeverity,
    destinationSafetyScore: destSafetyScore,
    destinationRiskScore: destRiskScore,
    destinationRiskSeverity: destRiskSeverity,
    overallTravelRiskScore,
    overallTravelStatus,
    formulaExplanation,
    recommendation,
    routeComparison,
  };
}
