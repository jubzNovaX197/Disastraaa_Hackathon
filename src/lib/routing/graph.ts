/**
 * Routing Graph — Demo road network
 *
 * Nodes: named locations (shelters, hospitals, EOCs, junctions).
 * Edges: road segments connecting them.
 *
 * Deliberately small — just enough to demonstrate:
 *   normal route / blocked route / safer alternative / shorter riskier route.
 *
 * Keep graph data separate from routing logic so a real graph
 * (OSM, PostGIS) can be swapped in via the same RouteNode/RouteEdge types.
 *
 * ⚠️  ALL distances, names and statuses are PROTOTYPE demo data.
 */

import type { RouteNode, RouteEdge } from './types';
import type { RoadSegment } from '@/lib/roads/types';
import type { Shelter } from '@/data/types';
import { haversineDistanceKm } from '@/lib/geo/osm/validation';

// ── Nodes ─────────────────────────────────────────────────────────────────────

export const DEMO_NODES: RouteNode[] = [
  // Bhubaneswar area
  {
    id:          'node-aiims-bbsr',
    name:        'AIIMS Bhubaneswar',
    type:        'HOSPITAL',
    coordinates: [85.7758, 20.2641],
  },
  {
    id:          'node-kiit-shelter',
    name:        'KIIT Stadium Emergency Camp',
    type:        'SHELTER',
    coordinates: [85.8149, 20.3524],
  },
  {
    id:          'node-seoc-bbsr',
    name:        'State Emergency Operations Centre',
    type:        'EOC',
    coordinates: [85.8245, 20.2756],
  },
  {
    id:          'node-bbsr-cuttack-jn',
    name:        'Bhubaneswar–Cuttack Junction (NH-16)',
    type:        'JUNCTION',
    coordinates: [85.8400, 20.3900],
  },

  // Cuttack area
  {
    id:          'node-scb-cuttack',
    name:        'SCB Medical College Hospital',
    type:        'HOSPITAL',
    coordinates: [85.8978, 20.4715],
  },
  {
    id:          'node-cuttack-shelter',
    name:        'Cuttack Ravenshaw Shelter',
    type:        'SHELTER',
    coordinates: [85.8830, 20.4625],
  },
  {
    id:          'node-cuttack-north-jn',
    name:        'Cuttack North Bypass Junction',
    type:        'JUNCTION',
    coordinates: [85.8600, 20.5000],
  },
  {
    id:          'node-athagarh-jn',
    name:        'Athagarh Junction (Old NH-5)',
    type:        'JUNCTION',
    coordinates: [85.6200, 20.5100],
  },

  // Kendrapara area
  {
    id:          'node-kendrapara-shelter',
    name:        'Kendrapara Town Shelter',
    type:        'SHELTER',
    coordinates: [86.4214, 20.4978],
  },

  // Puri area
  {
    id:          'node-puri-shelter-1',
    name:        'Puri Govt HS School Shelter',
    type:        'SHELTER',
    coordinates: [85.8315, 19.8134],
  },
  {
    id:          'node-puri-dhh',
    name:        'Puri District HQ Hospital',
    type:        'HOSPITAL',
    coordinates: [85.8200, 19.8195],
  },
  {
    id:          'node-puri-eoc',
    name:        'Puri District EOC',
    type:        'EOC',
    coordinates: [85.8321, 19.8178],
  },
  {
    id:          'node-puri-inland-jn',
    name:        'Puri Inland Junction (Pipili Road)',
    type:        'JUNCTION',
    coordinates: [85.7500, 19.8900],
  },
  {
    id:          'node-konark-jn',
    name:        'Konark Road Junction',
    type:        'JUNCTION',
    coordinates: [86.0600, 19.9000],
  },

  // Bhadrak area
  {
    id:          'node-bhadrak-shelter',
    name:        'Bhadrak Cyclone Shelter B-4',
    type:        'SHELTER',
    coordinates: [86.4987, 21.0634],
  },
  {
    id:          'node-balasore-jn',
    name:        'Balasore Town Hall (Shelter Access)',
    type:        'SHELTER',
    coordinates: [86.9300, 21.4900],
  },

  // Vizag area
  {
    id:          'node-vizag-hospital',
    name:        'King George Hospital, Visakhapatnam',
    type:        'HOSPITAL',
    coordinates: [83.2966, 17.7210],
  },
  {
    id:          'node-vizag-shelter',
    name:        'VUDA Community Hall Shelter',
    type:        'SHELTER',
    coordinates: [83.2985, 17.7231],
  },
  {
    id:          'node-vizag-port-jn',
    name:        'Visakhapatnam Port Junction',
    type:        'JUNCTION',
    coordinates: [83.3000, 17.7050],
  },
  {
    id:          'node-vizag-flyover-jn',
    name:        'Convent Junction Flyover',
    type:        'JUNCTION',
    coordinates: [83.3200, 17.6900],
  },
];

