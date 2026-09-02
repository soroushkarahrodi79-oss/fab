# PHASE 3A — HATI × TERRITORY geographic context

**Verdict: `PHASE_3A_ACCEPTED`.** An authentic HATI decision can be read in real
Madrid geography using FAB's existing TERRITORY projection and SVG grammar — one
territorial visualization system, shared scenario state, no science recomputed.

## The composition test

HATI assets span ~1.8 km — **2.4% × 1.9%** of the full 3-territory extent, a ~2px
cluster at module 01's zoom. So the coordinates reconcile with the projection but
are only legible when *framed* to the scenario. The projection is generic and
bbox-driven, so this is framing, not a second map (no MapLibre/Leaflet/WebGL).

## Data flow

```
AtlasData (assets + scenarios + decisions)
  → adapters/hati.buildScenarioView        (decision semantics; role/state/evidence)
  → adapters/territoryScenario.buildTerritoryScenario
        frameBBox + makeProjector (the ONE territory projection, reused)
        → MapMark[] (authentic Asset.position projected; role from Decision.role)
  → viz/TerritoryScenario (SVG; graticule + Phase-2 mark grammar)
```

Territory projection helpers (`frameBBox`, `makeProjector`) were extracted from
`projectTerritories` so region and scenario share one projection. The overlay is
driven by `Asset.position`, never hard-coded coordinates.

## Shared state

Scenario selection was lifted from `ScenarioSlice`'s local `useState` into the
existing `FieldContext` (`scenarioId` + `selectScenario`), seeded in `App`. Single
source of truth: the picker, the abstract ACCESS FIELD, the geographic Madrid view,
and the module-01 locator all read the same id. No new store; no duplication.

## Cross-module link

Select S1–S8 → the abstract field and the geographic Madrid view both reflect it,
and module 01 TERRITORY pins a "scenario" crosshair on the subject's real location
(full 3-area overview preserved). Focusing an asset in any view drives the FIELD
SCANNER with the SAME decision identity, keyed by the stable `${scenarioId}:${assetId}`
decision id. The `Decision` object is never duplicated.

## Scientific integrity

`territoryScenario` consumes `Decision.role`/`state`/`constraintReason`/evidence
verbatim — it recomputes no eligibility, ranking, UTCI, thermal state, or exclusion.
`hati.generated.json` is byte-identical to Phase 2. Coordinates are the authentic
catalog values, projected but never jittered; overlap is handled by focus + the
scanner, not by moving points. The frame's straight-line span is disclosed; no
routes or walking distances are invented.

## Accessibility

Mapped marks are inspectable data marks: `role="img"` + full label, keyboard-
focusable, driving the scanner on focus and hover (keyboard == pointer). The
module-01 locator is likewise focusable. Verified at 1440×900 and 390×844, with
reduced motion (static SVG).

## Architectural debt (genuine)

- Two scenario views (abstract + geographic) share a subject; a future pass could
  let hovering one highlight the same mark in the other (cross-highlight).
- The equirectangular frame stretches each axis independently — fine for a small
  central-Madrid AOI; a larger territory would want an aspect-preserving fit.

## Next gate (recommended — not executed)

Cross-highlight: focusing a mark in one scenario view visibly highlights the same
decision id in the other, tightening the "one evidence identity, two views" link.
