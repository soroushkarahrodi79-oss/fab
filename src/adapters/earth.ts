import type { EarthGrid, EarthGridProvenance, EvidenceStatus } from '../data/types';
import gridData from '../data/earth/grid.generated.json';

/**
 * One EARTH cell. `ndvi` is `null` where the grid has no valid EO support
 * (a masked/`nodata` source cell) — never coerced to 0, which is a valid NDVI.
 * The viz renders `null` as a neutral missing-data cell, not through the NDVI
 * colour scale; summaries exclude it.
 *
 * Phase 5A removed the pseudo land-cover class, the mock-temperature "anomaly"
 * flag, and orbital arcs (see docs/EARTH_REAL_DATA.md): NDVI thresholds are not
 * a land-cover product, an unvalidated modelled temperature is not an anomaly,
 * and a listed mission is not a proven overpass. EARTH is now exactly what the
 * data supports — a provenance-bearing NDVI field.
 */
export interface EarthCell {
  col: number;
  row: number;
  ndvi: number | null; // 0..1, or null for no valid EO support
  validFraction?: number; // 0..1 fraction of valid native pixels (real data only)
}

export interface EarthField {
  cols: number;
  rows: number;
  cells: EarthCell[];
  source: EarthGrid['source'];
  evidenceStatus: EvidenceStatus;
  compositeStart: string;
  compositeEnd: string;
  provenance: EarthGridProvenance;
  summary: {
    ndviMin: number;
    ndviMax: number;
    ndviMean: number;
    validCells: number;
    totalCells: number;
    validCoverage: number; // validCells / totalCells, 0..1
  };
}

// The raw EO raster — a mock composite now, a real Sentinel-2 grid later. The
// swap happens in the data file, not here (see docs/EARTH_REAL_DATA.md).
const grid = gridData as EarthGrid;

/**
 * Provenance of the EARTH raster, read straight from the raw grid. Surfaced in
 * the UI (module meta) so the field is never presented without its source:
 * `source` is "mock-deterministic" now and becomes "sentinel-2" when real data
 * lands — the label follows the data, it is not authored in a component.
 */
export const earthProvenance: { source: EarthGrid['source']; evidenceStatus: EvidenceStatus } = {
  source: grid.source,
  evidenceStatus: grid.evidenceStatus,
};

/**
 * Whether the EARTH grid has any usable raster support — at least one cell with
 * valid EO data (not `nodata`). This is EARTH's OWN availability, derived from
 * the grid alone; the Shell uses it for the module's idle/empty state without
 * re-coupling EARTH to `AtlasData.observations` or duplicating grid logic. An
 * all-`nodata` grid is genuinely empty. Takes an explicit grid so the mapping
 * is testable with fixtures.
 */
export function earthHasSupport(source: EarthGrid = grid): boolean {
  return source.values.some((v) => v !== source.nodata);
}

/**
 * Shape a raw EarthGrid into the EARTH view model. Pure and source-agnostic: it
 * never learns whether the grid was mock or real. A `nodata` source value maps
 * to `ndvi: null` and is excluded from every summary statistic. Exported taking
 * an explicit grid so tests can exercise the masking path with a fixture
 * (the committed mock is deliberately gap-free).
 */
export function buildEarthField(source: EarthGrid = grid): EarthField {
  const { cols, rows, nodata, values, validFraction } = source;
  const totalCells = cols * rows;

  const cells: EarthCell[] = [];
  let sum = 0;
  let validCells = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const raw = values[i];
      const masked = raw === nodata;
      const ndvi = masked ? null : Math.min(1, Math.max(0, raw));
      if (ndvi !== null) {
        sum += ndvi;
        validCells++;
        if (ndvi < min) min = ndvi;
        if (ndvi > max) max = ndvi;
      }
      const cell: EarthCell = { col, row, ndvi };
      if (validFraction) cell.validFraction = validFraction[i];
      cells.push(cell);
    }
  }

  return {
    cols,
    rows,
    cells,
    source: source.source,
    evidenceStatus: source.evidenceStatus,
    compositeStart: source.compositeStart,
    compositeEnd: source.compositeEnd,
    provenance: source.provenance,
    summary: {
      ndviMin: validCells ? min : 0,
      ndviMax: validCells ? max : 0,
      ndviMean: validCells ? sum / validCells : 0,
      validCells,
      totalCells,
      validCoverage: totalCells ? validCells / totalCells : 0,
    },
  };
}
