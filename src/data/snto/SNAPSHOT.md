# SNTO — raw evidence snapshot (build-time input)

These files are an **unmodified snapshot** of the authoritative artifacts from the
SNTO (Smart Nature Tourism Observatory) research project. They are the raw input
to the deterministic transform in `scripts/build-snto-observations.mjs`; nothing
downstream (adapter, viz) reads these files directly.

- **Originating repository:** `soroushkarahrodi79-oss/snto-smart-tourism-observatory`
- **Pinned commit:** `add3a51d17000fe3be68fac9b0fb485ade6973f4`
- **Captured (into FAB):** 2026-09-02
- **Copied verbatim:** yes — byte-for-byte (`sha256` verified against upstream).

| Snapshot file | Source path in SNTO repo | What it is |
|---|---|---|
| `pnsg_gee_timeseries.snapshot.csv` | `clean_assets/timeseries/pnsg_gee_timeseries.csv` | Monthly per-asset zonal aggregates (NDVI/NDMI/EVI + percentiles) for 21 PNSG assets, 2021-01 → 2026-06, `data_source = GEE:S2_SR_HARMONIZED`. |
| `pnsg_assets.snapshot.geojson` | `clean_assets/pnsg_assets.geojson` | 21 PNSG assets with **mixed** geometry: 3 Point, 12 Polygon, 6 LineString. |

## Selected slice (Phase 4C2A)

- **Date:** `2026-06-01` — the documented endpoint of the committed monthly series
  in this audited snapshot. Chosen for being the series endpoint, **not** for any
  NDVI value or visual result.
- **Selection rule:** all and only assets whose upstream GeoJSON geometry type is
  `Point`. That is **exactly 3 of the 21 assets**
  (`pnsg_vuelo_libre_el_nevero`, `pnsg_vuelo_libre_la_nevera`,
  `pnsg_vuelo_libre_el_espartal`).
- **Why only 3:** the other 18 assets are Polygons (12) and LineStrings (6). Their
  upstream zonal NDVI has areal/linear spatial support that FAB's current
  point-only `Observation.at: LonLat` cannot carry without fabricating a point.
  Ingesting them is deferred to a future spatial-support phase. The full CSV is
  authoritative; only the 3-Point × 2026-06 subset is ingested here.

## Spatial support (critical)

Even the 3 Point assets are **not** point/pixel NDVI measurements. The upstream
pipeline (`scripts/gee_cloudshell_pnsg.py`, pinned commit) applies
`POINT_BUFFER_M = 50` and reduces over `ee.Geometry.Point(coords).buffer(50)`
before `reduceRegion`. So:

- the GeoJSON Point is the **asset anchor**;
- the NDVI value is a **zonal aggregate over a 50 m buffer** around that Point;
- FAB consumes the already-produced upstream aggregate and **never** reproduces or
  recomputes the buffer geometry.

(For the record, upstream also uses `LINE_BUFFER_M = 30` for LineStrings and each
Polygon's own geometry — relevant only to a future spatial-support phase.)

To refresh: re-copy the two files from the pinned commit above, then run
`npm run data:snto`.
