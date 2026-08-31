import type { AtlasData } from '../data/types';

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
  // Two control points + a phase, in grid-normalised space (0..1).
  y0: number;
  y1: number;
  bow: number; // vertical bow of the arc
}

export interface EarthField {
  cols: number;
  rows: number;
  cells: EarthCell[];
  arcs: OrbitArc[];
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

// Deterministic hash → [0,1). No Math.random anywhere: the field is reproducible.
function hash(col: number, row: number): number {
  const x = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function coverFor(ndvi: number): number {
  if (ndvi < 0.28) return 0;
  if (ndvi < 0.45) return 1;
  if (ndvi < 0.62) return 2;
  return 3;
}

/**
 * Build a deterministic Earth-observation field from mock data. NO external
 * satellite API and NO randomness: a coherent NDVI-like scalar field anchored
 * to the real observation values, classified into land cover, with heat-flag
 * anomalies. Sentinel sources become labelled orbital arcs.
 *
 * The Sentinel-2 replacement point is exactly here — real raster tiles feed the
 * same EarthField shape and the Canvas viz is untouched.
 */
export function buildEarthField(
  data: AtlasData,
  cols = 40,
  rows = 24,
): EarthField {
  // Anchor points from real NDVI observations, mapped into grid space by their
  // rank so the field reflects the data rather than pure procedure.
  const ndviObs = data.observations.filter((o) => o.variable === 'ndvi');
  const anchors = ndviObs.map((o, i) => ({
    col: ((i + 1) / (ndviObs.length + 1)) * cols,
    row: (0.35 + 0.3 * hash(i, 7)) * rows,
    value: o.value,
  }));

  const heatFlags = data.observations.filter(
    (o) => o.variable === 'temperature' && !o.validated,
  ).length;

  const cells: EarthCell[] = [];
  let sum = 0;
  let min = 1;
  let max = 0;
  const coverCounts = new Array(COVER_CLASSES.length).fill(0);

  // Distribute anomaly flags onto the highest-value (hottest/most-vegetated
  // contrast) cells deterministically.
  const anomalyTargets = new Set<string>();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Smooth coherent base field via layered sines.
      const base =
        0.5 +
        0.22 * Math.sin(col * 0.35 + row * 0.12) +
        0.14 * Math.sin(row * 0.5 - col * 0.09) +
        0.06 * (hash(col, row) - 0.5);

      // Pull toward nearby observation anchors (inverse-distance).
      let anchorPull = 0;
      let weight = 0;
      for (const a of anchors) {
        const d2 = (col - a.col) ** 2 + (row - a.row) ** 2;
        const w = 1 / (1 + d2 * 0.12);
        anchorPull += a.value * w;
        weight += w;
      }
      const anchored = weight > 0 ? (base + anchorPull) / (1 + weight) : base;
      const ndvi = Math.min(1, Math.max(0, anchored));

      const cover = coverFor(ndvi);
      coverCounts[cover]++;
      sum += ndvi;
      if (ndvi < min) min = ndvi;
      if (ndvi > max) max = ndvi;

      cells.push({ col, row, ndvi, cover, anomaly: false });
    }
  }

  // Mark `heatFlags` anomalies at deterministic, spread-out grid positions.
  for (let k = 0; k < heatFlags; k++) {
    const col = Math.floor(((k + 1) / (heatFlags + 1)) * cols);
    const row = Math.floor((0.25 + 0.5 * hash(k, 3)) * rows);
    anomalyTargets.add(`${col},${row}`);
  }
  for (const c of cells) {
    if (anomalyTargets.has(`${c.col},${c.row}`)) c.anomaly = true;
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
    summary: {
      ndviMin: min,
      ndviMax: max,
      ndviMean: sum / (cols * rows),
      dominantCover: COVER_CLASSES[dominant],
      anomalies: anomalyTargets.size,
    },
  };
}
