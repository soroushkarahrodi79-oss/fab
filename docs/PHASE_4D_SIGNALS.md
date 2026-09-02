# Phase 4D — SIGNALS honesty: grounding edges in committed facts

## What was wrong

`src/data/signals.ts` held six hand-authored `Signal` edges, claiming (in its
own comment) that "edges encode real relationships; nothing here is
decorative." A read-only audit against `Project.sourceIds`/`territoryIds` and
the HATI/SNTO evidence layer found this false: five of six edges had no
committed backing fact, and one (`snto-shares-guadarrama-hati`) was directly
contradicted by data — HATI's project record carries `territoryIds: ['madrid']`,
not Sierra de Guadarrama. The `strength` scalar on every edge was a hand-picked
number with no derivation, rendered as if measured (`aria-label`: `"strength
0.NN"`). This failed `PRODUCT_VISION.md` STOP GATE Q2 — "every mark encodes a
real relationship."

## What changed

- **`derives-from` and `shares-territory` edges are now derived, not
  authored.** `deriveStructuralSignals` (`src/data/signals-derive.ts`) is a
  pure function of `Project.sourceIds`/`territoryIds` — facts FAB already
  stores and already tests — re-projected into `Signal` edges at read time in
  `src/data/index.ts`. There is no generated file and no build script: unlike
  PROJECTS/TERRITORY/HATI/SNTO, SIGNALS' honest edges are not external data
  being ingested, they are a second view of data FAB already holds, so a
  build-time seam here would only create a second copy that could silently
  drift from `projects.generated.json`. Runtime derivation cannot drift by
  construction.
- **`src/data/signals.ts` is now the authored home only for `feeds`/
  `validates` edges** — the two kinds structural derivation cannot produce,
  because they assert a functional relationship, not a shared fact. It is
  currently **empty**: no committed fact today proves any project feeds or
  validates another. An edge may be added here only with a `note` naming the
  specific fact that backs it.
- **`Signal.strength` is now optional.** It is populated only where a real
  countable quantity exists — currently the Jaccard overlap of two projects'
  `territoryIds` for `shares-territory` edges. `derives-from` edges (a project
  either derives from a source or it doesn't — no natural continuous
  quantity) carry no `strength`. `SignalGraph.tsx` renders an edge with no
  defined strength at a fixed idle stroke weight and omits the `"strength
  0.NN"` clause from its `aria-label` rather than announcing a number that
  isn't there.
- `github` is excluded from `derives-from` derivation: every project cites it
  as a source, so it carries zero discriminating relationship information.

## What this replaced

The six prior edges are gone. Two of them "misattributed" a real relationship
elsewhere in the data: `hati-derives-from-sentinel2` claimed a Sentinel-2
derivation for HATI, when the real Sentinel-2 relationship in the data belongs
to `snto` (`snto.sourceIds` includes `sentinel-2`, matching SNTO's own
Sentinel-2 NDVI observation slice from Phase 4C2A). The current derivation
produces `snto → sentinel-2` and `snto-alpine → sentinel-2` correctly.
`radar-derives-from-sentinel1` is gone entirely — Radar is `status: 'concept'`,
"not yet built," and cites no Sentinel-1 source. `fieldos-validates-snto` and
`fieldos-feeds-hati` are gone — no committed fact ever linked FieldOS to
either project; FieldOS may currently have zero incident edges, which is the
correct state for an ungrounded relationship, not a regression (Q2: a sparse
true graph is worth more than a dense false one).

## Honest-parts preserved

`Signal.id`/`from`/`to`/`kind`/`active`, the referential-integrity tests in
`src/test/contracts.test.ts`, `GraphNode.degree`/radius, and active/idle edge
styling in `SignalGraph.tsx` are unchanged — this phase touched only how edges
are produced and how `strength` is represented, never the generic contract or
rendering seam. No changes were needed in EARTH, HATI's or SNTO's own
generated data, TERRITORY, or SCENARIO/Decision.

## Verification

- `src/test/signals-derivation.test.ts` — every derived edge is traced back
  to the `Project` field that produced it; derivation is deterministic; no
  `feeds`/`validates` edge is ever produced structurally.
- `src/test/contracts.test.ts` — referential integrity and the `[0,1]` bound
  on `strength` (now conditional on it being defined).

To add a real `feeds`/`validates` edge in the future: add it to
`src/data/signals.ts` with a `note` naming the specific committed fact that
proves it (the way HATI/SNTO provenance names a `sourceRepo`/`sourceFile`) —
never as a plausible-sounding guess.
