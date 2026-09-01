import { describe, it, expect } from 'vitest';
import type { EarthGrid } from '../data/types';
import gridData from '../data/earth/grid.generated.json';
import { atlas } from '../data/index';

/**
 * Guards the EARTH raw-data seam. The grid must conform to the EarthGrid
 * contract so a real Sentinel-2 provider can replace the mock without any
 * adapter or viz change (see docs/EARTH_REAL_DATA.md). A real dataset must pass
 * this same suite.
 */
const grid = gridData as EarthGrid;

describe('EARTH grid contract', () => {
  it('declares its provenance', () => {
    expect(grid.source).toBeTruthy();
    expect(grid.variable).toBe('ndvi');
    expect(grid.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is a complete raster: values length === cols*rows', () => {
    expect(grid.cols).toBeGreaterThan(0);
    expect(grid.rows).toBeGreaterThan(0);
    expect(grid.values.length).toBe(grid.cols * grid.rows);
  });

  it('holds NDVI in range (masked cells excepted)', () => {
    for (const v of grid.values) {
      if (grid.nodata !== undefined && v === grid.nodata) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('has a valid bbox that anchors to a real territory', () => {
    const [minLon, minLat, maxLon, maxLat] = grid.bbox;
    expect(minLon).toBeLessThan(maxLon);
    expect(minLat).toBeLessThan(maxLat);
    if (grid.territoryId) {
      expect(atlas.territories.some((t) => t.id === grid.territoryId)).toBe(true);
    }
  });
});
