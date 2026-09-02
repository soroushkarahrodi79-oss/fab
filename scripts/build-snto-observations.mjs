/**
 * Build the SNTO NDVI observation slice from the committed raw snapshots.
 *
 * Source: src/data/snto/*.snapshot.{csv,geojson} — unmodified snapshots of the
 * SNTO project's authoritative artifacts (see src/data/snto/SNAPSHOT.md for
 * repo/commit/provenance). Build-time seam, not a runtime dependency: no GEE,
 * no GitHub API, no network. Deterministic — running twice yields byte-identical
 * output.
 *
 * Slice (Phase 4C2A): the 3 assets whose upstream geometry is genuinely `Point`,
 * for the 2026-06-01 monthly composite. The other 18 assets (Polygon/LineString)
 * are intentionally NOT ingested — their areal/linear zonal support cannot map to
 * FAB's point-only Observation.at without fabricating a point.
 *
 * Output: src/data/snto.generated.json — exactly 3 generic Observation records.
 *
 * Run: npm run data:snto
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SLICE_DATE = '2026-06-01';
const EXPECTED_SOURCE = 'GEE:S2_SR_HARMONIZED';
const TERRITORY_ID = 'sierra-de-guadarrama';
const SOURCE_ID = 'sentinel-2';
const FETCHED_AT = '2026-09-02';
const PINNED_COMMIT = 'add3a51d17000fe3be68fac9b0fb485ade6973f4';

/** Minimal, dependency-free CSV parse. The SNTO CSV has no quoted fields. */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((h, i) => (row[h] = cells[i]));
    return row;
  });
}

/**
 * Pure, deterministic transform. Takes the parsed snapshot inputs and returns
 * exactly the SNTO Observation records for the point-anchor slice. Throws if the
 * hard completeness gate fails — the caller must not emit partial output.
 */
export function buildSntoObservations(csvRows, geojson) {
  // 1) The Point-only inclusion rule — mechanical, geometry-driven.
  const pointFeatures = geojson.features.filter((f) => f.geometry.type === 'Point');

  // 2) Hard completeness gate.
  if (pointFeatures.length !== 3)
    throw new Error(`gate: expected 3 Point features, found ${pointFeatures.length}`);
  const pointIds = pointFeatures.map((f) => f.properties.asset_id);
  if (new Set(pointIds).size !== 3) throw new Error('gate: duplicate Point asset_id');
  if (geojson.features.some((f) => !['Point', 'Polygon', 'LineString'].includes(f.geometry.type)))
    throw new Error('gate: unexpected geometry type in snapshot');

  const rowByAsset = new Map();
  for (const r of csvRows) {
    if (r.date !== SLICE_DATE) continue;
    if (!pointIds.includes(r.asset_id)) continue;
    if (rowByAsset.has(r.asset_id))
      throw new Error(`gate: duplicate ${SLICE_DATE} row for ${r.asset_id}`);
    rowByAsset.set(r.asset_id, r);
  }
  if (rowByAsset.size !== 3)
    throw new Error(`gate: expected 3 rows @${SLICE_DATE}, found ${rowByAsset.size}`);

  // 3) Identity join (stable order = GeoJSON feature order).
  const observations = pointFeatures.map((f) => {
    const assetId = f.properties.asset_id;
    const row = rowByAsset.get(assetId);
    const coords = f.geometry.coordinates;

    if (!Array.isArray(coords) || coords.length !== 2)
      throw new Error(`gate: ${assetId} Point coords not [lon,lat]`);
    const [lon, lat] = coords;
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90)
      throw new Error(`gate: ${assetId} invalid WGS84 coordinate`);

    const value = Number(row.ndvi);
    if (!Number.isFinite(value)) throw new Error(`gate: ${assetId} non-finite ndvi`);
    if (row.data_source !== EXPECTED_SOURCE)
      throw new Error(`gate: ${assetId} data_source ${row.data_source} !== ${EXPECTED_SOURCE}`);

    const slug = assetId.replace(/^pnsg_/, '');

    return {
      id: `snto-pnsg-ndvi-2026-06-${slug}`,
      // at = exact upstream Point coordinates ([lon, lat]) — no transform.
      at: [lon, lat],
      territoryId: TERRITORY_ID,
      sourceId: SOURCE_ID,
      variable: 'ndvi',
      // value = exact parsed upstream NDVI — no rounding/normalisation.
      value,
      unit: 'index',
      // Mechanical ISO representation of the MONTHLY composite date, not an
      // instantaneous acquisition time.
      observedAt: `${SLICE_DATE}T00:00:00Z`,
      // NDVI is derived from sensed reflectance and further zonally/temporally
      // aggregated upstream — derived, never observed/modelled.
      evidenceStatus: 'derived',
      // Not independently field-validated (SNTO field campaign pending).
      validated: false,
      provenance: {
        sourceId: SOURCE_ID,
        sourceRepo: 'snto-smart-tourism-observatory',
        sourceFile: 'clean_assets/timeseries/pnsg_gee_timeseries.csv',
        sourceRef: `${assetId}@${SLICE_DATE}`,
        temporalContext: 'monthly composite · 2026-06',
        fetchedAt: FETCHED_AT,
        note:
          'Sentinel-2 NDVI (GEE:S2_SR_HARMONIZED), derived from reflectance and ' +
          'aggregated as a monthly composite. Value is a zonal aggregate over a ' +
          '50 m buffer around this Point asset (upstream reduceRegion); the ' +
          'displayed coordinate is the asset anchor, not a pixel measurement. ' +
          `Field validation pending in SNTO. Pinned snapshot ${PINNED_COMMIT}.`,
      },
    };
  });

  return observations;
}

// ── IO wrapper ─────────────────────────────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../src/data/snto');
const outPath = resolve(here, '../src/data/snto.generated.json');

const csvRows = parseCsv(readFileSync(resolve(dataDir, 'pnsg_gee_timeseries.snapshot.csv'), 'utf8'));
const geojson = JSON.parse(readFileSync(resolve(dataDir, 'pnsg_assets.snapshot.geojson'), 'utf8'));

const observations = buildSntoObservations(csvRows, geojson);
writeFileSync(outPath, JSON.stringify(observations, null, 2) + '\n');
console.log(`wrote ${observations.length} SNTO observations → ${outPath}`);
for (const o of observations) console.log(`  ${o.id}  ndvi=${o.value}  at=[${o.at.join(', ')}]`);
