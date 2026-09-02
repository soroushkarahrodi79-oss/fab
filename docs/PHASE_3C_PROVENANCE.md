# PHASE 3C — Evidence + provenance drill-down

**Verdict: `PHASE_3C_ACCEPTED`.** A visible HATI decision can be traced to the
evidence FAB already carries — *claim → evidence → source → limitation* — without
leaving the interaction context, using existing data only. No new science, no
ranking, no new dependency; `hati.generated.json` byte-identical.

## Research-integrity intent

FAB stays a **research / decision-intelligence portfolio instrument**; HATI is one
rigorous case study. This gate proves the portfolio's core promise — *trace a
claim to its data* — not a heat-refuge feature.

## Interaction architecture

The existing FIELD SCANNER gains one keyboard-accessible disclosure
("Evidence & provenance"). It is **always present** (a verbosity control), so it
is never a moving target: expand once, then focus/hover marks to read each
decision's provenance. This deliberately decouples the disclosure from the
transient Phase-3B hover/focus, so there is **no focus trap**, marks stay
`role="img"` (no activation added), and 3B clear-on-blur is untouched. Collapsed
= the Phase-2/3B scanner exactly (no regression). The detail is always exactly
the active decision's, keyed by the stable `${scenarioId}:${assetId}` identity.

```
Decision + Asset + Scenario  (existing fields only)
  → adapters/hati.buildDecisionEvidence()   claim→evidence→source→limitation
  → ScenarioNode.evidence
  → scenarioNodeScan(...).detail            (SAME builder → both views identical)
  → ScanTarget.detail  (generic scanner contract)
  → FieldScanner disclosure                 renders groups; invents nothing
```

Both the ACCESS FIELD and the geographic TERRITORY view emit their scanner
payload through the one `scenarioNodeScan`, so the provenance is identical in
both — one evidence identity, two views.

## Claim → evidence → source → limitation

- **DECISION (claim):** state, role, confidence, exclusion reason, evidence basis
  (with its `EvidenceStatus` tag), evidence confidence.
- **THERMAL (evidence):** modelled/simulated UTCI with its status tag + timestamp
  + "not field-measured" limitation; indoor → **"Not modelled (indoor)"**, no
  fabricated UTCI.
- **ACCESS (evidence):** coordinate; for candidates distance + walk estimate +
  experience, tagged `straight-line`, with a "not a routed walking path"
  limitation.
- **SOURCE:** source name, dataset repo/file/record ref, the Asset's OSM ref and
  Wikidata Q-id **verbatim**, opening hours, evidence completeness, fetch date.
- **SCENARIO OUTCOME:** HATI's own `recommendation` (incl.
  `NO_DEFENSIBLE_ALTERNATIVE`) and scenario note, tagged **"HATI output"** — a
  pre-existing HATI result, never FAB-authored advice.

## Honest absence

Missing evidence is stated, not omitted: "Not modelled (indoor)", "Unavailable",
"Missing source metadata". Status is conveyed as a **text** tag (never colour
alone); colour only reinforces caution statuses.

## No new science

`buildDecisionEvidence` is a pure read of existing fields. It recomputes no UTCI,
derives no accessibility, ranks/scores/weights nothing, computes no composite
confidence, converts no straight-line distance to a route, and reinterprets no
HATI exclusion. A no-ranking invariant test scans every decision's evidence for
score/rank/weight/best/winner vocabulary.

## Genuine architectural debt

- `improvement_note` exists in the raw HATI CSV but is **not carried** into
  `hati.generated.json` (the transform drops it), so it cannot be surfaced
  without regenerating data — out of scope here. Documented, not faked.
- `scan` and `scan.detail` are set together by the same gesture; coherent by
  construction but coupled by convention, not by type.

## Next gate (recommended, not executed)

Carry `improvement_note` through the HATI transform (a data-generation change,
byte-diff reviewed) so the per-candidate rationale joins the ACCESS group — the
last existing HATI field not yet traceable.
