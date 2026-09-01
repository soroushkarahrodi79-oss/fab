import type { AtlasData, EarthGrid } from '../data/types';
import gridData from '../data/earth/grid.generated.json';

export interface EarthCell {
  col: number;
  row: number;
  ndvi: number; // 0..1
  cover: number; // land-cover class index (see COVER_CLASSES)
  anomaly: boolean; // flagged (e.g. urban heat) — needs validation
}

export interface OrbitArc {
  sourceId: string;
  label: string;
  y0: number;
  y1: number;
  bow: number;
}

export interface EarthField {
  cols: number;
  rows: number;
  cells: EarthCell[];
  arcs: OrbitArc[];
  source: string;
  capturedAt: string;
  summary: {
    ndviMin: number;
    ndviMax: number;
    ndviMean: number;
    dominantCover: string;
    anomalies: number;
  };
}

export const COVER_CLASSES = [
  'water / bare',
  'sparse / grass',
  'shrub / mosaic',
  'coniferous forest',
] as const;

// The raw EO raster — a mock composite now, a real Sentinel-2 grid later. The
// swap happens in the data file, not here (see docs/EARTH_REAL_DATA.md).
const grid = gridData as EarthGrid;

/**
 * Provenance of the EARTH raster, read straight from the raw grid. Surfaced in
 * the UI (module meta + figcaption) so the field is never presented as evidence
 * without its source: `source` is "mock-deterministic" now and becomes
 * "sentinel-2" when real data lands — the label follows the data, it is not
 * authored in a component.
 */
export const earthProvenance: { source: string; capturedAt: string } = {
  source: grid.source,
  capturedAt: grid.capturedAt,
};

function coverFor(ndvi: number): number {
  if (ndvi < 0.28) return 0;
  if (ndvi < 0.45) return 1;
  if (ndvi < 0.62) return 2;
  return 3;
}

/**
 * Shape the raw EarthGrid into the EARTH view model: classify land cover per
 * cell, flag heat anomalies from unvalidated in-AOI temperature observations,
 * derive labelled orbital arcs, and summarise. Deterministic and source-
 * agnostic — it never learns whether the grid was mock or real.
 */
export function buildEarthField(data: AtlasData): EarthField {
  const { cols, rows, bbox, nodata } = grid;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const spanLon = maxLon - minLon || 1;
  const spanLat = maxLat - minLat || 1;

  // Map unvalidated temperature observations inside the AOI to grid cells.
  const anomalyCells = new Set<string>();
  for (const o of data.observations) {
    if (o.variable !== 'temperature' || o.validated) continue;
    const [lon, lat] = o.at;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
    const col = Math.min(cols - 1, Math.floor(((lon - minLon) / spanLon) * cols));
    const row = Math.min(rows - 1, Math.floor(((maxLat - lat) / spanLat) * rows)); // north up
    anomalyCells.add(`${col},${row}`);
  }

  const cells: EarthCell[] = [];
  const coverCounts = new Array(COVER_CLASSES.length).fill(0);
  let sum = 0;
  let count = 0;
  let min = 1;
  let max = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const raw = grid.values[row * cols + col];
      const masked = nodata !== undefined && raw === nodata;
      const ndvi = masked ? 0 : Math.min(1, Math.max(0, raw));
      const cover = coverFor(ndvi);
      if (!masked) {
        coverCounts[cover]++;
        sum += ndvi;
        count++;
        if (ndvi < min) min = ndvi;
        if (ndvi > max) max = ndvi;
      }
      cells.push({ col, row, ndvi, cover, anomaly: anomalyCells.has(`${col},${row}`) });
    }
  }

  const satellites = data.sources.filter((s) => s.kind === 'satellite');
  const arcs: OrbitArc[] = satellites.map((s, i) => ({
    sourceId: s.id,
    label: s.label,
    y0: 0.2 + i * 0.28,
    y1: 0.35 + i * 0.22,
    bow: 0.12 + 0.05 * i,
  }));

  const dominant = coverCounts.indexOf(Math.max(...coverCounts));

  return {
    cols,
    rows,
    cells,
    arcs,
    source: grid.source,
    capturedAt: grid.capturedAt,
    summary: {
      ndviMin: count ? min : 0,
      ndviMax: count ? max : 0,
      ndviMean: count ? sum / count : 0,
      dominantCover: COVER_CLASSES[dominant],
      anomalies: anomalyCells.size,
    },
  };
}
