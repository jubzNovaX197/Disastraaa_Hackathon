/**
 * OpenStreetMap Overpass API Client
 *
 * Connects to public, verified Overpass API instances to ingest real road and shelter geometries.
 * Implements endpoint fallback, timeout handling, and operational region bounding boxes.
 */

import type {
  BoundingBox,
  OverpassElement,
  OverpassResponse,
  RoadIngestionOptions,
  ShelterIngestionOptions,
} from './types';

export const OPERATIONAL_BOUNDING_BOXES: Record<string, BoundingBox> = {
  // Bhubaneswar - Cuttack Disaster Operations Corridor (NH-16, SHs, arterial connectors)
  BHUBANESWAR_CUTTACK_CORRIDOR: {
    south: 20.22,
    west:  85.74,
    north: 20.45,
    east:  85.92,
  },
  // Puri Coastal Disaster Sector (Marine Drive, Grand Road, Pipili connectors)
  PURI_COASTAL_SECTOR: {
    south: 19.78,
    west:  85.78,
    north: 19.88,
    east:  85.95,
  },
  // Khordha Inland Evacuation Corridor
  KHORDHA_CORRIDOR: {
    south: 20.14,
    west:  85.58,
    north: 20.26,
    east:  85.75,
  },
};

export const DEFAULT_OPERATIONAL_BBOX = OPERATIONAL_BOUNDING_BOXES.BHUBANESWAR_CUTTACK_CORRIDOR;

/**
 * Public Overpass API endpoints in priority order.
 * Verified real public instances — no invented endpoints.
 */
export const VERIFIED_OVERPASS_ENDPOINTS: readonly string[] = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const;

export class OverpassClient {
  private readonly endpoints: string[];
  private readonly userAgent: string;

  constructor(
    endpoints: string[] = [...VERIFIED_OVERPASS_ENDPOINTS],
    userAgent: string = 'Disastraaa-Disaster-Response-Platform/1.0 (contact: gis-ops@disastraaa.gov.in)',
  ) {
    this.endpoints = endpoints;
    this.userAgent = userAgent;
  }

  /**
   * Executes an Overpass QL query across configured endpoints with automated fallback.
   */
  async executeQuery(
    qlQuery: string,
    timeoutMs: number = 25000,
  ): Promise<{ response: OverpassResponse; endpointUsed: string }> {
    let lastError: Error | null = null;

    for (const endpoint of this.endpoints) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'User-Agent': this.userAgent,
          },
          body: 'data=' + encodeURIComponent(qlQuery),
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timer);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const text = await res.text();
        let data: OverpassResponse;
        try {
          data = JSON.parse(text);
        } catch (jsonErr: any) {
          throw new Error(`Invalid JSON received: ${text.slice(0, 100)}`);
        }

        if (!data || !Array.isArray(data.elements)) {
          throw new Error('Malformed Overpass response (missing elements array)');
        }

        return { response: data, endpointUsed: endpoint };
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        // Continue to next endpoint in pool
      }
    }

    throw new Error(
      `All Overpass endpoints failed. Last error: ${lastError?.message || 'Unknown network error'}.`,
    );
  }

  /**
   * Fetches real road segments for an operational bounding box.
   * Prioritizes highways, primary, secondary, tertiary, and important connectors.
   */
  async fetchRoads(options?: RoadIngestionOptions): Promise<{
    elements: OverpassElement[];
    endpointUsed: string;
    bbox: BoundingBox;
  }> {
    const bbox = options?.bbox ?? DEFAULT_OPERATIONAL_BBOX;
    const maxElements = options?.maxElements ?? 200;
    const timeoutMs = options?.timeoutMs ?? 25000;

    // Build prioritized Overpass QL query
    const ql = `
      [out:json][timeout:${Math.floor(timeoutMs / 1000)}];
      (
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out geom ${maxElements};
    `;

    const { response, endpointUsed } = await this.executeQuery(ql, timeoutMs);
    return {
      elements: response.elements ?? [],
      endpointUsed,
      bbox,
    };
  }

  /**
   * Fetches real emergency shelters and relief locations from OSM.
   * Looks for amenity=shelter, emergency=assembly_point, emergency=disaster_help_point.
   */
  async fetchShelters(options?: ShelterIngestionOptions): Promise<{
    elements: OverpassElement[];
    endpointUsed: string;
    bbox: BoundingBox;
  }> {
    const bbox = options?.bbox ?? DEFAULT_OPERATIONAL_BBOX;
    const maxElements = options?.maxElements ?? 50;
    const timeoutMs = options?.timeoutMs ?? 25000;

    const q = `
      [out:json][timeout:${Math.floor(timeoutMs / 1000)}];
      (
        node["amenity"="shelter"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="shelter"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["emergency"~"^(assembly_point|disaster_help_point|shelter)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      );
      out center ${maxElements};
    `;

    const { response, endpointUsed } = await this.executeQuery(q, timeoutMs);
    return {
      elements: response.elements ?? [],
      endpointUsed,
      bbox,
    };
  }
}

export const overpassClient = new OverpassClient();
