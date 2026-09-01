# ARCHITECTURE — SOROUSH // FIELD ATLAS

## 1. Layered architecture (the data-first rule)

Strict one-way dependency flow. A layer may import only from layers above it in
this list; a visualisation must never own domain data.

```
/data            deterministic domain datasets (JSON/TS) — the source of truth
   │
   ▼
adapters/        pure functions: raw data → view models (typed, tested)
   │
   ▼
viz/             presentation-only components (SVG / Canvas), given view models
   │
   ▼
interaction/     pointer + keyboard layer (FIELD SCANNER), state, focus
   │
   ▼
shell/           app composition, layout, masthead, module framing
```

- **`/data`** holds `territories`, `projects`, `signals`, `observations`,
  `sources` as plain typed data conforming to `DATA_CONTRACT.md`. No rendering
  concepts leak in (no pixels, no colours).
- **`adapters/`** transform domain → view model: project geo coordinates to
  the instrument's local space, precompute the signal graph layout, bucket
  observations into the Earth grid, derive the FIELD STATE summary. Pure,
  deterministic, unit-tested. This is the seam where mock data is later
  swapped for real data with **zero** changes downstream.
- **`viz/`** components receive a finished view model and draw. They know
  nothing about where data came from. Swapping the data source cannot force a
  change here (STOP GATE Q4).
- **`interaction/`** owns hover/focus state and the scanner readout; it reads
  view models, never raw data.
- **`shell/`** composes everything and owns layout/responsiveness only.

## 2. Rendering strategy — per module, WebGL justified NOT adopted

Decision recorded up front (see STOP GATE Q5). **No WebGL / Three.js / R3F in
Phase 1.** Each module uses the lightest technology that fully encodes its data:

| Module | Tech | Why not WebGL |
|---|---|---|
| **TERRITORY** | **SVG** | A handful of GeoJSON polygons + labelled points. SVG gives crisp vector cartography, native hit-testing, and accessible `<title>`/`role`. WebGL would add a projection/label pipeline for <100 features — unjustified. |
| **EARTH** | **Canvas 2D** | A deterministic raster field (NDVI/land-cover grid ~ 40×24 cells) + orbital arcs. Canvas draws thousands of cells cheaply in one paint; no per-cell DOM. Not enough geometry to need GPU shaders yet. |
| **SIGNALS** | **SVG** | ~4–12 nodes and their edges with **precomputed** positions. SVG edges/nodes are hit-testable and labelled. No live force simulation → no `rAF` loop → no canvas needed. |
| **FIELD STATE core** | **SVG + DOM** | A compact radial readout driven by summary numbers. DOM carries the accessible text; SVG carries the ring. |

Rendering rules:
- **No continuous render loop when idle.** Canvas repaints only on data change,
  resize, or an explicit one-shot entry sweep that stops itself.
- All expensive viz code is **lazy-loaded** (`React.lazy` + dynamic import) and
  gated behind capability + reduced-motion checks.
- Each viz has a **static fallback** used for reduced-motion, SSR-less first
  paint, and canvas-unsupported environments.

Re-evaluation trigger for WebGL: adopt Three.js/R3F only when a module needs
真 3D terrain, >10⁴ animated marks, or per-fragment shading (e.g. a real
globe with draped Sentinel tiles) — a **Phase 3+** concern, not now.

## 3. Frontend framework & build

**Vite + React 18 + TypeScript**, single-page client app.

Why Vite over Next.js (both were evaluated): this is one full-screen instrument
with in-place modules, not a multi-page site. There is no SSR, no server data
fetching, no routing surface, no SEO-critical content-per-URL requirement in
Phase 1. Next.js would add a framework runtime and build model we would not
use. Vite gives fast dev, tiny config, native code-splitting for the lazy viz,
and a static `dist/` that hosts anywhere. If Phase 3+ needs SSR/edge data or
per-module routes, migrating the same React component tree to Next is
mechanical. **Smallest viable stack wins now.**

## 4. State management

No state library. State is small and local:
- **Static domain data + adapters** → memoised at module load (`useMemo`), pure.
- **Interaction state** (hovered/focused element, scanner target, reduced-motion
  flag) → React context (`FieldContext`) + `useReducer`. One context, a few
  fields. Redux/Zustand/Jotai would be premature (STOP GATE Q3).
- **Derived FIELD STATE** → computed by an adapter from data, not stored.

## 5. Visualisation boundaries (contracts between viz and the rest)

- A viz component's props are a **view model type**, plus a small render-config
  (dimensions, reduced-motion, focus id). No callbacks that mutate data.
- Interaction is reported *up* via typed events (`onFocusElement(id)`), so the
  interaction layer — not the viz — decides what a focus means.
- Colours enter viz only as **semantic tokens** resolved from CSS variables, so
  a data category maps to a token, never a hex literal inside a component.

## 6. Dependency decisions (Phase 1)

Adopted:
- `react`, `react-dom` — component model.
- `vite`, `@vitejs/plugin-react`, `typescript` — build/types.
- `vitest`, `@testing-library/react`, `jsdom` — tests for contracts, adapters,
  fallbacks, navigation.
- `eslint` (+ typescript-eslint, react-hooks) — lint.

**Explicitly rejected for Phase 1**, each with a re-adoption trigger:
- **three / @react-three/fiber** — no module needs GPU 3D yet (§2). Trigger:
  real draped-tile globe or dense particle terrain.
- **d3** (full) — we need one thing D3 does (a graph layout) and we precompute
  it deterministically in an adapter; pulling all of D3 for that is waste. If
  we later need live force simulation or scales/axes at volume, add
  `d3-force`/`d3-scale` as scoped packages, not `d3`.
- **maplibre-gl** — pulls tile fetching, a GL runtime, and a Google-Maps-like
  feel we explicitly reject. Our territories are a few GeoJSON features drawn in
  SVG. Trigger: needing pan/zoom over real basemap tiles at global scale.
- **framer-motion / animation libs** — motion is minimal and CSS/`rAF`-one-shot
  handles it. Trigger: choreographed multi-element sequences that CSS can't
  express.

Cost note: the adopted runtime deps are React + ReactDOM only (~45KB gzip);
everything else is dev-time. Viz code is code-split so a module's draw logic is
not in the initial bundle.

## 7. Accessibility architecture

- Every viz ships a **semantic twin**: TERRITORY points are `<a>`/`<button>`
  with labels; SIGNALS nodes are focusable with `aria-label`; EARTH exposes a
  `<figure>`/`<figcaption>` textual summary of the field (dominant land cover,
  NDVI range, anomaly count) so its meaning survives with canvas off.
- Keyboard: Tab cycles modules and their elements; focusing an element drives
  the same scanner readout as hovering; `Esc` clears focus.
- `prefers-reduced-motion` is read once into `FieldContext` and every viz
  branches on it.

## 8. Future data integrations (where each will attach)

All attach at the **adapter seam** (`adapters/`), never in viz:
- **Sentinel-2 / NDVI / land cover** → replaces the deterministic Earth grid
  generator in `adapters/earth`.
- **GitHub** → feeds `projects` in `/data` via a build-time fetch → same
  `Project` contract.
- **FieldOS observations** → feeds `observations` → same `Observation` contract.
- **Real GeoJSON territories** → drop-in for `/data/territories`; the SVG
  projection already consumes GeoJSON geometry.

Because every integration lands as data conforming to `DATA_CONTRACT.md` and is
shaped by an adapter, the visualisation layer never learns that the data became
real (STOP GATE Q4).
