# SOROUSH // FIELD ATLAS

> A living map of research, territory, signals, and experiments.

A data-first, dark, cartographic **research instrument** — not a conventional
portfolio. Full-screen interactive environment composed of living modules, each
of which renders real structured data rather than decorative animation.

## Status

- **Phase 0** — concept architecture (see [`docs/`](docs/)).
- **Phase 1** — vertical slice: central FIELD STATE core + three modules
  (TERRITORY, EARTH, SIGNALS), a keyboard/pointer FIELD SCANNER, reduced-motion
  and canvas-off fallbacks. Data provenance is mixed and honest at each seam:
  **TERRITORY** geometry is real INE municipal boundaries and **PROJECTS** are
  derived from the author's real GitHub repositories (both build-time
  snapshots, no runtime API), while **EARTH** is still a deterministic mock
  NDVI grid — labelled `mock-deterministic` in the UI — behind a prepared
  Sentinel-2 seam. Signals and observations remain deterministic mock data.

## Stack

Vite · React 18 · TypeScript. Visualisations are SVG (TERRITORY, SIGNALS),
Canvas 2D (EARTH), and SVG+DOM (core) — **no WebGL, no map tiles, no heavy viz
deps** in this slice (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

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

`/data` → `adapters/` → `viz/` → `interaction/` → `shell/`. Domain data conforms
to [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md); a visualisation never owns
its data, so real datasets replace mocks at the adapter seam without touching
rendering.
