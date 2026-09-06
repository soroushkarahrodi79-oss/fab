# EARTH — Real Sentinel-2 / NDVI integration (scope)

Status: **contract hardened (Phase 5A); real acquisition is Phase 5B.** The
`EarthGrid` contract now carries what a real Sentinel-2 composite needs to be
honest and pinnable, the mock is `evidenceStatus: 'simulated'`, and the
illustrative derived layers (land-cover class, heat anomalies, orbital arcs)
have been removed so they cannot become false claims over real data. Live
satellite ingestion still needs network egress + credentials this environment
does not have. This document defines the contract, the pipeline, the trade-offs,
and exactly what must be validated (and escalated) before wiring a real source.

## Goal

Drive the EARTH module from a **real Sentinel-2-derived NDVI field** instead of
the deterministic mock, **without changing the Canvas viz** (`viz/EarthField.tsx`)
— the same seam already proven for TERRITORY (real INE geometry) and PROJECTS
(real GitHub repos).

## The seam (what this change establishes now)

EARTH previously synthesised its field *inside* the adapter. That is now split:

```
src/data/earth/grid.generated.json   ← raw EO raster (the EarthGrid contract)
   │   produced by scripts/build-earth-grid.mjs
   │   (mock provider now; a Sentinel-2 provider later — same output shape)
   ▼
adapters/earth.ts  buildEarthField(grid)   ← packs cells (nodata → ndvi: null),
   │                                          computes NDVI + coverage summary
   ▼
viz/EarthField.tsx  (Canvas 2D)             ← UNCHANGED; consumes EarthField
```

The `EarthGrid` raw contract (Phase 5A hardened — see `data/types.ts`):

```ts
interface EarthGrid {
  source: 'mock-deterministic' | 'sentinel-2';
  evidenceStatus: EvidenceStatus;  // mock → 'simulated'; real → 'derived'
  variable: 'ndvi';
  territoryId?: string;            // spatial anchor
  bbox: [number, number, number, number]; // target extent in target CRS
  crs: string;                     // CRS of bbox / output grid, e.g. "EPSG:4326"
  cols: number; rows: number;
  resampling: 'average';           // native composite → coarse grid cell
  compositeStart: string;          // temporal support (window), NOT one date
  compositeEnd: string;
  nodata: number;                  // required — missing EO support, never a valid 0
  values: number[];                // row-major NDVI, length cols*rows
  validFraction?: number[];        // per-cell fraction of valid native pixels
  provenance: EarthGridProvenance; // provider, collection, itemIds, bands, mask…
}
```

There is deliberately **no** single `capturedAt` (a composite spans a window)
and **no** top-level `cloudCover` (ambiguous across a masked multi-scene
composite; real support is the per-cell `validFraction`). Swapping mock → real
means writing a real `grid.generated.json` from a Sentinel-2 provider (Phase
5B). Nothing downstream changes.

## Source options (evaluated)

| Source | Access | Pros | Cons |
|---|---|---|---|
| **Copernicus Data Space — Sentinel Hub Process/Statistical API** | OAuth client creds (free tier) | Server-side band math + NDVI + cloud masking; returns exactly the raster/stats we need; no scene download | Rate/quota limits; account + secret required |
| **Element84 Earth Search (STAC) + AWS S2 L2A COGs** | Anonymous STAC; COGs on S3 (requester-pays historically, now open) | No account for search; full control | We must do band math, cloud masking (SCL), compositing, and read COGs (gdal/rio-tiler) — heavier client |
| **Microsoft Planetary Computer (STAC)** | Free token | Rich STAC + data API, `pc.sign` | Token + Python stack (stackstac/odc) |
| **Google Earth Engine** | Account + auth | Trivial NDVI composites at scale | Heavier auth; export step; ToS |

**Recommendation:** start with **Sentinel Hub Statistical/Process API on Copernicus
Data Space** for the build-time job — it does cloud masking and NDVI server-side
and returns a small raster/stat payload, which keeps our pipeline tiny and avoids
shipping a geospatial runtime. Fall back to **Earth Search STAC + rio-tiler** if
we need provider independence.

