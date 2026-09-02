# Phase 4C1 — Observation: evidence status vs. field validation

## What changed

`Observation` now carries **two independent axes** that were previously
conflated into a single boolean:

| Axis | Field | Meaning |
|---|---|---|
| Production status | `evidenceStatus: EvidenceStatus` (required) | *How* the value was made: `observed` · `documented` · `derived` · `modelled` · `simulated`. |
| Field validation | `validated: boolean` | *Only* whether the value has been independently confirmed in the field. |

A new optional `provenance?: Provenance` allows a traceable origin; it stays
absent (never faked) for the Phase-1 mock observations.

## Why

Phase 1 shipped `validated: boolean` meaning "field-validated". The
visualization then (incorrectly) read it as a generic trust state —
`true → ok`, `false → flagged` (a red `--alert` mark). That collapsed three
different things into one negative signal:

- valid **derived** evidence awaiting field validation;
- **modelled** evidence;
- genuinely questionable evidence.

Phase 2 had already solved this for the evidence layer with `EvidenceStatus`,
but `Observation` was never migrated. Auditing SNTO (Sentinel-2-derived NDVI,
field validation pending) surfaced the inconsistency: pushing it through the old
contract would have rendered sound satellite evidence as "flagged". Phase 4C1
repairs the **generic** contract first, using existing FAB data only — **no
SNTO is ingested here.**

## The invariant

The two axes are orthogonal and must never be conflated again:

```
evidenceStatus: 'derived',  validated: false   →  sound evidence, field-pending
                                                   (NEVER flagged / invalid / bad)
```

All four combinations are expressible without collapsing meaning:

| | validated: true | validated: false |
|---|---|---|
| `observed` | field-measured, confirmed | field-measured, not yet confirmed |
| `derived` | index/derived, confirmed | index/derived, field-pending |
| `modelled` | model output, confirmed | model output, field-pending |

## Consequences in the render/interaction layer

- **TERRITORY marks** are classed by `evidenceStatus` (`obs--observed`,
  `obs--derived`, `obs--modelled`, …) — categorical, never a red/green trust
  binary. No status uses `--alert`; measured evidence reads solid, computed
  evidence reads as a neutral outline.
- **Scanner / accessibility** expose the two axes as separate rows —
  `EVIDENCE` (e.g. `ndvi · Derived`) and `FIELD VAL` (`Field-validated` /
  `Not field-validated`). The word "flagged" is gone.
- **FIELD STATE** keeps the same computation (`validatedRatio =`
  field-validated / total) but the readout is relabelled **FIELD-VALIDATED** so
  the number's claim is explicit and not read as generic quality.

## Explicitly unchanged

`Signal`/`Signal.strength` (separate debt), EARTH (`EarthGrid`, mock grid,
adapter, `EarthField`), and all HATI types/adapter/data. The SNTO→EARTH NO-GO
(Phase 4A) stands.
