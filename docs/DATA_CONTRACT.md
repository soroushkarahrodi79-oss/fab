# DATA CONTRACT — SOROUSH // FIELD ATLAS

Preliminary schemas for the domain. These types live in `src/data/types.ts` and
are the **single source of truth**; adapters and viz depend on them, not on any
concrete dataset. Mock data in Phase 1 conforms to exactly these shapes so that
real data can replace it without touching adapters or viz.

Conventions: all ids are stable `kebab-case` slugs and are unique within their
collection. Coordinates are WGS84 `[lon, lat]` (GeoJSON order). All timestamps
are ISO-8601 UTC strings. Every entity has an optional `note` for provenance.

## ResearchSource

Where an observation or layer comes from (satellite mission, field survey, model).

```ts
interface ResearchSource {
  id: string;              // "sentinel-2"
  label: string;           // "Sentinel-2"
  kind: 'satellite' | 'field' | 'model' | 'repository' | 'sensor';
  agency?: string;         // "ESA Copernicus"
  detail?: string;         // "MSI, 10–60 m, ~5-day revisit"
  note?: string;
}
```

## Territory

A geographic research area. Geometry is GeoJSON so real GeoJSON drops in.

```ts
interface Territory {
  id: string;                    // "sierra-de-guadarrama"
  label: string;                 // "Sierra de Guadarrama"
  code?: string;                 // short instrument code, e.g. "PNSG"
  kind: 'urban' | 'protected' | 'range' | 'transition';
  centroid: [number, number];    // [lon, lat]
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon; // optional in mock
  elevationRange?: [number, number]; // metres [min, max]
  sourceIds?: string[];          // ResearchSource.id[]
  note?: string;
}
```

## Project

A body of work. Later derivable from GitHub, but the contract is source-agnostic.

```ts
interface Project {
  id: string;                    // "snto"
  label: string;                 // "SNTO"
  status: 'active' | 'dormant' | 'archived' | 'concept';
  summary: string;               // one line
  domains: Array<'tourism' | 'geospatial' | 'earth-observation'
    | 'mobility' | 'climate' | 'software' | 'field'>;
  territoryIds?: string[];       // Territory.id[]
  sourceIds?: string[];          // ResearchSource.id[]
  repoUrl?: string;              // reserved for GitHub integration
  note?: string;
}
```

## Signal

A **relationship** between two entities (project↔project, project↔territory,
project↔source). Signals are edges — SIGNALS renders these; it does not invent
them. Relationships live here, not in rendering logic.

```ts
interface Signal {
  id: string;                    // "snto-fieldos-shared-territory"
  from: string;                  // entity id (project/territory/source)
  to: string;                    // entity id
  kind: 'derives-from' | 'validates' | 'shares-territory'
    | 'feeds' | 'related';
  strength: number;              // 0..1, drives edge weight
  active: boolean;               // is the relationship currently live
  note?: string;
}
```

## Observation

A located quantitative measurement / field record. Later fed by FieldOS or EO
extraction.

An Observation carries **two independent axes** (separated in Phase 4C1 — see
`docs/PHASE_4C1_OBSERVATION_EVIDENCE.md`):

- **`evidenceStatus`** — how the value was *produced* (the same
  `EvidenceStatus` vocabulary the rest of the evidence layer uses).
- **`validated`** — whether the value has been *independently field-validated*.
  This is its ONLY meaning: not evidence quality, not scientific validity, not
  confidence, not "good/bad", not measured-vs-derived.

They are orthogonal. A Sentinel-derived NDVI may be `evidenceStatus: 'derived'`
with `validated: false` and still be entirely sound — *not yet field-validated*,
never *flagged* or *invalid*.

```ts
interface Observation {
  id: string;                    // "obs-guadarrama-ndvi-2024-06"
  at: [number, number];          // [lon, lat]
  territoryId?: string;
  sourceId: string;              // ResearchSource.id
  variable: 'ndvi' | 'land-cover' | 'temperature'
    | 'presence' | 'mobility';
  value: number;                 // normalised or physical, see unit
  unit?: string;                 // "index" | "°C" | "count" ...
  observedAt: string;            // ISO-8601
  evidenceStatus: EvidenceStatus; // production status (required)
  validated: boolean;            // field-validated? (this axis only)
  provenance?: Provenance;       // optional traceable origin; absent = missing
  note?: string;
}
```

