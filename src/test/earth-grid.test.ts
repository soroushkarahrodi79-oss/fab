import { describe, it, expect } from 'vitest';
import type { EarthGrid } from '../data/types';
import gridData from '../data/earth/grid.generated.json';
import { buildEarthField } from '../adapters/earth';
import { atlas } from '../data/index';

/**
 * Guards the hardened EARTH raw-data seam (Phase 5A). The grid must conform to
 * the EarthGrid contract so a real Sentinel-2 provider can replace the mock
 * without any adapter or viz change (see docs/EARTH_REAL_DATA.md). A real
 * dataset must pass this same suite. These tests also lock the de-authentication
 * decisions: no single acquisition date, no ambiguous cloudCover, `nodata` is
 * missing (never a valid NDVI of 0), and none of the removed pseudo-scientific
 * layers reappear.
 */
const grid = gridData as EarthGrid;

describe('EARTH grid contract', () => {
  it('declares provenance and evidence status', () => {
    expect(grid.source).toBeTruthy();
    expect(grid.variable).toBe('ndvi');
    expect(grid.evidenceStatus).toMatch(/^(simulated|derived)$/);
  });

  it('records a composite window, not a single acquisition date', () => {
    expect(grid.compositeStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(grid.compositeEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Date.parse(grid.compositeStart)).toBeLessThan(Date.parse(grid.compositeEnd));
    // The old single-date / global-cloudCover fields must be gone.
    expect('capturedAt' in grid).toBe(false);
    expect('cloudCover' in grid).toBe(false);
  });

  it('declares a target CRS and resampling', () => {
    expect(grid.crs).toBeTruthy();
    expect(grid.resampling).toBe('average');
  });

  it('is a complete raster: values length === cols*rows', () => {
    expect(grid.cols).toBeGreaterThan(0);
    expect(grid.rows).toBeGreaterThan(0);
    expect(grid.values.length).toBe(grid.cols * grid.rows);
  });

  it('holds NDVI in range (masked cells excepted)', () => {
    for (const v of grid.values) {
      if (v === grid.nodata) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('keeps validFraction, when present, aligned and in 0..1', () => {
    if (!grid.validFraction) return;
    expect(grid.validFraction.length).toBe(grid.values.length);
    for (const f of grid.validFraction) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it('carries pinnable EO provenance (bands, mask, composite method)', () => {
    expect(grid.provenance.provider).toBeTruthy();
    expect(grid.provenance.collection).toBeTruthy();
    expect(grid.provenance.bands.red).toBe('B04');
    expect(grid.provenance.bands.nir).toBe('B08');
    expect(grid.provenance.bands.mask).toBe('SCL');
    expect(grid.provenance.temporalComposite).toBe('median');
    expect(grid.provenance.spatialAggregation).toBe('average');
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

/**
 * A tiny fixture with a masked cell. The committed mock is deliberately gap-free
 * (100% coverage), so the missing-data path is exercised here rather than by
 * corrupting the real snapshot.
 */
function fixtureWithNodata(): EarthGrid {
  return {
    source: 'sentinel-2',
    evidenceStatus: 'derived',
    variable: 'ndvi',
    territoryId: 'sierra-de-guadarrama',
    bbox: [-4, 40, -3, 41],
    crs: 'EPSG:4326',
    cols: 2,
    rows: 2,
    resampling: 'average',
    compositeStart: '2026-06-01',
    compositeEnd: '2026-08-31',
    nodata: -1,
    values: [0.2, 0.8, -1, 0.5], // one masked cell
    validFraction: [1, 1, 0, 0.5],
    provenance: {
      provider: 'earth-search',
      collection: 'sentinel-2-l2a',
      bands: { red: 'B04', nir: 'B08', mask: 'SCL' },
      temporalComposite: 'median',
      sclExcluded: [3, 8, 9, 10, 11],
      spatialAggregation: 'average',
      generatedAt: '2026-09-06',
    },
  };
}

describe('EARTH nodata semantics', () => {
  it('maps a masked source value to ndvi null, never 0', () => {
    const f = buildEarthField(fixtureWithNodata());
    const masked = f.cells.find((c) => c.ndvi === null);
    expect(masked).toBeDefined();
    // The masked cell must not have been coerced to a valid NDVI of 0.
    expect(f.cells.some((c) => c.ndvi === 0)).toBe(false);
  });

  it('excludes null cells from every summary statistic', () => {
    const f = buildEarthField(fixtureWithNodata());
    expect(f.summary.validCells).toBe(3);
    expect(f.summary.totalCells).toBe(4);
    expect(f.summary.validCoverage).toBeCloseTo(0.75);
    // mean of the 3 valid values only (0.2, 0.8, 0.5)
    expect(f.summary.ndviMean).toBeCloseTo((0.2 + 0.8 + 0.5) / 3);
    expect(f.summary.ndviMin).toBeCloseTo(0.2);
    expect(f.summary.ndviMax).toBeCloseTo(0.8);
  });
});

describe('EARTH honesty — removed pseudo-scientific layers stay removed', () => {
  it('produces no land-cover class, heat anomaly, or orbital arc', () => {
    const f = buildEarthField();
    // Field object must not resurrect the removed concepts.
    expect('arcs' in f).toBe(false);
    expect('dominantCover' in f.summary).toBe(false);
    expect('anomalies' in f.summary).toBe(false);
    for (const c of f.cells) {
      expect('cover' in c).toBe(false);
      expect('anomaly' in c).toBe(false);
    }
  });
});
