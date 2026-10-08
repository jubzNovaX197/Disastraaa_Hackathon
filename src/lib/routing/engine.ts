/**
 * Routing Engine — A* / Dijkstra deterministic graph search
 *
 * ⚠️  PROTOTYPE — no external routing service.
 * Replace calculateRoute() with an OSRM / GraphHopper / pgRouting
 * adapter without changing UI components.
 */

import type { RouteNode, RouteEdge, RouteMode, RouteRequest, RouteResult, RouteSegment } from './types';
import { NODE_BY_ID, buildAdjacency, DEMO_EDGES } from './graph';
import {
  shortestCost,
  safestCost,
  alternativeCost,
  estimateTravelMinutes,
  aggregateRouteRisk,
  segmentRiskSeverity,
  BASE_SPEED_KMH,
} from './scoring';
import type { LngLat } from '@/data/types';

// ── Lazy adjacency (built once) ───────────────────────────────────────────────

let _adj: Map<string, RouteEdge[]> | null = null;
function getAdj(): Map<string, RouteEdge[]> {
  if (!_adj) _adj = buildAdjacency(DEMO_EDGES);
  return _adj;
}

// ── Heuristic (Euclidean distance in degrees — good enough for A* on small graph) ──

function heuristic(
  nodeId: string,
  goalId: string,
  nodeMap: Record<string, RouteNode> = NODE_BY_ID,
): number {
  const a = nodeMap[nodeId];
  const b = nodeMap[goalId];
  if (!a || !b) return 0;
  const dx = a.coordinates[0] - b.coordinates[0];
  const dy = a.coordinates[1] - b.coordinates[1];
  // Rough conversion: 1 degree lat/lng ≈ 111 km
  return Math.sqrt(dx * dx + dy * dy) * 111;
}

// ── A* search ────────────────────────────────────────────────────────────────

type CostFn = (edge: RouteEdge) => number;

interface AStarResult {
  nodePath: string[];
  edgePath: RouteEdge[];
  found:    boolean;
}

function astar(
  originId:      string,
  destinationId: string,
  costFn:        CostFn,
  adj:           Map<string, RouteEdge[]> = getAdj(),
  nodeMap:       Record<string, RouteNode> = NODE_BY_ID,
): AStarResult {
  // Priority queue via sorted array (small graph — fine for prototype)
  type Entry = { nodeId: string; g: number; f: number };
  const open: Entry[] = [{ nodeId: originId, g: 0, f: heuristic(originId, destinationId, nodeMap) }];

  const gScore: Record<string, number>          = { [originId]: 0 };
  const cameFromNode: Record<string, string>    = {};
  const cameFromEdge: Record<string, RouteEdge> = {};
  const visited = new Set<string>();

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const { nodeId } = current;

    if (nodeId === destinationId) {
      // Reconstruct path
      const nodePath: string[] = [];
      const edgePath: RouteEdge[] = [];
      let cur = destinationId;
      while (cur !== originId) {
        nodePath.unshift(cur);
        edgePath.unshift(cameFromEdge[cur]);
        cur = cameFromNode[cur];
      }
      nodePath.unshift(originId);
      return { nodePath, edgePath, found: true };
    }

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const edges = adj.get(nodeId) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      const tentative = (gScore[nodeId] ?? Infinity) + costFn(edge);
      if (tentative < (gScore[edge.to] ?? Infinity)) {
        gScore[edge.to]    = tentative;
        cameFromNode[edge.to] = nodeId;
        cameFromEdge[edge.to] = edge;
        open.push({ nodeId: edge.to, g: tentative, f: tentative + heuristic(edge.to, destinationId, nodeMap) });
      }
    }
  }

  return { nodePath: [], edgePath: [], found: false };
}

// ── Build RouteResult from raw A* output ──────────────────────────────────────

