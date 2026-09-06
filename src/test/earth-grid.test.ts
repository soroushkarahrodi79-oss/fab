import { describe, it, expect } from 'vitest';
import type {
  EarthGrid,
  MockEarthGrid,
  Sentinel2EarthGrid,
} from '../data/types';
import gridData from '../data/earth/grid.generated.json';
import { buildEarthField, earthHasSupport } from '../adapters/earth';
import { atlas } from '../data/index';

/**
 * Guards the hardened EARTH raw-data seam (Phase 5A). The grid is a discriminated
 * union so the type system itself enforces evidence honesty: a mock grid is
 * `simulated` and names no Sentinel-2 pipeline; a real grid is `derived` and
 * requires exact `itemIds`. A real dataset must pass this same suite. These
 * tests also lock the de-authentication decisions: no single acquisition date,
 * no ambiguous cloudCover, `nodata` is missing (never a valid NDVI of 0), and
 * none of the removed pseudo-scientific layers reappear.
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

  it('has a valid bbox that anchors to a real territory', () => {
    const [minLon, minLat, maxLon, maxLat] = grid.bbox;
    expect(minLon).toBeLessThan(maxLon);
    expect(minLat).toBeLessThan(maxLat);
    if (grid.territoryId) {
      expect(atlas.territories.some((t) => t.id === grid.territoryId)).toBe(true);
    }
  });
});

describe('EARTH committed grid is an honest mock', () => {
  it('is the mock arm: simulated, provider mock', () => {
    expect(grid.source).toBe('mock-deterministic');
    expect(grid.evidenceStatus).toBe('simulated');
    expect(grid.provenance.provider).toBe('mock');
    expect(grid.provenance.collection).toBe('mock-deterministic-ndvi');
  });

  it('names NO Sentinel-2 pipeline it never ran', () => {
    const p = grid.provenance as unknown as Record<string, unknown>;
    // A mock processed no reflectance: these must be absent, not placeholders.
    expect('bands' in p).toBe(false);
    expect('sclExcluded' in p).toBe(false);
    expect('temporalComposite' in p).toBe(false);
    expect('spatialAggregation' in p).toBe(false);
    expect('itemIds' in p).toBe(false);
    expect('processingBaseline' in p).toBe(false);
  });
});

/**
 * A tiny real-arm fixture with a masked cell. The committed mock is deliberately
 * gap-free (100% coverage), so the missing-data path is exercised here rather
 * than by corrupting the real snapshot. Being the Sentinel-2 arm, it must carry
 * exact itemIds + band/mask/composite fields — the union enforces it.
 */
function fixtureWithNodata(): Sentinel2EarthGrid {
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
      itemIds: ['S2A_FIXTURE_ITEM_1', 'S2A_FIXTURE_ITEM_2'],
      bands: { red: 'B04', nir: 'B08', mask: 'SCL' },
      temporalComposite: 'median',
      sclExcluded: [3, 8, 9, 10, 11],
      spatialAggregation: 'average',
      generatedAt: '2026-09-06',
      attribution: 'Contains modified Copernicus Sentinel-2 data',
    },
  };
}

describe('EARTH real-arm provenance is pinnable', () => {
  it('carries exact itemIds and band/mask/composite method', () => {
    const g = fixtureWithNodata();
    expect(g.provenance.itemIds.length).toBeGreaterThan(0);
    expect(g.provenance.bands.red).toBe('B04');
    expect(g.provenance.bands.nir).toBe('B08');
    expect(g.provenance.bands.mask).toBe('SCL');
    expect(g.provenance.temporalComposite).toBe('median');
    expect(g.provenance.spatialAggregation).toBe('average');
    expect(g.provenance.attribution).toBeTruthy();
  });
});

describe('EARTH grid union enforces evidence honesty (compile-time)', () => {
  it('rejects impossible source/evidenceStatus and provenance combinations', () => {
    // @ts-expect-error a mock-deterministic grid can never be 'derived'
    const badEvidence: EarthGrid = { ...fixtureWithNodata(), source: 'mock-deterministic' };
    void badEvidence;

    // @ts-expect-error a sentinel-2 grid can never be 'simulated'
    const badReal: EarthGrid = {
      ...fixtureWithNodata(),
      evidenceStatus: 'simulated',
    };
    void badReal;

    const mockWithBands: MockEarthGrid['provenance'] = {
      provider: 'mock',
      collection: 'mock-deterministic-ndvi',
      generatedAt: '2026-09-06',
      // @ts-expect-error mock provenance cannot carry Sentinel-2 band claims
      bands: { red: 'B04', nir: 'B08', mask: 'SCL' },
    };
    void mockWithBands;

    // @ts-expect-error a sentinel-2 grid must provide exact itemIds
    const realWithoutItems: Sentinel2EarthGrid['provenance'] = {
      provider: 'earth-search',
      collection: 'sentinel-2-l2a',
      bands: { red: 'B04', nir: 'B08', mask: 'SCL' },
      temporalComposite: 'median',
      sclExcluded: [3, 8, 9, 10, 11],
      spatialAggregation: 'average',
      generatedAt: '2026-09-06',
      attribution: 'Contains modified Copernicus Sentinel-2 data',
    };
    void realWithoutItems;

    // The union still compiles for the two legitimate arms.
    const okMock = grid.source === 'mock-deterministic';
    const okReal: Sentinel2EarthGrid = fixtureWithNodata();
    expect(okReal.source).toBe('sentinel-2');
    expect(typeof okMock).toBe('boolean');
  });
});

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

describe('EARTH availability drives module state (not observations)', () => {
  it('a grid with at least one valid cell has support (module not empty)', () => {
    expect(earthHasSupport(fixtureWithNodata())).toBe(true);
    // The committed mock is fully valid.
    expect(earthHasSupport()).toBe(true);
  });

  it('an all-nodata grid has no support (module empty)', () => {
    const allMasked: Sentinel2EarthGrid = {
      ...fixtureWithNodata(),
      values: [-1, -1, -1, -1],
      validFraction: [0, 0, 0, 0],
    };
    expect(earthHasSupport(allMasked)).toBe(false);
    // And its field summary agrees: zero valid cells, zero coverage.
    const f = buildEarthField(allMasked);
    expect(f.summary.validCells).toBe(0);
    expect(f.summary.validCoverage).toBe(0);
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
