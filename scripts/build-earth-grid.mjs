/**
 * Build the EARTH raw NDVI grid (EarthGrid contract).
 *
 * MOCK PROVIDER. This writes a deterministic, gap-free NDVI composite anchored
 * to the real bounding box of the primary study territory (Sierra de
 * Guadarrama). It stands in for a real Sentinel-2 pipeline — see
 * docs/EARTH_REAL_DATA.md. A real provider (Copernicus / Sentinel Hub, or STAC
 * + rio-tiler) writes the SAME EarthGrid shape; the adapter and Canvas viz are
 * untouched by the swap.
 *
 * Output: src/data/earth/grid.generated.json
 * Run: node scripts/build-earth-grid.mjs   (dev/build tooling, not runtime)
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../src/data/earth');
const outFile = resolve(outDir, 'grid.generated.json');

// Anchor the grid to the real Sierra de Guadarrama bbox (from the INE geometry
// we already generate). A real Sentinel-2 job would use exactly this AOI.
const geo = require('../src/data/geo/territories.geo.json');
const TERRITORY = 'sierra-de-guadarrama';
function bboxOf(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (ring) => {
    for (const [lon, lat] of ring) {
      if (lon < b[0]) b[0] = lon;
      if (lat < b[1]) b[1] = lat;
      if (lon > b[2]) b[2] = lon;
      if (lat > b[3]) b[3] = lat;
    }
  };
  if (geometry.type === 'Polygon') geometry.coordinates.forEach(visit);
  else geometry.coordinates.forEach((p) => p.forEach(visit));
  return b;
}
const bbox = bboxOf(geo[TERRITORY].geometry);

const cols = 48;
const rows = 28;

// Deterministic hash → [0,1). No Math.random: the composite is reproducible.
function hash(c, r) {
  const x = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// A coherent NDVI-like field: mid-elevation vegetation belt, drier ridges and
// valley edges, plus fine texture. Stands in for a cloud-masked median composite
// (hence gap-free: no nodata cells to render). Range clamped to 0..1.
const values = new Array(cols * rows);
let sum = 0;
let min = 1;
let max = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const nx = c / (cols - 1);
    const ny = r / (rows - 1);
    // vegetation peaks in a NE–SW belt across the massif
    const belt = 1 - Math.abs((nx * 0.6 + (1 - ny) * 0.4) - 0.55) * 1.7;
    const ridges = 0.12 * Math.sin(nx * 9 + ny * 3);
    const texture = 0.06 * (hash(c, r) - 0.5);
    const ndvi = Math.min(1, Math.max(0, 0.62 * belt + 0.28 + ridges + texture));
    const v = Math.round(ndvi * 1000) / 1000;
    values[r * cols + c] = v;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
}

const grid = {
  source: 'mock-deterministic',
  variable: 'ndvi',
  territoryId: TERRITORY,
  bbox: bbox.map((n) => Math.round(n * 1e4) / 1e4),
  cols,
  rows,
  capturedAt: '2025-07-15',
  cloudCover: 0.12,
  nodata: -1,
  values,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(grid) + '\n');
const bytes = readFileSync(outFile).length;
console.log(`wrote ${outFile}`);
console.log(
  `${cols}x${rows} · bbox [${grid.bbox.join(', ')}] · NDVI ${min.toFixed(2)}–${max.toFixed(2)} (mean ${(sum / values.length).toFixed(2)}) · ${(bytes / 1024).toFixed(1)} KB`,
);
