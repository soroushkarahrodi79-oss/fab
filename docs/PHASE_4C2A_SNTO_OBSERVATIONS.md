# Phase 4C2A — First authentic SNTO observation slice

## What entered FAB

Three authentic `Observation` records: the PNSG assets whose upstream SNTO
geometry is genuinely `Point`, for the **2026-06** monthly Sentinel-2 NDVI
composite. This is the first non-HATI authentic evidence in FAB.

- Upstream: `soroushkarahrodi79-oss/snto-smart-tourism-observatory`, pinned
  commit `add3a51d17000fe3be68fac9b0fb485ade6973f4`.
- Files: `clean_assets/timeseries/pnsg_gee_timeseries.csv`,
  `clean_assets/pnsg_assets.geojson` (copied verbatim under `src/data/snto/`).
- Transform: `scripts/build-snto-observations.mjs` → `src/data/snto.generated.json`
  (deterministic, no network, no recomputation). Run: `npm run data:snto`.

## Why Observation, not EARTH

SNTO commits no dense Sentinel-2 raster (Phase 4A NO-GO stands; EARTH remains
mock-deterministic). Its committed EO evidence is per-asset zonal aggregates —
located quantitative measurements, i.e. FAB `Observation`s. SNTO therefore
enters through a *different* generic contract than HATI (Scenario/Decision),
which is the whole point: the atlas generalises across scientifically different
projects without project-specific visualization.

## Why only 3 of 21 assets

`pnsg_assets.geojson` has mixed geometry: **3 Point, 12 Polygon, 6 LineString**
(the original "21 points" assumption was false — caught by the 4C2 completeness
gate). FAB's `Observation.at` is point-only (`LonLat`). The 18 areal/linear
assets cannot be given an honest point `at` without fabricating one, so they are
deferred to a future spatial-support phase. Only the 3 genuine Points map
losslessly today. This is a bounded, explicitly re-authorized scope — **not** a
claim that "SNTO's 21 assets are integrated."

## Spatial support (the honest caveat)

Even the 3 Points are **not** pixel measurements. Upstream
(`scripts/gee_cloudshell_pnsg.py`, pinned) buffers each point by
`POINT_BUFFER_M = 50` and `reduceRegion`s over that disk. So the coordinate is
the **asset anchor**; the value is a **zonal aggregate over a 50 m buffer**. FAB
consumes the upstream aggregate and never reconstructs the buffer. The map draws
the anchor point; the scanner discloses the real support verbatim from the
provenance note.

## Evidence semantics

- `evidenceStatus: 'derived'` — NDVI is derived from sensed reflectance and
  further zonally/temporally aggregated. Never `observed`, never `modelled`.
- `validated: false` — SNTO field validation is pending. Under Phase 4C1 this is
  a neutral field-validation state, **never** a flagged/invalid trust state.
- `observedAt: '2026-06-01T00:00:00Z'` — a mechanical ISO representation of the
  monthly composite date, not an instantaneous acquisition time.

## Zero-fabrication invariant

Every value equals the exact upstream CSV `ndvi`; every coordinate equals the
exact upstream GeoJSON Point; provenance is complete and its `sourceId` matches
the observation's; no raster, no interpolation, no Signal edge, no new
project/source/territory entity. Enforced by `src/test/snto-observations.test.tsx`.

## Deferred: spatial-support debt

A future phase (only if justified) must model the real aggregation support, not
the source feature's geometry type: Point → 50 m buffer, LineString → 30 m
buffer (`LINE_BUFFER_M`), Polygon → the polygon itself. That would admit the
remaining 18 assets honestly.