## Pipeline (build-time, per study territory)

1. **AOI**: the territory bbox (already have real geometry for Sierra de
   Guadarrama). Optionally clip to the polygon.
2. **Temporal window**: a season (e.g. a summer composite) to reduce cloud gaps.
3. **Cloud masking**: use the Sentinel-2 **SCL** band (drop clouds/shadow/snow),
   or Sentinel Hub's built-in masking.
4. **NDVI**: `NDVI = (B08 − B04) / (B08 + B04)`, range −1..1; we store the
   vegetation-relevant 0..1 range and set `nodata` for masked cells.
5. **Resample** to the module grid (e.g. 48×28) — an instrument summary, not a
   full-res tile. Keeps the committed file a few KB.
6. **Composite** (median over the window) to fill gaps and suppress residual
   cloud.
7. **Write** `EarthGrid` JSON with `source: "sentinel-2"`,
   `evidenceStatus: "derived"`, `compositeStart`/`compositeEnd`, `bbox`, `crs`,
   `values`, `validFraction`, and a `provenance` block with exact `itemIds`.

`scripts/build-earth-grid.mjs` already writes this shape; step 1–6's data
acquisition swaps from the deterministic generator to the provider calls (behind
a token). **Note what does NOT come along for free:** land-cover class, heat
anomalies, and orbital arcs were removed in Phase 5A — they were illustrative
over the mock and would become false scientific claims over a real field (NDVI
thresholds are not a land-cover product, an unvalidated *modelled* temperature
is not an anomaly, and a listed mission is not a proven overpass). Each is a
separate, honestly-sourced layer if it ever returns: land cover from a real
classifier (e.g. ESA WorldCover) as its own variable/source; a thermal overlay
from its own contract; orbit geometry only from real ephemeris. None may be
re-derived from the NDVI grid.

## Trade-offs & risks

- **Determinism vs. freshness.** Our tests assert deterministic adapter output.
  Real data is committed as a *snapshot* (like the repo/geometry snapshots), so
  the build stays deterministic; freshness is a CI refresh concern, not a runtime
  one.
- **Cloud gaps** can leave `nodata`; the viz must render masked cells gracefully
  (a neutral cell, not a false NDVI). Handled at the adapter, so viz is unaffected.
- **Payload size.** Full-res tiles are large; we deliberately resample to a small
  instrument grid. A real GeoTIFF/COG never reaches the client.
- **Projection.** Sentinel-2 tiles are UTM/MGRS; the provider (or our step 5)
  reprojects to the lon/lat bbox we store.
- **Attribution/licence.** Copernicus Sentinel data is free/open with an
  attribution requirement — add a Copernicus credit in the UI when real data
  lands.

## What needs escalation / credentials (not doable in this environment)

1. **Network egress** to the EO provider (blocked by the current policy).
2. **A provider account + OAuth client secret** (Copernicus Data Space or MS
   Planetary Computer), stored as a CI secret — never committed.
3. A **stronger reasoning/design pass** for the acquisition step: choosing the
   compositing window, cloud-mask thresholds, and reprojection is where subtle
   correctness bugs hide (this is the one task flagged for model escalation).

## Done-when (for the future real-data PR — Phase 5B)

- `grid.generated.json` carries `source: "sentinel-2"`,
  `evidenceStatus: "derived"`, a real `compositeStart`/`compositeEnd` window,
  exact `provenance.itemIds`, and a plausible NDVI distribution for the AOI/season.
- Adapter + viz unchanged; the EARTH seam test still passes.
- UI shows the Copernicus attribution and the composite window (never a single
  acquisition date).
- `nodata` cells render as neutral missing-data and are excluded from the NDVI
  summary — never coerced to a valid NDVI of 0.
- No land-cover class, heat-anomaly, or orbit layer reappears unless it acquires
  its own authentic contract and source.