function buildResult(
  mode:      RouteMode,
  nodePath:  string[],
  edgePath:  RouteEdge[],
  found:     boolean,
  notFoundReason?: string,
): RouteResult {
  if (!found || edgePath.length === 0) {
    return {
      mode, nodePath, segments: [], found: false, notFoundReason: notFoundReason ?? 'No viable route found.',
      totalDistanceKm: 0, totalMinutes: 0, riskScore: 0, riskSeverity: 'LOW',
      riskExplanation: '', blockedAvoided: 0, hazardsEncountered: [], summary: '',
      mapCoordinates: [],
    };
  }

  // Build segments
  const segments: RouteSegment[] = edgePath.map((edge) => {
    const baseSpeed = BASE_SPEED_KMH[edge.roadType];
    const mins      = estimateTravelMinutes(edge);
    const severity  = segmentRiskSeverity(edge.riskScore);

    let hazardNote: string | undefined;
    if (edge.status === 'BLOCKED')           hazardNote = `⛔ BLOCKED — ${edge.roadName}`;
    else if (edge.status === 'CLOSED')       hazardNote = `🛑 OFFICIALLY CLOSED — ${edge.roadName}`;
    else if (edge.status === 'PARTIALLY_BLOCKED') hazardNote = `🚧 Partially blocked — expect delays`;
    else if (edge.status === 'CAUTION')      hazardNote = `⚠️ Caution — hazardous conditions`;

    return {
      edgeId:            edge.id,
      roadName:          edge.roadName,
      roadCode:          edge.roadCode,
      distanceKm:        Math.round(edge.distanceKm * 10) / 10,
      effectiveSpeedKmh: Math.round(baseSpeed),
      travelMinutes:     Math.round(mins),
      status:            edge.status,
      riskScore:         edge.riskScore,
      riskSeverity:      severity,
      isBlocked:         edge.status === 'BLOCKED' || edge.status === 'CLOSED',
      hazardNote,
      coordinates:       edge.coordinates,
    };
  });

  const totalDistanceKm = Math.round(segments.reduce((s, seg) => s + seg.distanceKm, 0) * 10) / 10;
  const totalMinutes    = Math.round(segments.reduce((s, seg) => s + seg.travelMinutes, 0));
  const { score, severity: riskSeverity } = aggregateRouteRisk(segments.map((s) => s.riskScore));

  // Hazards + explanation
  const hazards: string[] = [];
  let blockedCount = 0;
  segments.forEach((seg) => {
    if (seg.isBlocked) blockedCount++;
    if (seg.hazardNote) hazards.push(seg.hazardNote);
  });

  const riskExplanation = buildRiskExplanation(segments, score, riskSeverity);

  const mapCoordinates: LngLat[] = [];
  for (const seg of segments) {
    for (const coord of seg.coordinates) {
      mapCoordinates.push(coord);
    }
  }

  const summary = buildSummary(mode, totalDistanceKm, totalMinutes, riskSeverity, blockedCount);

  return {
    mode,
    nodePath,
    segments,
    totalDistanceKm,
    totalMinutes,
    riskScore: score,
    riskSeverity,
    riskExplanation,
    blockedAvoided: 0, // filled in at comparison level
    hazardsEncountered: hazards,
    summary,
    mapCoordinates,
    found: true,
  };
}

// ── Text helpers ──────────────────────────────────────────────────────────────

import type { Severity } from '@/types';
import type { RouteSegment as RS } from './types';

function buildRiskExplanation(segs: RS[], score: number, severity: Severity): string {
  const parts: string[] = [`Route risk: ${severity} (${score}/100).`];

  const blocked    = segs.filter((s) => s.status === 'BLOCKED' || s.status === 'CLOSED');
  const partial    = segs.filter((s) => s.status === 'PARTIALLY_BLOCKED');
  const caution    = segs.filter((s) => s.status === 'CAUTION');
  const highRiskSegs = segs.filter((s) => s.riskScore >= 50);

  if (blocked.length)    parts.push(`${blocked.length} impassable segment${blocked.length > 1 ? 's' : ''} on route.`);
  if (partial.length)    parts.push(`${partial.length} partially blocked segment${partial.length > 1 ? 's' : ''}.`);
  if (caution.length)    parts.push(`${caution.length} caution segment${caution.length > 1 ? 's' : ''}.`);
  if (highRiskSegs.length && !blocked.length)
    parts.push(`${highRiskSegs.length} high-risk road segment${highRiskSegs.length > 1 ? 's' : ''}.`);

  parts.push('⚠️ Simulation estimate — verify with local authorities.');
  return parts.join(' ');
}

