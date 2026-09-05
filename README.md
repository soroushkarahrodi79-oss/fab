# SOROUSH // FIELD ATLAS

> A living map of research, territory, signals, and experiments.

A data-first, dark, cartographic **research instrument** — not a conventional
portfolio. A single full-screen interactive environment composed of living
modules, each rendering real structured data rather than decorative
animation.

## What FAB is today

One screen, three visualisation modules — **TERRITORY**, **EARTH**,
**SIGNALS** — driven by one shared dataset, plus a **FIELD SCANNER** readout
that surfaces the exact evidence behind whatever is currently focused. It is
still growing; not everything on screen is real yet, and the instrument says
so rather than hiding the gap (see [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md)).

## Evidence status, by module

| Module / data | Status | What that means |
|---|---|---|
| **TERRITORY** geometry | AUTHENTIC | Real INE municipal boundaries (Madrid, Sierra de Guadarrama, Sierra del Rincón) — a build-time snapshot, no runtime API. |
| **PROJECTS** | AUTHENTIC | Derived from the author's real GitHub repositories, build-time snapshot. |
| **SIGNALS** | DERIVED, HONEST | `shares-territory` edges are computed at read time from `Project.territoryIds` — never hand-authored, never a fabricated "strength". Exactly one edge exists today (`firstlook-mad` ↔ `hati-madrid`, via the shared `Territory.id` `madrid`), because that is the only exact overlap the committed data proves — a sparse true graph beats a dense plausible one. See [`docs/PHASE_4D_SIGNALS.md`](docs/PHASE_4D_SIGNALS.md). |
| **HATI Madrid** evidence (assets/scenarios/decisions) | AUTHENTIC, mixed evidence status | A real heat-adaptive-tourism research project's decision layer, ingested verbatim from its own CSVs. Every decision carries its own `evidenceStatus` (observed / documented / derived / modelled / simulated) and provenance; FAB never recomputes eligibility, ranking, or thermal state. See [`docs/PHASE_2_HATI.md`](docs/PHASE_2_HATI.md), [`docs/PHASE_3C_PROVENANCE.md`](docs/PHASE_3C_PROVENANCE.md). |
| **SNTO** NDVI observations | AUTHENTIC (sparse) | 3 real Sentinel-2 NDVI zonal aggregates (50 m buffer) around 3 point-anchor assets in Sierra de Guadarrama, copied verbatim from the SNTO research project's own pipeline output. Deliberately point-only — the project's polygon/line assets are deferred rather than faked as points. See [`docs/PHASE_4C2A_SNTO_OBSERVATIONS.md`](docs/PHASE_4C2A_SNTO_OBSERVATIONS.md). |
| Other point **observations** | MOCK-DETERMINISTIC | The original placeholder point records (NDVI / temperature / land-cover / mobility). Each is honestly labelled with an `evidenceStatus` and a `validated` flag, but the underlying values are illustrative, not measured. |
| **EARTH** raster | MOCK-DETERMINISTIC | A deterministic NDVI/land-cover grid, labelled `mock-deterministic` in the UI itself. A real Sentinel-2 seam (bands, cloud masking, compositing, target contract) is fully specified in [`docs/EARTH_REAL_DATA.md`](docs/EARTH_REAL_DATA.md) but not wired — it needs network egress and provider credentials this environment doesn't have. |

Every observation/decision carries an `evidenceStatus` (`observed` /
`documented` / `derived` / `modelled` / `simulated`) and, where applicable, an
independent `validated` (field-validated or not) flag — both rendered as
text, never colour alone. See [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md).

## Stack

Vite · React 18 · TypeScript. Visualisations are SVG (TERRITORY, SIGNALS),
Canvas 2D (EARTH), and SVG+DOM (core) — **no WebGL, no map tiles, no heavy viz
deps** (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # vitest
npm run lint       # eslint
npm run typecheck  # tsc
npm run build      # production build → dist/
```

## Architecture

`/data` → `adapters/` → `viz/` → `interaction/` → `shell/`. Domain data
conforms to [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md); a visualisation
never owns its data, so real datasets replace mocks at the adapter seam
without touching rendering.