// ── Lookup map ────────────────────────────────────────────────────────────────

export const NODE_BY_ID: Record<string, RouteNode> = Object.fromEntries(
  DEMO_NODES.map((n) => [n.id, n]),
);

// ── Edges (bidirectional — each road stored once, graph expands both ways) ────

export const DEMO_EDGES: RouteEdge[] = [
  // Bhubaneswar internal
  {
    id:         'edge-aiims-seoc',
    from:       'node-aiims-bbsr',
    to:         'node-seoc-bbsr',
    roadName:   'Bhubaneswar Inner Ring Road',
    distanceKm: 5.8,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  12,
    coordinates: [
      [85.7758, 20.2641],
      [85.8000, 20.2700],
      [85.8245, 20.2756],
    ],
  },
  {
    id:         'edge-seoc-kiit',
    from:       'node-seoc-bbsr',
    to:         'node-kiit-shelter',
    roadName:   'Nandankanan Road / NH-16 Spur',
    distanceKm: 8.4,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  15,
    coordinates: [
      [85.8245, 20.2756],
      [85.8200, 20.3100],
      [85.8149, 20.3524],
    ],
  },
  {
    id:             'edge-kiit-bbcuttack-jn',
    from:           'node-kiit-shelter',
    to:             'node-bbsr-cuttack-jn',
    roadName:       'NH-16 Twin City Expressway (North)',
    roadCode:       'NH-16-EXP',
    distanceKm:     8.2,
    roadType:       'HIGHWAY',
    status:         'OPEN',
    riskScore:      10,
    roadSegmentId:  'rd-bhubaneswar-cuttack-exp',
    coordinates: [
      [85.8149, 20.3524],
      [85.8350, 20.3800],
      [85.8400, 20.3900],
    ],
  },

  // Main Cuttack–BBSR highway
  {
    id:             'edge-bbcuttack-jn-scb',
    from:           'node-bbsr-cuttack-jn',
    to:             'node-scb-cuttack',
    roadName:       'NH-16 Cuttack–Bhubaneswar Expressway',
    roadCode:       'NH-16-EXP',
    distanceKm:     11.2,
    roadType:       'HIGHWAY',
    status:         'OPEN',
    riskScore:      10,
    roadSegmentId:  'rd-bhubaneswar-cuttack-exp',
    coordinates: [
      [85.8400, 20.3900],
      [85.8600, 20.4300],
      [85.8978, 20.4715],
    ],
  },

  // Cuttack north bypass — PARTIALLY BLOCKED
  {
    id:             'edge-bbcuttack-jn-cuttacknorth',
    from:           'node-bbsr-cuttack-jn',
    to:             'node-cuttack-north-jn',
    roadName:       'NH-16 Cuttack North Bypass',
    roadCode:       'NH-16',
    distanceKm:     9.2,
    roadType:       'HIGHWAY',
    status:         'PARTIALLY_BLOCKED',
    riskScore:      68,
    roadSegmentId:  'rd-nh16-cuttack',
    coordinates: [
      [85.8400, 20.3900],
      [85.8500, 20.5100],
      [85.8750, 20.4850],
      [85.8900, 20.4600],
      [85.8600, 20.5000],
    ],
  },

  // Cuttack shelter connections
  {
    id:         'edge-scb-cuttack-shelter',
    from:       'node-scb-cuttack',
    to:         'node-cuttack-shelter',
    roadName:   'College Square Road, Cuttack',
    distanceKm: 1.2,
    roadType:   'LOCAL_ROAD',
    status:     'OPEN',
    riskScore:  18,
    coordinates: [
      [85.8978, 20.4715],
      [85.8904, 20.4670],
      [85.8830, 20.4625],
    ],
  },
  {
    id:         'edge-cuttack-north-jn-shelter',
    from:       'node-cuttack-north-jn',
    to:         'node-cuttack-shelter',
    roadName:   'Cuttack North Link Road',
    distanceKm: 4.5,
    roadType:   'DISTRICT_ROAD',
    status:     'CAUTION',
    riskScore:  38,
    coordinates: [
      [85.8600, 20.5000],
      [85.8720, 20.4820],
      [85.8830, 20.4625],
    ],
  },

  // Alternate route via Athagarh (avoiding blocked bypass)
  {
    id:         'edge-bbcuttack-jn-athagarh',
    from:       'node-bbsr-cuttack-jn',
    to:         'node-athagarh-jn',
    roadName:   'Old NH-5 / Athagarh Road',
    distanceKm: 14.0,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  20,
    coordinates: [
      [85.8400, 20.3900],
      [85.7200, 20.4600],
      [85.6200, 20.5100],
    ],
  },
  {
    id:         'edge-athagarh-cuttack-shelter',
    from:       'node-athagarh-jn',
    to:         'node-cuttack-shelter',
    roadName:   'Old Cuttack–Athagarh Link',
    distanceKm: 16.5,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  22,
    coordinates: [
      [85.6200, 20.5100],
      [85.7500, 20.4900],
      [85.8830, 20.4625],
    ],
  },

  // Cuttack → Kendrapara
  {
    id:         'edge-cuttack-north-kendrapara',
    from:       'node-cuttack-north-jn',
    to:         'node-kendrapara-shelter',
    roadName:   'Kendrapara Main Road (SH-12)',
    roadCode:   'SH-12',
    distanceKm: 36.0,
    roadType:   'MAJOR_ROAD',
    status:     'CAUTION',
    riskScore:  42,
    coordinates: [
      [85.8600, 20.5000],
      [86.1000, 20.4900],
      [86.4214, 20.4978],
    ],
  },

  // Puri area — Grand Road BLOCKED
  {
    id:             'edge-puri-shelter-puri-dhh-grand',
    from:           'node-puri-shelter-1',
    to:             'node-puri-dhh',
    roadName:       'Badadanda Grand Road',
    roadCode:       'OD-PURI-01',
    distanceKm:     2.1,
    roadType:       'MAJOR_ROAD',
    status:         'BLOCKED',
    riskScore:      85,
    roadSegmentId:  'rd-puri-grand-road',
    coordinates: [
      [85.8315, 19.8134],
      [85.8200, 19.8195],
    ],
  },
  // Puri area — VIP Road alternate (avoiding Grand Road)
  {
    id:         'edge-puri-shelter-dhh-vip',
    from:       'node-puri-shelter-1',
    to:         'node-puri-dhh',
    roadName:   'VIP Road via Atharnala Gate',
    distanceKm: 3.8,
    roadType:   'MAJOR_ROAD',
    status:     'CAUTION',
    riskScore:  35,
    coordinates: [
      [85.8315, 19.8134],
      [85.8400, 19.8250],
      [85.8200, 19.8195],
    ],
  },
  // Puri EOC connections
  {
    id:         'edge-puri-eoc-dhh',
    from:       'node-puri-eoc',
    to:         'node-puri-dhh',
    roadName:   'Puri Collectorate Access Road',
    distanceKm: 0.5,
    roadType:   'LOCAL_ROAD',
    status:     'OPEN',
    riskScore:  20,
    coordinates: [
      [85.8321, 19.8178],
      [85.8200, 19.8195],
    ],
  },
  {
    id:         'edge-puri-eoc-shelter1',
    from:       'node-puri-eoc',
    to:         'node-puri-shelter-1',
    roadName:   'Grand Road North Bypass',
    distanceKm: 1.0,
    roadType:   'LOCAL_ROAD',
    status:     'CAUTION',
    riskScore:  32,
    coordinates: [
      [85.8321, 19.8178],
      [85.8315, 19.8134],
    ],
  },

  // NH-316 Coastal Route — CLOSED
  {
    id:             'edge-puri-eoc-konark-coastal',
    from:           'node-puri-eoc',
    to:             'node-konark-jn',
    roadName:       'NH-316 Marine Drive Coastal',
    roadCode:       'NH-316',
    distanceKm:     35.0,
    roadType:       'HIGHWAY',
    status:         'CLOSED',
    riskScore:      95,
    roadSegmentId:  'rd-nh316-puri-konark',
    coordinates: [
      [85.8321, 19.8178],
      [85.8700, 19.7820],
      [85.9300, 19.7600],
      [86.0600, 19.9000],
    ],
  },
  // Inland alternate to Konark
  {
    id:         'edge-puri-inland-konark',
    from:       'node-puri-inland-jn',
    to:         'node-konark-jn',
    roadName:   'NH-316B Inland (Gop–Pipili)',
    roadCode:   'NH-316B',
    distanceKm: 42.0,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  22,
    coordinates: [
      [85.7500, 19.8900],
      [85.9000, 19.9200],
      [86.0600, 19.9000],
    ],
  },
  {
    id:         'edge-puri-eoc-inland-jn',
    from:       'node-puri-eoc',
    to:         'node-puri-inland-jn',
    roadName:   'Puri–Pipili Road (SH-15)',
    distanceKm: 9.5,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  18,
    coordinates: [
      [85.8321, 19.8178],
      [85.7900, 19.8500],
      [85.7500, 19.8900],
    ],
  },

  // Bhadrak connections
  {
    id:         'edge-cuttack-north-bhadrak',
    from:       'node-cuttack-north-jn',
    to:         'node-bhadrak-shelter',
    roadName:   'NH-16 Bhadrak Coastal Corridor',
    roadCode:   'NH-16',
    distanceKm: 65.0,
    roadType:   'HIGHWAY',
    status:     'OPEN',
    riskScore:  25,
    coordinates: [
      [85.8600, 20.5000],
      [86.1500, 20.7000],
      [86.4987, 21.0634],
    ],
  },
  {
    id:             'edge-bhadrak-salandi',
    from:           'node-bhadrak-shelter',
    to:             'node-balasore-jn',
    roadName:       'Salandi Canal Bridge — Bhadrak–Balasore',
    roadCode:       'OD-BDK-04',
    distanceKm:     52.0,
    roadType:       'DISTRICT_ROAD',
    status:         'CAUTION',
    riskScore:      40,
    roadSegmentId:  'rd-bhadrak-salandi',
    coordinates: [
      [86.4987, 21.0634],
      [86.5100, 21.0400],
      [86.7000, 21.2500],
      [86.9300, 21.4900],
    ],
  },

  // Vizag area — Port Access BLOCKED
  {
    id:             'edge-vizag-shelter-hospital-port',
    from:           'node-vizag-shelter',
    to:             'node-vizag-hospital',
    roadName:       'Port Container Link Road',
    roadCode:       'AP-VZ-09',
    distanceKm:     4.6,
    roadType:       'MAJOR_ROAD',
    status:         'BLOCKED',
    riskScore:      80,
    roadSegmentId:  'rd-vizag-port-access',
    coordinates: [
      [83.2985, 17.7231],
      [83.3100, 17.7100],
      [83.3250, 17.6950],
      [83.2966, 17.7210],
    ],
  },
  // Vizag — flyover alternate
  {
    id:         'edge-vizag-shelter-flyover',
    from:       'node-vizag-shelter',
    to:         'node-vizag-flyover-jn',
    roadName:   'Convent Junction Elevated Flyover',
    distanceKm: 6.8,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  20,
    coordinates: [
      [83.2985, 17.7231],
      [83.3100, 17.7150],
      [83.3200, 17.6900],
    ],
  },
  {
    id:         'edge-vizag-flyover-hospital',
    from:       'node-vizag-flyover-jn',
    to:         'node-vizag-hospital',
    roadName:   'Beach Road Alternate, Vizag',
    distanceKm: 3.5,
    roadType:   'MAJOR_ROAD',
    status:     'OPEN',
    riskScore:  18,
    coordinates: [
      [83.3200, 17.6900],
      [83.3000, 17.7100],
      [83.2966, 17.7210],
    ],
  },
];

