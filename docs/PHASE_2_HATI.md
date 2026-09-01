# PHASE 2 — HATI Madrid authentic vertical slice

**Verdict: `PHASE_2_PROOF_ACCEPTED`.** One authentic research project (HATI
Madrid — Heat-Aware Tourism Intelligence) flows through FAB's data-first
architecture with provenance preserved, no HATI logic recomputed, and no
project-specific architecture hacks.

## Research question resolved

*What is the smallest authentic HATI dataset that proves FAB's architecture?*
→ **HATI project → 8 scenarios → source + candidate assets → per-asset decision
state + exclusion reason + thermal state → evidence status + provenance.**
Bounded: 27 assets, 8 scenarios (S1–S8), 216 decisions.

## Stop-gate decision: REVISE CONTRACT

Reusing `Observation` was rejected: its `validated: boolean` cannot carry the
modelled / documented / derived / simulated distinction, and it has no home for
decision state, exclusion reason, or scenario membership — forcing HATI through
it would relabel SOLWEIG-modelled UTCI as if measured (a scientific-honesty
violation). A **small generic extension** (see `DATA_CONTRACT.md` → Evidence
layer) was justified instead; STOP (project-specific hacks) was unnecessary.

## Data flow (deterministic build-time seam)

```
heat-adaptive-tourism-madrid  (commit 036c50b, data/processed/phase3_*.csv)
   │  copied unmodified
   ▼
src/data/hati/*.snapshot.csv          raw evidence snapshot (committed)
   │  scripts/build-hati.mjs  (pure transform; run twice → identical bytes)
   ▼
src/data/hati.generated.json          Asset / Scenario / Decision (FAB contract)
   │  src/data/hati.ts → src/data/index.ts (atlas)
   ▼
adapters/hati.ts  buildScenarioView   view model + token→label translation
   │
   ▼
viz/ScenarioField.tsx (SVG)           consumes the view model; never reads a CSV
   + interaction/FieldScanner         answers the five evidence questions
```

No runtime GitHub API, no backend, no auth, no network. The viz layer never
parses raw HATI files (`hati-architecture.test.ts` enforces this).

## Provenance & scientific honesty

- Every asset/scenario/decision carries a `Provenance` (repo, file, ref,
  temporal context, fetch date). OSM `relation/…` refs and Wikidata Q-ids are
  preserved verbatim.
- Evidence status is taken from HATI's own markers, never invented:
  - outdoor thermal decisions → `modelled` (SOLWEIG/UTCI; no field validation
    exists in HATI);
  - indoor (`INDOOR_NOT_MODELLED`) → the `INDOOR_REFUGE` decision is `derived`
    (a rule over documented OSM/opening-hours evidence, whose own status stays
    documented); the thermal environment is not modelled, so **no** UTCI value
    is stored (missing means missing);
  - the genuine A24 solar-boundary `UNSTABLE` case → `simulated`, never softened.
- The temporal frame (one historical episode, 2023-08-21, 3 modelled timestamps)
  and the "not live / not forecast / distances straight-line / thermal not
  measured" caveats are surfaced in the UI, transcribed from HATI's own
  limitations disclosure.

## What a user can inspect

The SCENARIO module (module 04): pick any of the 8 scenarios; a heat-exposed
source asset sits at the centre with its candidate alternatives placed by **real
access geography** (bearing + straight-line distance — not a ranking). Fill
encodes HATI's `decision_state`, ring encodes `decision_confidence`, opacity
encodes `evidence_confidence`, a slash marks excluded candidates. Focusing any
node (pointer or keyboard, equivalent) drives the FIELD SCANNER, answering: what
am I looking at, which scenario, observed/documented/modelled/simulated, why
included/excluded, and what source supports it.

## Tests (all green — 60 total, 33 Phase-1 regression + 27 Phase-2)

- `hati-ingestion` — deterministic/pure transform, matches committed output,
  stable composite ids, provenance preserved.
- `hati-integrity` — scenario/asset/decision/source/territory references resolve.
- `hati-honesty` — modelled/simulated never relabelled; no invented indoor UTCI;
  UNSTABLE stays simulated.
- `hati-architecture` — no viz component reads a CSV/snapshot/filesystem.
- `scenario-nav` — keyboard focus drives the scanner; excluded reasons shown.

## Genuine architectural debt

- Assets are anchored to the `madrid` territory but not yet drawn on the
  TERRITORY map; cross-module linking (asset ↔ territory geometry) is a future
  step, not required for this proof.
- The spatial layout uses a local equirectangular bearing (fine for a central-
  Madrid AOI); a projected layout would be needed for larger areas.

## Next gate (recommended, not executed)

Wire the HATI assets onto the TERRITORY (Madrid) map so a decision can be read in
real geographic context — reusing the existing GeoJSON SVG seam, still no new
visual system.