function buildSummary(
  mode: RouteMode,
  dist: number,
  mins: number,
  severity: Severity,
  blocked: number,
): string {
  const hrs = Math.floor(mins / 60);
  const m   = mins % 60;
  const time = hrs > 0 ? `${hrs}h ${m}m` : `${m} min`;

  if (mode === 'SHORTEST') {
    return `Shortest route: ${dist} km · ~${time} · Risk: ${severity}.${blocked > 0 ? ` Passes ${blocked} blocked road${blocked > 1 ? 's' : ''}.` : ''}`;
  }
  if (mode === 'SAFEST') {
    return `Safest route: ${dist} km · ~${time} · Risk: ${severity}. Avoids known blocked roads.`;
  }
  return `Alternative route: ${dist} km · ~${time} · Risk: ${severity}.`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate all three route options for a given origin/destination pair.
 * Pure function — no side-effects, no external calls.
 */
export function calculateRoutes(
  req: RouteRequest,
  customGraph?: {
    nodes?: RouteNode[];
    edges?: RouteEdge[];
    nodeById?: Record<string, RouteNode>;
  },
): {
  shortest:    RouteResult;
  safest:      RouteResult;
  alternative: RouteResult;
} {
  const { originNodeId, destinationNodeId } = req;
  const nodeMap =
    customGraph?.nodeById ??
    (customGraph?.nodes ? Object.fromEntries(customGraph.nodes.map((n) => [n.id, n])) : NODE_BY_ID);
  const adj = customGraph?.edges ? buildAdjacency(customGraph.edges) : getAdj();

  if (originNodeId === destinationNodeId) {
    const msg = 'Origin and destination are the same location.';
    const empty = buildResult('SHORTEST', [], [], false, msg);
    return { shortest: empty, safest: { ...empty, mode: 'SAFEST' }, alternative: { ...empty, mode: 'ALTERNATIVE' } };
  }

  if (!nodeMap[originNodeId] || !nodeMap[destinationNodeId]) {
    const msg = 'Selected location not found in routing network.';
    const empty = buildResult('SHORTEST', [], [], false, msg);
    return { shortest: empty, safest: { ...empty, mode: 'SAFEST' }, alternative: { ...empty, mode: 'ALTERNATIVE' } };
  }

  // ── Shortest ────────────────────────────────────────────────────────────────
  const shortestRaw = astar(originNodeId, destinationNodeId, shortestCost, adj, nodeMap);
  const shortest    = buildResult('SHORTEST', shortestRaw.nodePath, shortestRaw.edgePath, shortestRaw.found);

  // ── Safest ──────────────────────────────────────────────────────────────────
  const safestRaw = astar(originNodeId, destinationNodeId, safestCost, adj, nodeMap);
  const safest    = buildResult('SAFEST', safestRaw.nodePath, safestRaw.edgePath, safestRaw.found);

  // Fill in blockedAvoided (compare safest path against blocked edges)
  if (safest.found && shortest.found) {
    const safestEdgeIds   = new Set(safest.segments.map((s) => s.edgeId));
    // Count blocked segments that shortest uses but safest avoids
    let avoided = 0;
    for (const seg of shortest.segments) {
      if (seg.isBlocked && !safestEdgeIds.has(seg.edgeId)) avoided++;
    }
    safest.blockedAvoided = avoided;
  }

  // ── Alternative ─────────────────────────────────────────────────────────────
  // Penalise the safest route's edges to force a different path
  const safestEdgeIds = new Set(safest.segments.map((s) => s.edgeId));
  const altRaw = astar(
    originNodeId,
    destinationNodeId,
    (edge) => alternativeCost(edge, safestEdgeIds),
    adj,
    nodeMap,
  );
  const alternative = buildResult('ALTERNATIVE', altRaw.nodePath, altRaw.edgePath, altRaw.found);

  // Check if alternative is meaningfully different from safest
  if (alternative.found && safest.found) {
    const altIds    = new Set(alternative.segments.map((s) => s.edgeId));
    const safestIds = new Set(safest.segments.map((s) => s.edgeId));
    const overlap   = [...altIds].filter((id) => safestIds.has(id)).length;
    const isSame    = overlap === safestIds.size && altIds.size === safestIds.size;
    if (isSame) {
      // Alternative is identical to safest — mark not found
      alternative.found = false;
      alternative.notFoundReason = 'No meaningfully different alternative route available for this origin/destination pair.';
    }
  }

  return { shortest, safest, alternative };
}