## Derived: FieldState (NOT stored — computed by adapter)

The central core's readout. Produced by `adapters/fieldState` from the above; it
is never authored directly, guaranteeing the core reflects real structure.

```ts
interface FieldState {
  activeSignals: number;         // signals where active === true
  territories: number;           // Territory count
  activeProjects: number;        // projects where status === 'active'
  experiments: number;           // projects where status === 'concept'
  observations: number;
  validatedRatio: number;        // FIELD-validated observations / total, 0..1
  dominantDomain: Project['domains'][number] | null;
  updatedAt: string;             // max observedAt, or build time
}
```

## Evidence layer (Phase 2) — generic, project-agnostic

Added to ingest an authentic research project (first: HATI Madrid) without
project-specific fields. Names carry no project semantics; HATI's tokens
(`AVOID_PROLONGED_OUTDOOR_EXPOSURE`, `ACCESSIBILITY_CONSTRAINT`, …) live in the
DATA as opaque strings, never in the types.

### EvidenceStatus + Provenance

The scientific-honesty backbone. A boolean `validated` cannot say *how* a value
was produced, so status is its own type and every evidence object keeps a
`Provenance`.

```ts
type EvidenceStatus =
  | 'observed'    // directly measured / sensed
  | 'documented'  // authoritative record, not a measurement (e.g. OSM hours)
  | 'derived'     // deterministically computed by a rule
  | 'modelled'    // model output (e.g. SOLWEIG/UTCI), not measured
  | 'simulated';  // scenario-forced / hypothetical model run

interface Provenance {
  sourceId: string;         // resolves in the sources collection
  sourceRepo?: string;      // originating repository
  sourceFile?: string;      // file within that repo/snapshot
  sourceRef?: string;       // record ref (scenario id, OSM ref, Wikidata id …)
  temporalContext?: string; // temporal frame the evidence applies to
  fetchedAt?: string;       // ISO date the snapshot was captured
  note?: string;
}
```

### Asset / Scenario / Decision / Metric

```ts
interface Asset {                 // a located feature scenarios reason about
  id; label; category: string;    // category is a data token
  position?: [number, number]; territoryId?: string;
  attributes?: Record<string, string>; provenance: Provenance;
}
interface Scenario {              // a bounded decision context on one subject
  id; label; subjectId: string;   // Asset.id
  context?: string; summary?: string; provenance: Provenance;
}
interface Metric { key; label?; value: number | null; unit?; evidenceStatus; }
interface Decision {              // one asset's recorded outcome in a scenario
  id;                             // `${scenarioId}:${assetId}`
  scenarioId; assetId;
  role: 'subject' | 'alternative' | 'excluded';
  state: string;                  // decision token (data)
  confidence?: string;            // confidence token (data)
  constraintReason?: string;      // exclusion token when excluded (data)
  evidenceStatus: EvidenceStatus; // status of THIS decision's basis
  evidenceConfidence?: string;
  metrics?: Metric[];             // e.g. modelled UTCI; absent when not modelled
  attributes?: Record<string, string>;
  provenance: Provenance;
}
```

`AtlasData` gains optional `assets`, `scenarios`, `decisions`. FAB **consumes**
these decision outputs; it never recomputes state, confidence, ranking, UTCI, or
eligibility. `value: null` / an absent metric means genuinely missing — never a
placeholder. See `docs/PHASE_2_HATI.md` for the ingestion seam.

## Referential integrity (enforced by tests)

- Every `Signal.from`/`to` resolves to an existing entity id.
- Every `*.sourceIds`/`sourceId` resolves to a `ResearchSource`.
- Every `Project.territoryIds` resolves to a `Territory`.
- Every `Observation.territoryId` (if present) resolves to a `Territory`.
- Ids are unique within each collection.
- (Phase 2) Every `Scenario.subjectId`, `Decision.scenarioId`, `Decision.assetId`
  resolves; every `Provenance.sourceId` resolves to a `ResearchSource`; every
  `Asset.territoryId` resolves.

These invariants are asserted in `contracts.test.ts` and `hati-integrity.test.ts`;
a real dataset must pass the same suites, which is how "swap mock for real" stays
safe. `hati-honesty.test.ts` additionally fails if modelled/simulated evidence
ever loses its status label or a thermal value is invented where none is modelled.
