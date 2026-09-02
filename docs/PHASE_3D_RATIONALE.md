# PHASE 3D — Lossless HATI decision-rationale pass-through

**Verdict: `PHASE_3D_ACCEPTED`.** HATI's upstream `improvement_note` (candidate-
decision rationale) is carried through the deterministic transform **verbatim**
and exposed inside the existing Phase-3C provenance disclosure, completing
*claim → evidence → decision rationale → source → limitation*. FAB recomputes and
interprets nothing.

## Durable integrity rule (new)

> **Generated-contract extensions are permitted only when they are provably
> lossless pass-throughs from authoritative upstream data and do not alter any
> existing generated value or its semantics.**

This replaces the earlier "generated file must remain byte-identical" heuristic,
which was only ever a *proxy* for "no semantic drift." Byte-identity was the
right guard while nothing was meant to change; once a genuine upstream field is
added, the real invariant is **lossless additive pass-through**, proven by tests
(below), not by a frozen blob.

## What changed

- **Source field:** `improvement_note`, column 21 of
  `src/data/hati/phase3_scenarios.snapshot.csv` (HATI's own `phase3_scenarios.csv`).
- **Nature:** HATI-authored, deterministic, **candidate-decision scoped**
  rule-derivation trace (e.g. `"UTCI 40.5 <= source 45.0 - 0.8"`,
  `"indoor refuge vs outdoor source (categorical)"`,
  `"confidence gain (ROBUST vs boundary/unstable source), not hotter"`). It is
  **decision rationale**, not evidence, not FAB interpretation, not a
  recommendation, not prose.
- **Transform:** one line in `scripts/hati-transform.mjs`, candidate decisions
  only — `improvement_note: clean(r.improvement_note)` inside the existing
  `Decision.attributes`. No type change; subjects untouched (the summary CSV has
  no such column).
- **Generated JSON:** the ONLY change is the added `improvement_note` attribute on
  the 208 candidate decisions (**71** non-empty). No pre-existing value changes.
- **UI:** one optional row ("Decision basis") in the existing 3C **DECISION**
  evidence group, rendered only when non-empty, shown **verbatim** and tagged
  `HATI rationale` so it is never read as measurement evidence.

## Verbatim means verbatim

FAB does **not** parse, reformat, badge, threshold, boolean-ise, chart, or
recompute the rule string. The `0.8 °C` threshold inside a note is HATI's, shown
as part of HATI's text — never extracted into a FAB concept. The evidence rows
(UTCI + its `modelled`/`derived`/`simulated` status) are unchanged and remain the
scientific-evidence channel, distinct from this rationale channel.

## Integrity proof (tests — `src/test/hati-rationale.test.ts`)

- **A — verbatim pass-through:** every candidate `improvement_note` equals
  `clean(upstream cell)` for its exact `${scenarioId}:${assetId}` id; no
  transformation beyond `clean()`.
- **B — population equivalence:** the non-empty generated set equals the non-empty
  upstream set (computed from the snapshot; current count **71**).
- **C — subject exclusion:** no subject decision carries the key.
- **D — no-mutation guard:** candidate attributes = the exact pre-3D key set PLUS
  `improvement_note`; removing it reproduces every pre-existing value verbatim
  from source; determinism (`buildHati` twice, and == committed JSON) holds.
- **E — UI:** the "Decision basis" row is verbatim, tagged `HATI rationale`,
  absent on empty notes and on subjects; the `Evidence basis` status row is
  unchanged (rationale never relabelled as evidence).

The Phase-3C no-ranking invariant stays green: the note contains HATI's own
decision-rule vocabulary but introduces no FAB-generated score/rank/best/winner.
