import type { OverpassElement } from './types';
import fs from 'fs';
import path from 'path';

let _cachedSeed: OverpassElement[] | null = null;

export function getRealOsmSeedWays(): OverpassElement[] {
  if (_cachedSeed) return _cachedSeed;

  try {
    const candidatePaths = [
      path.resolve(process.cwd(), 'src/lib/geo/osm/realOsmSeed.json'),
      path.resolve(__dirname, 'realOsmSeed.json'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf8');
        _cachedSeed = JSON.parse(text);
        return _cachedSeed!;
      }
    }
  } catch {
    // Fall back to empty array
  }

  return [];
}
