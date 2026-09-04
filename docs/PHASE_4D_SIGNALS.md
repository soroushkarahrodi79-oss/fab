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

## Phase 4D2 — SIGNALS UX / decision context

### Gate decision: SMALL UX PATCH

Phase 4D1 made the *data* honest — one real `shares-territory` edge, no
fabricated strength, no laundered heuristic. Phase 4D2 asked a narrower
question: was that one honest edge represented in the UI in a way a viewer
could not misread? The audit (below) found the structure was already correct
— one edge, correctly kinded, correctly kebab-cased, referentially sound —
but two concrete presentation gaps let the correct data still be
misinterpreted. Both were small, local, UI-only fixes; neither the SIGNALS
data model, the derivation function, nor any other module needed to change.
STRUCTURAL UX PATCH (cross-module linking/highlighting between SIGNALS and
TERRITORY) was considered and rejected as disproportionate: TERRITORY and
SIGNALS already render together in the same one-screen `atlas` grid (see
`src/shell/Shell.tsx`) — there is no separate route to navigate between, so
"navigation" here means naming the evidence in place, not building a link.

### Honesty audit

| Element | Claim (as rendered pre-patch) | Evidence | Classification | Action |
|---|---|---|---|---|
| Edge `kind`/`active` (`shares-territory-firstlook-mad-hati-madrid`) | `Signal: FirstLook MAD shares territory HATI Madrid, active` | `Project.territoryIds` exact match on `madrid`, referential integrity tested (`contracts.test.ts`), one-edge census pinned (`signals-derivation.test.ts`) | PROVEN | None — claim already provable; kept |
| Edge directionality (`→` arrow, `from`/`to` order) | Visually and textually implied a direction (A → B) | `shares-territory` is derived as an unordered pair (`from < to` is a canonicalisation rule for dedup, not a claim of direction) | AMBIGUOUS → risk of implying causality/precedence | Changed the scanner's `signal` readout from `A → B` to `A ↔ B`; the arrow was the one part of the UI that suggested asymmetry the data doesn't have |
| `Signal.note` (`"Shared territory: madrid"` — the actual evidence naming the shared canonical `Territory.id`) | Existed in committed data but was never rendered anywhere in the UI | Data present (`src/data/signals-derive.ts`), zero call sites read it before this patch | UNSUPPORTED — not a false claim, but the one thing that would let a viewer verify *why* the edge exists was silently dropped | `note` is now threaded through `GraphEdge` (`src/adapters/signals.ts`) into both the edge's `aria-label` and its scanner `evidence` row (`src/viz/SignalGraph.tsx`) |
| The bare relationship kind, `shares-territory` | Rendered only as `"shares territory"` — technically accurate but the kind name alone does not rule out the readings STEP 2 lists (causal, methodological, collaboration, corroboration, etc.) | `shares-territory`'s semantic contract (this doc, `src/data/types.ts`) explicitly bounds it to exact `Territory.id` match, nothing more | DERIVED BUT HONEST, under-explained | Added a `KIND_CLAIM` bounded-meaning string in `SignalGraph.tsx`, read into the edge's label: "...territorial reference only — not a collaboration, methodology, data, or lineage link" |
| TERRITORY module (Madrid polygon) | Shows label, code, kind, observation count — never which projects reference it | `projectTerritories` (`src/adapters/territory.ts`) does not read `Project.territoryIds` at all | Out of scope for this gate — see Remaining risks | Not changed. TERRITORY's own "which projects reference Madrid" gap is real but is a TERRITORY-side omission, not a SIGNALS overclaim; fixing it would mean adding a projects-per-territory feature to TERRITORY, which STEP 4 explicitly asks to avoid unless the SIGNALS relationship itself cannot otherwise be understood. It can: the edge's own evidence line now names "madrid" directly, without depending on TERRITORY. |
| Node `aria-label`s (`project HATI Madrid, 1 signals`), `SignalGraph`'s outer group label | Generic, count-based, no relationship-kind wording | Node degree is a real count (`buildSignalGraph`) | PROVEN | None |
| `SignalGraph`'s stroke width, node radius | Fixed values (Phase 4D1); radius scales only with `degree`, a real count | No numeric weight derived or displayed | PROVEN | None |

### Changes

- `src/adapters/signals.ts` — `GraphEdge` gained an optional `note` field,
  passed through unchanged from `Signal.note` in `buildSignalGraph`. No new
  data, no new derivation — the field already existed on `Signal` and was
  simply not forwarded to the view model.
