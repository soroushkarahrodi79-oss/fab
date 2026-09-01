/**
 * Build real territory geometry from authoritative admin boundaries.
 *
 * Source: `es-atlas` — Spanish INE (Instituto Nacional de Estadística)
 * municipality boundaries, published on npm as TopoJSON. This replaces the
 * placeholder polygon rings that Phase 1 authored by hand.
 *
 * Each Field Atlas territory is composed of the real municipalities that
 * legally / geographically constitute it, merged into a single boundary:
 *   - madrid               → the municipality of Madrid (INE 28079)
 *   - sierra-del-rincon    → the five municipalities of the Reserva de la
 *                            Biosfera Sierra del Rincón (its legal footprint)
 *   - sierra-de-guadarrama → the core Madrid-side massif municipalities
 *                            containing the national park
 *
 * Output: src/data/geo/territories.geo.json — plain GeoJSON keyed by territory
 * id, consumed at the adapter seam via Territory.geometry. NO viz code changes.
 *
 * Run: node scripts/build-territories.mjs   (dev/build tooling, not runtime)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { merge } from 'topojson-client';

const require = createRequire(import.meta.url);
const topo = require('es-atlas/es/municipalities.json');
const object = topo.objects.municipalities;

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../src/data/geo');
const outFile = resolve(outDir, 'territories.geo.json');

// Territory id → INE municipality codes that compose it.
const COMPOSITION = {
  madrid: ['28079'],
  'sierra-del-rincon': ['28088', '28069', '28071', '28117', '28118'],
  'sierra-de-guadarrama': ['28120', '28038', '28093', '28082', '28003', '28076', '28112', '28085'],
};

// Round to ~11 m and drop consecutive duplicate points — keeps the data file
// small without pulling in a full topology-simplification dependency.
const P = 1e4;
const round = (n) => Math.round(n * P) / P;
function cleanRing(ring) {
  const out = [];
  let prev = null;
  for (const [lon, lat] of ring) {
    const p = [round(lon), round(lat)];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
    prev = p;
  }
  // ensure closed
  const f = out[0];
  const l = out[out.length - 1];
  if (f && l && (f[0] !== l[0] || f[1] !== l[1])) out.push([f[0], f[1]]);
  return out;
}
function cleanGeometry(geom) {
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geom.coordinates.map(cleanRing) };
  }
  return {
    type: 'MultiPolygon',
    coordinates: geom.coordinates.map((poly) => poly.map(cleanRing)),
  };
}

const result = {};
let totalPts = 0;
for (const [territoryId, codes] of Object.entries(COMPOSITION)) {
  const set = new Set(codes);
  const parts = object.geometries.filter((g) => set.has(g.id));
  if (parts.length !== codes.length) {
    const found = parts.map((g) => g.id);
    throw new Error(
      `territory ${territoryId}: expected ${codes.length} municipalities, found ${found.length} (${found.join(',')})`,
    );
  }
  const merged = merge(topo, parts); // dissolves internal borders → one boundary
  const cleaned = cleanGeometry(merged);
  const pts = JSON.stringify(cleaned.coordinates).match(/,/g).length;
  totalPts += pts;
  result[territoryId] = {
    ine: codes,
    municipalities: parts.map((g) => g.properties.name),
    geometry: cleaned,
  };
  console.log(`${territoryId.padEnd(22)} ${parts.length} muni · ~${pts} pts`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(result) + '\n');
const bytes = readFileSync(outFile).length;
console.log(`\nwrote ${outFile}`);
console.log(`total ~${totalPts} pts · ${(bytes / 1024).toFixed(1)} KB`);
