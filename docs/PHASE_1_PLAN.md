# PHASE 1 PLAN — SOROUSH // FIELD ATLAS

The exact, bounded implementation. Anything not listed here is out of scope.

## Deliverable

A single-page Vite + React + TS application: one full-screen field instrument
with a central FIELD STATE core and three modules (TERRITORY, EARTH, SIGNALS)
around it, driven entirely by deterministic mock data conforming to
`DATA_CONTRACT.md`, with a keyboard/pointer FIELD SCANNER, reduced-motion and
canvas-off fallbacks, and a passing test/lint/typecheck/build.

## Build order

1. **Scaffold** — Vite React-TS, ESLint, Vitest, design tokens (`tokens.css`),
   base shell + masthead. Prove `dev`, `build`, `test` run.
2. **Data + types** — `src/data/types.ts` (the contract) and the five mock
   datasets. `contracts.test.ts` enforcing referential integrity.
3. **Adapters** — `fieldState`, `territory` (geo→instrument projection),
   `signals` (deterministic layout), `earth` (deterministic grid + arcs). Unit
   tests: determinism + shape.
4. **Viz components** — `TerritoryMap` (SVG), `EarthField` (Canvas 2D + static
   `<figure>` twin), `SignalGraph` (SVG), `FieldStateCore` (SVG+DOM). Each with
   its reduced/fallback branch.
5. **Interaction** — `FieldContext`, focus state, `FieldScanner` readout wired
   to hover **and** keyboard focus.
6. **Shell & layout** — responsive grid (desktop 1440, mobile 390), module
   framing, empty/loading states, lazy-load the Canvas module.
7. **QA & hardening** — reduced-motion pass, mobile degradation, contrast,
   run lint + typecheck + tests + production build.

## File map (target)

```
index.html
src/
  main.tsx, App.tsx
  styles/tokens.css, styles/base.css
  data/
    types.ts
    sources.ts territories.ts projects.ts signals.ts observations.ts
    index.ts
  adapters/
    fieldState.ts territory.ts signals.ts earth.ts
  viz/
    TerritoryMap.tsx EarthField.tsx SignalGraph.tsx FieldStateCore.tsx
  interaction/
    FieldContext.tsx FieldScanner.tsx useReducedMotion.ts
  shell/
    Shell.tsx Masthead.tsx Module.tsx
  test/  (contracts, adapters, fallback, navigation)
docs/ (Phase 0 documents)
```

## Mock data driving each visualisation

- **TERRITORY**: Madrid (urban), Sierra de Guadarrama (protected, code PNSG),
  Sierra del Rincón (protected/biosphere). Real centroids; simple polygon rings.
- **EARTH**: deterministic NDVI/land-cover grid seeded from a fixed constant +
  a set of `Observation`s over Guadarrama; two orbital arcs labelled
  SENTINEL-2 / SENTINEL-1. No external calls.
- **SIGNALS**: nodes SNTO, FieldOS, HATI Madrid, Radar (projects) + the sources
  and territories they touch; edges from `signals.ts` (`shares-territory`,
  `feeds`, `validates`, `derives-from`).
- **FIELD STATE**: computed by adapter from all of the above.

## Testing scope (must pass)

- `contracts.test.ts` — referential integrity + unique ids.
- `adapters.test.ts` — `fieldState` numbers correct; `signals`/`earth` layout
  deterministic (same input → identical output); territory projection bounds.
- `fallback.test.ts` — reduced-motion renders static twins; EARTH `<figcaption>`
  text present with canvas mocked off.
- `navigation.test.ts` — Tab reaches module elements; focusing an element sets
  the scanner target.

Commands that must succeed: `npm run lint`, `npm run typecheck`,
`npm test`, `npm run build`.

## Explicitly OUT of scope for Phase 1

Auth · CMS · database · admin · analytics · live Sentinel ingestion · GitHub
API · FieldOS integration · AI features · WebGL/Three · MapLibre · D3 runtime ·
modules 4–9 (MOBILITY, CLIMATE, RESEARCH, FIELD, PROJECTS, EXPLORATION) ·
backend of any kind.

## Definition of done

All seven build steps complete; all four test suites green; lint + typecheck +
build clean; visual QA at 1440×900 and 390×844 done with obvious issues fixed;
STOP GATE re-answered honestly in the final report; docs committed and pushed.