- `src/viz/SignalGraph.tsx`:
  - Added `KIND_CLAIM`, a small `Record<string, string>` naming the exact,
    bounded meaning of `shares-territory` (the only kind any committed edge
    currently uses) and an `edgeClaim` helper that falls back to the old
    generic phrasing for any future kind that doesn't yet have bounded
    wording — so an edge is never left with *no* claim, only a less specific
    one until its own microcopy is written.
  - The edge's `aria-label` and scanner `evidence` now read: relationship
    claim (bounded meaning) + `Evidence: <note>` (the exact shared
    territory) + active/planned state — all three, always, for every edge.
  - The scanner's `signal` readout changed from `A → B` to `A ↔ B` — the only
    edge kind in production is symmetric, and an arrow read as directionality
    the data never asserted.
- `src/test/signals-accessibility.test.tsx` — two new tests (below).
- Nothing else changed: no data files, no derivation logic, no other module,
  no dependency, no build script.

### What deliberately did not change

- `deriveStructuralSignals` and `src/data/signals.ts` — the derivation logic
  and its purity contract are untouched; this phase only changed how an
  already-correct edge is *read*, never what counts as evidence for one.
- `Signal.note`'s own text (`"Shared territory: madrid"`, raw canonical
  `Territory.id`, not a display label) — left as the precise technical
  identifier being matched rather than swapped for the human-facing
  `Territory.label` ("Madrid"). `deriveStructuralSignals` only receives
  `Project`, not `Territory`, by design (a smaller, more testable surface);
  resolving to a display label would need territory data threaded into a
  function whose whole point is to stay a pure, narrow function of projects.
  The raw id is still unambiguous evidence.
- TERRITORY's Madrid view — not given a "projects referencing this
  territory" list. See Remaining risks.
- `SignalKind` values `derives-from`, `validates`, `feeds`, `related` — still
  declared in the type, still unused by any committed edge, still without
  bounded microcopy in `KIND_CLAIM`. Not exercised by any current data, so
  not in scope; the next author adding a real edge of one of these kinds must
  add its bounded meaning to `KIND_CLAIM` before it renders, per Phase 4D1's
  standing rule that a new edge needs a `note` naming its specific backing
  fact.

### Evidence supporting the relation

`firstlook-mad.territoryIds = ['madrid']`,
`hati-madrid.territoryIds = ['madrid']` (both in
`src/data/projects.generated.json`); `Territory.id = 'madrid'`
(`src/data/territories.ts`) exists in the canonical TERRITORY collection.
The edge's `note`, `"Shared territory: madrid"`, names exactly this fact and
is now rendered wherever the edge is.

### Tests

- `src/test/signals-accessibility.test.tsx`:
  - *names the canonical shared territory in the edge's accessible label* —
    fails if `note` is ever dropped from the rendered label again.
  - *never implies a stronger relationship than a territorial reference* —
    fails if an affirmative (non-negated) causal/collaborative/corroborative
    claim appears in any edge label, and asserts the bounded-meaning
    disclaimer is present on the `shares-territory` edge specifically.
- Existing `signals-derivation.test.ts`, `contracts.test.ts`,
  `adapters.test.ts` (signals) all still pass unmodified — this phase did not
  touch the data contract they guard.
- Full validation run: `npm run typecheck`, `npm run lint`, `npm run test`
  (143 passed), `npm run build` — all clean.

### Known limitations

- TERRITORY does not yet list which projects reference a given territory (a
  user can confirm the fact from PROJECTS/SIGNALS, just not from clicking the
  Madrid polygon itself). Real gap, deliberately deferred — see Next gate.
- The bounded-meaning microcopy (`KIND_CLAIM`) only covers `shares-territory`
  because that is the only kind any committed edge uses; it is not a
  general-purpose translation table yet.
- `Signal.note` remains free text, not a structured evidence reference
  (e.g. a `territoryId` field the UI could resolve/link on its own). This was
  judged unnecessary complexity for one honest edge; revisit if/when a second
  distinct evidence kind is ever added.

### Next gate

If a TERRITORY-side "projects referencing this territory" view is wanted, run
it as its own honesty-gated micro-phase (Phase 4D3): the claim to prove is
narrow ("Territory X is referenced by Project.territoryIds ⊇ {X}" — already
provable, same data, no new contract), and it should be evaluated with the
same STOP GATE discipline as this phase before any code is written. Do not
bundle it with the next EARTH, SCENARIO, or decision-engine work — SIGNALS'
own honesty gate is closed as of this phase.