// ── Adjacency lookup (pre-built for speed) ────────────────────────────────────

/** adjacency[nodeId] = array of edges leaving that node (bidirectional) */
export function buildAdjacency(edges: RouteEdge[]): Map<string, RouteEdge[]> {
  const adj = new Map<string, RouteEdge[]>();

  for (const edge of edges) {
    // forward
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge);

    // reverse (same edge but from/to swapped, coordinates reversed)
    const rev: RouteEdge = {
      ...edge,
      id:          `${edge.id}-rev`,
      from:        edge.to,
      to:          edge.from,
      coordinates: [...edge.coordinates].reverse() as typeof edge.coordinates,
    };
    if (!adj.has(edge.to)) adj.set(edge.to, []);
    adj.get(edge.to)!.push(rev);
  }

  return adj;
}

export interface RoutingGraph {
  nodes: RouteNode[];
  edges: RouteEdge[];
  nodeById: Record<string, RouteNode>;
}

/**
 * Builds an operational routing graph (nodes + edges) from normalized real OSM road segments
 * and real emergency shelters.
 */
export function buildGraphFromRoadSegments(
  segments: RoadSegment[],
  shelters: Shelter[] = [],
): RoutingGraph {
  const nodes: RouteNode[] = [];
  const edges: RouteEdge[] = [];
  const nodeById: Record<string, RouteNode> = {};

  // Track existing node positions to snap within ~100m (0.001 deg)
  const SNAP_THRESHOLD_KM = 0.12;

  function findOrAddNode(
    coord: [number, number],
    hintName: string,
    typeHint: RouteNode['type'] = 'JUNCTION',
  ): RouteNode {
    const [lon, lat] = coord;
    for (const existing of nodes) {
      const dist = haversineDistanceKm(existing.coordinates[1], existing.coordinates[0], lat, lon);
      if (dist <= SNAP_THRESHOLD_KM) {
        return existing;
      }
    }

    const id = `node-osm-${nodes.length + 1}`;
    const newNode: RouteNode = {
      id,
      name: hintName,
      coordinates: [lon, lat],
      type: typeHint,
    };
    nodes.push(newNode);
    nodeById[id] = newNode;
    return newNode;
  }

  // 1. Process real road segments into edges and nodes
  for (const seg of segments) {
    if (seg.coordinates.length < 2) continue;

    const startCoord = seg.coordinates[0];
    const endCoord = seg.coordinates[seg.coordinates.length - 1];

    const startNode = findOrAddNode(startCoord, `${seg.name} (West/Start)`, 'JUNCTION');
    const endNode = findOrAddNode(endCoord, `${seg.name} (East/End)`, 'JUNCTION');

    const edge: RouteEdge = {
      id: `edge-${seg.id}`,
      from: startNode.id,
      to: endNode.id,
      roadName: seg.name,
      roadCode: seg.code,
      distanceKm: seg.lengthKm && seg.lengthKm > 0 ? seg.lengthKm : 1.0,
      roadType: seg.roadType || 'MAJOR_ROAD',
      status: seg.status || 'OPEN',
      riskScore: seg.travelRisk?.score || 10,
      roadSegmentId: seg.id,
      coordinates: seg.coordinates,
    };

    edges.push(edge);
  }

  // 2. Attach real shelters to the nearest road network node
  for (const shelter of shelters) {
    const shelterNode: RouteNode = {
      id: `node-${shelter.id}`,
      name: shelter.name,
      coordinates: shelter.coordinates,
      type: 'SHELTER',
    };
    nodes.push(shelterNode);
    nodeById[shelterNode.id] = shelterNode;

    // Connect to nearest road node if available
    let nearestRoadNode: RouteNode | null = null;
    let minDistance = Infinity;

    for (const n of nodes) {
      if (n.id === shelterNode.id || n.type === 'SHELTER') continue;
      const d = haversineDistanceKm(
        shelter.coordinates[1],
        shelter.coordinates[0],
        n.coordinates[1],
        n.coordinates[0],
      );
      if (d < minDistance) {
        minDistance = d;
        nearestRoadNode = n;
      }
    }

    if (nearestRoadNode && minDistance < 5.0) {
      const linkEdge: RouteEdge = {
        id: `edge-access-${shelter.id}`,
        from: shelterNode.id,
        to: nearestRoadNode.id,
        roadName: `${shelter.name} Access Corridor`,
        distanceKm: Math.round(minDistance * 10) / 10 || 0.2,
        roadType: 'LOCAL_ROAD',
        status: 'OPEN',
        riskScore: 8,
        coordinates: [shelter.coordinates, nearestRoadNode.coordinates],
      };
      edges.push(linkEdge);
    }
  }

  return { nodes, edges, nodeById };
}

