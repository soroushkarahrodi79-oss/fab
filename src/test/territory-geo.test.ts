import { describe, it, expect } from 'vitest';
import { territories } from '../data/territories';
import { projectTerritories } from '../adapters/territory';
import { atlas } from '../data/index';

/**
 * Guards the mock→real data swap: territory geometry must be authoritative INE
 * boundaries, not the hand-authored placeholder rings. Real municipal polygons
 * have many vertices and sit within the Madrid region's bounding box. If a real
 * dataset ever regresses to a crude placeholder, these thresholds fail.
 */
function coords(geom: NonNullable<(typeof territories)[number]['geometry']>): number[][] {
  if (geom.type === 'Polygon') return geom.coordinates.flat();
  return geom.coordinates.flat(2);
}

// Comunidad de Madrid + immediate surroundings.
const MADRID_BBOX = { minLon: -4.7, maxLon: -3.0, minLat: 40.0, maxLat: 41.3 };

describe('territory geometry is real (INE boundaries)', () => {
  it('every territory carries geometry', () => {
    for (const t of territories) expect(t.geometry, t.id).toBeDefined();
  });

  it('geometry has real detail, not a 5-point placeholder ring', () => {
    for (const t of territories) {
      const pts = coords(t.geometry!);
      // Placeholder rings had ~6 points; real municipal boundaries have many.
      expect(pts.length, `${t.id} vertex count`).toBeGreaterThan(20);
    }
  });

  it('all coordinates fall within the Madrid region', () => {
    for (const t of territories) {
      for (const [lon, lat] of coords(t.geometry!)) {
        expect(lon, `${t.id} lon`).toBeGreaterThanOrEqual(MADRID_BBOX.minLon);
        expect(lon, `${t.id} lon`).toBeLessThanOrEqual(MADRID_BBOX.maxLon);
        expect(lat, `${t.id} lat`).toBeGreaterThanOrEqual(MADRID_BBOX.minLat);
        expect(lat, `${t.id} lat`).toBeLessThanOrEqual(MADRID_BBOX.maxLat);
      }
    }
  });

  it('the adapter projects real rings into [0,1] unchanged by the swap', () => {
    const view = projectTerritories(atlas);
    for (const s of view.shapes) {
      expect(s.rings.length, `${s.id} rings`).toBeGreaterThan(0);
      for (const ring of s.rings)
        for (const p of ring) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(1);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(1);
        }
    }
  });
});
