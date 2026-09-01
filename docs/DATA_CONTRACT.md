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

A point measurement / field record. Later fed by FieldOS or EO extraction.

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
  validated: boolean;            // field-validated?
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
  validatedRatio: number;        // validated observations / total, 0..1
  dominantDomain: Project['domains'][number] | null;
  updatedAt: string;             // max observedAt, or build time
}
```

## Referential integrity (enforced by tests)

- Every `Signal.from`/`to` resolves to an existing entity id.
- Every `*.sourceIds`/`sourceId` resolves to a `ResearchSource`.
- Every `Project.territoryIds` resolves to a `Territory`.
- Every `Observation.territoryId` (if present) resolves to a `Territory`.
- Ids are unique within each collection.

These invariants are asserted in `contracts.test.ts`; a real dataset must pass
the same suite, which is how "swap mock for real" stays safe.
