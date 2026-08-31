# EARTH — Real Sentinel-2 / NDVI integration (scope)

Status: **scoped; seam prepared with a mock provider.** Live satellite ingestion
is a later phase and needs network egress + credentials this environment does
not have. This document defines the contract, the pipeline, the trade-offs, and
exactly what must be validated (and escalated) before wiring a real source.

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
adapters/earth.ts  buildEarthField(data)   ← classifies cover, flags anomalies,
   │                                          derives arcs, computes summary
   ▼
viz/EarthField.tsx  (Canvas 2D)             ← UNCHANGED; consumes EarthField
```

The `EarthGrid` raw contract (see `data/types.ts`):

```ts
interface EarthGrid {
  source: string;            // "mock-deterministic" | "sentinel-2"
  variable: 'ndvi';          // primary scalar field
  territoryId?: string;      // spatial anchor
  bbox: [number, number, number, number]; // [minLon,minLat,maxLon,maxLat]
  cols: number; rows: number;
  capturedAt: string;        // ISO date of the (composite) acquisition
  cloudCover?: number;       // 0..1, scene/composite cloud fraction
  nodata?: number;           // sentinel value for masked cells
  values: number[];          // row-major NDVI, length cols*rows
}
```

Swapping mock → real means writing a real `grid.generated.json` from a
Sentinel-2 provider. Nothing downstream changes.

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
7. **Write** `EarthGrid` JSON with `source: "sentinel-2"`, `capturedAt`,
   `cloudCover`, `bbox`, `values`.

`scripts/build-earth-grid.mjs` already has this shape; only step 1–6's data
acquisition swaps from the deterministic generator to the provider calls (behind
a token). Land-cover class, heat anomalies, and orbital arcs stay in the adapter
(derived), so they need no source change; land cover can later come from a real
classifier (e.g. ESA WorldCover) as a second `EarthGrid` variable.

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

## Done-when (for the future real-data PR)

- `grid.generated.json` carries `source: "sentinel-2"` with a real `capturedAt`
  and plausible NDVI distribution for the AOI/season.
- Adapter + viz unchanged; the EARTH seam test still passes.
- UI shows a Copernicus attribution and the capture date.
- `nodata`/cloud cells render as neutral, not as vegetation.
