# SOROUSH // FIELD ATLAS

> A living map of research, territory, signals, and experiments.

A data-first, dark, cartographic **research instrument** — not a conventional
portfolio. Full-screen interactive environment composed of living modules, each
of which renders real structured data rather than decorative animation.

## Status

- **Phase 0** — concept architecture (see [`docs/`](docs/)).
- **Phase 1** — vertical slice: central FIELD STATE core + three modules
  (TERRITORY, EARTH, SIGNALS), deterministic mock data, FIELD SCANNER,
  reduced-motion and canvas-off fallbacks.

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
