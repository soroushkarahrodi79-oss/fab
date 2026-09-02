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

## Phase 4D1 — an independent review correction

The first Phase 4D pass derived `derives-from` edges from any non-`github`
entry in `Project.sourceIds`. Independent review caught that this was itself
a subtler version of the same mistake: `Project.sourceIds` is populated
*heuristically* by `scripts/build-projects.mjs` — matched from repository
topics and free text (e.g. its field-survey inference is `field|campo|
evidence|survey|fieldos`, a broad regex over a description, not a verified
fact). Treating `sourceIds` membership as proof of a `derives-from`
relationship laundered a metadata heuristic into a stronger scientific claim
than the data actually supports — exactly the failure mode this phase exists
to remove, just moved one level down. Review also flagged that the generated
ids used a `:`-delimited scheme, violating FAB's kebab-case id convention, and
that converting territory overlap into a `strength: number` overstated a
territory-overlap count as a generic "relationship strength."

**Phase 4D1 removes all three.** `deriveStructuralSignals` now derives
*only* `shares-territory`, and only from an exact shared `Territory.id` — the
one relationship kind the canonical contract proves at the exact semantic
level claimed. `derives-from` is not derived by any mechanism; a real
project→source relationship needs a separately hardened source/provenance
contract, not a text-heuristic proxy. `Signal.strength` and `GraphEdge.strength`
are removed outright, not made optional — a territory-overlap ratio is not a
generic scientific strength, and SIGNALS must never manufacture a number to
replace it. Sparse-but-true wins over plausible-but-inferred.

## What changed (current state)

- **`shares-territory` is the only derived edge kind.**
  `deriveStructuralSignals` (`src/data/signals-derive.ts`) is a pure function
  of `Project.territoryIds` — a fact FAB already stores and already tests —
  re-projected into `Signal` edges at read time in `src/data/index.ts`. There
  is no generated file and no build script: unlike PROJECTS/TERRITORY/HATI/
  SNTO, SIGNALS' honest edges are not external data being ingested, they are
  a second view of data FAB already holds, so a build-time seam here would
  only create a second copy that could silently drift from
  `projects.generated.json`. Runtime derivation cannot drift by construction.
- **No `derives-from` edge is derived, from `sourceIds` or anything else.**
  `Project.sourceIds` is metadata inference, not provenance; it does not
  prove a `derives-from` relationship at the semantic level `Signal.kind`
  claims. This is a deliberate gap, not an oversight — see Phase 4D1 above.
- **`src/data/signals.ts` is the authored home for any edge structural
  derivation cannot produce** (currently that's everything except exact
  shared-territory). It is **empty**: no committed fact today proves any
  other relationship. An edge may be added here only with a `note` naming the
  specific fact that backs it, and must not be `active: true` unless that
  backing fact currently exists in the loaded snapshot.
- **`Signal.strength` and `GraphEdge.strength` do not exist.** No numeric
  weight is derived, stored, or displayed. `SignalGraph.tsx` renders every
  edge at one fixed neutral stroke width and never mentions "strength" in an
  `aria-label`; the exact shared territory is disclosed through the
  relationship's `kind` and `note`, not through a manufactured number.
- **Generated ids are kebab-case**, e.g.
  `shares-territory-firstlook-mad-hati-madrid` — no `:` separators, matching
  `^[a-z0-9]+(?:-[a-z0-9]+)*$`, FAB's global id convention.
- **`active` is precisely scoped**: it means the backing relationship exists
  in the currently loaded canonical Atlas snapshot. It does not mean project
  status, a live API/pipeline connection, scientific confidence, importance,
  or validation quality. Every structurally derived edge is `active: true`
  because its backing fact currently exists; an authored, unproven edge must
  not be `active: true`.

## What this replaced

The six prior edges are gone, and no replacement edges launder a heuristic
into their place. Two of the six "misattributed" a real relationship
elsewhere in the data: `hati-derives-from-sentinel2` claimed a Sentinel-2
derivation for HATI, when the real Sentinel-2 relationship in the data belongs
to `snto` (`snto.sourceIds` includes `sentinel-2`, matching SNTO's own
Sentinel-2 NDVI observation slice from Phase 4C2A) — but Phase 4D1 does not
derive that relationship either, since `sourceIds` isn't provenance-grade.
`radar-derives-from-sentinel1` is gone entirely — Radar is `status: 'concept'`,
"not yet built," and cites no Sentinel-1 source. `fieldos-validates-snto` and
`fieldos-feeds-hati` are gone — no committed fact ever linked FieldOS to
either project. `snto-shares-guadarrama-hati` is gone and not replaced by a
correct version, because SNTO has no `territoryIds` entry at all in the
current PROJECTS dataset (only its `Observation` records reference
`sierra-de-guadarrama`; `Project.territoryIds` is the fact this contract
tests). The current committed dataset yields exactly one honest
`shares-territory` edge: `firstlook-mad` ↔ `hati-madrid`, via the shared
`Territory.id` `madrid`. FieldOS, SNTO, SNTO Alpine, Radar, and Travel CRM
currently have zero incident SIGNALS edges. This is the correct state for
data without a proven relationship, not a regression (Q2: a sparse true graph
is worth more than a dense false one).

## Honest-parts preserved

`Signal.id`/`from`/`to`/`kind`/`active`, the referential-integrity tests in
`src/test/contracts.test.ts`, `GraphNode.degree`/radius, and active/idle edge
styling in `SignalGraph.tsx` are unchanged — this phase touched only how edges
are produced and whether a numeric weight exists at all, never the generic
contract shape or the rendering seam. No changes were made to EARTH, HATI's or
SNTO's own generated data, TERRITORY, Scenario/Decision data, or
`scripts/build-projects.mjs`.

## Verification

- `src/test/signals-derivation.test.ts` — kebab-case ids with no `:`; no
  `derives-from` edge from any `sourceIds` entry (HATI/Sentinel-2, Radar/
  Sentinel-1, Radar/field-survey, FieldOS/field-survey all explicitly
  checked absent); `shares-territory` requires an exact shared `Territory.id`;
  deterministic pair canonicalisation (`from < to`) with no duplicate A/B,
  B/A edge; the old six mock edges stay absent; no `strength` field anywhere;
  every endpoint resolves; changing canonical `territoryIds` changes the
  derived output; the current dataset's exact one-edge census is pinned and
  will fail loudly if it changes.
- `src/test/signals-accessibility.test.tsx` — `SignalGraph`'s rendered
  accessible labels never contain the word "strength".
- `src/test/contracts.test.ts` — referential integrity, plus an explicit
  guard that no `Signal` ever carries a `strength` field.

To add a real relationship in the future: add it to `src/data/signals.ts`
with a `note` naming the specific committed fact that proves it (the way
HATI/SNTO provenance names a `sourceRepo`/`sourceFile`) — never as a
plausible-sounding guess, and never by widening `deriveStructuralSignals` to
infer from a field that isn't provenance-grade for the claim being made.
