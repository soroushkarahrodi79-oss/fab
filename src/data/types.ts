/**
 * FIELD ATLAS — domain data contract.
 * Single source of truth for domain shapes. Adapters and viz depend on these
 * types, never on concrete datasets. See docs/DATA_CONTRACT.md.
 *
 * Coordinates are WGS84 [lon, lat] (GeoJSON order). Timestamps are ISO-8601 UTC.
 */
import type { Polygon, MultiPolygon } from 'geojson';

export type LonLat = [number, number];

export interface ResearchSource {
  id: string;
  label: string;
  kind: 'satellite' | 'field' | 'model' | 'repository' | 'sensor';
  agency?: string;
  detail?: string;
  note?: string;
}

export interface Territory {
  id: string;
  label: string;
  code?: string;
  kind: 'urban' | 'protected' | 'range' | 'transition';
  centroid: LonLat;
  geometry?: Polygon | MultiPolygon;
  elevationRange?: [number, number];
  sourceIds?: string[];
  note?: string;
}

export type ProjectDomain =
  | 'tourism'
  | 'geospatial'
  | 'earth-observation'
  | 'mobility'
  | 'climate'
  | 'software'
  | 'field';

export interface Project {
  id: string;
  label: string;
  status: 'active' | 'dormant' | 'archived' | 'concept';
  summary: string;
  domains: ProjectDomain[];
  territoryIds?: string[];
  sourceIds?: string[];
  repoUrl?: string;
  note?: string;
}

export type SignalKind =
  | 'derives-from'
  | 'validates'
  | 'shares-territory'
  | 'feeds'
  | 'related';

export interface Signal {
  id: string;
  from: string;
  to: string;
  kind: SignalKind;
  /**
   * The backing relationship exists in the currently loaded canonical Atlas
   * snapshot. Nothing more: NOT project status, NOT a live API/pipeline
   * connection, NOT scientific confidence, NOT importance, NOT validation
   * quality. A structurally derived edge is `true` because its backing
   * canonical fact currently exists; an authored, unproven edge must not be
   * `true` (Phase 4D1 — see docs/PHASE_4D_SIGNALS.md).
   */
  active: boolean;
  note?: string;
}

export type ObservationVariable =
  | 'ndvi'
  | 'land-cover'
  | 'temperature'
  | 'presence'
  | 'mobility';

/**
 * A located quantitative measurement. Carries TWO independent axes that must
 * never be conflated (they were, before Phase 4C1 — a bare `validated` boolean
 * was read as a generic trust state):
 *
 *  1. Evidence PRODUCTION status — `evidenceStatus` — how the value was made
 *     (observed / documented / derived / modelled / simulated). This is the
 *     scientific-honesty channel shared with the rest of the evidence layer.
 *  2. Field-VALIDATION state — `validated` — whether the value has been
 *     independently confirmed in the field. It means ONLY that. It is NOT
 *     evidence quality, scientific validity, confidence, "good/bad", nor
 *     measured-vs-derived.
 *
 * The axes are orthogonal: a Sentinel-derived NDVI may be
 * `evidenceStatus: 'derived'` with `validated: false` and still be entirely
 * sound — "not yet field-validated", never "flagged" or "invalid".
 */
export interface Observation {
  id: string;
  at: LonLat;
  territoryId?: string;
  sourceId: string;
  variable: ObservationVariable;
  value: number;
  unit?: string;
  observedAt: string;
  /** How this value was produced (production status). Required. */
  evidenceStatus: EvidenceStatus;
  /**
   * Whether this observation has been independently field-validated. `false`
   * means "not field-validated / field validation pending or unavailable" —
   * never "bad", "flagged", or scientifically invalid.
   */
  validated: boolean;
  /** Optional traceable origin. Absent means missing — never faked. */
  provenance?: Provenance;
  note?: string;
}

/**
 * Fields shared by every EarthGrid, independent of provider (Phase 5A).
 *
 * There is deliberately NO single `capturedAt` (a composite spans a window,
 * `compositeStart`/`compositeEnd`) and NO top-level `cloudCover` (ambiguous
 * across a masked multi-scene composite — real support is the per-cell
 * `validFraction`). `nodata` is required so missing EO support is never
 * silently read as a valid NDVI of 0.
 */
export interface EarthGridBase {
  variable: 'ndvi';
  territoryId?: string;
  /** Target grid extent in the target CRS. [minLon, minLat, maxLon, maxLat]. */
  bbox: [number, number, number, number];
  /** CRS of bbox / output grid. */
  crs: string;
  cols: number;
  rows: number;
  /** Spatial resampling from the native composite into this coarse grid. */
  resampling: 'average';
  /** Temporal support of the composite (a window, never one acquisition date). */
  compositeStart: string;
  compositeEnd: string;
  /** Sentinel value representing no valid EO support. Required — never faked. */
  nodata: number;
  /** Row-major NDVI values, length cols*rows. Masked cells hold `nodata`. */
  values: number[];
  /**
   * Optional row-major fraction 0..1 of valid native pixels contributing to
   * each output cell. Absent on a mock grid (no native pixels).
   */
  validFraction?: number[];
}

/**
 * Provenance for a MOCK grid. It carries ONLY what actually happened: a
 * provider tag, a collection label, and a generation date. It has NO
 * band/mask/composite/itemId fields — the mock processed no Sentinel-2
 * reflectance, so naming that pipeline (even as a "target shape") would be a
 * type-level falsehood. The union makes those fields unreachable on a mock grid.
 */
export interface MockEarthGridProvenance {
  provider: 'mock';
  collection: 'mock-deterministic-ndvi';
  /** Snapshot generation date; NOT an acquisition date. */
  generatedAt: string;
  note?: string;
}

/**
 * Provenance for a real Sentinel-2 grid — exact, pinnable upstream identity.
 * `itemIds` and the band/mask/composite fields are REQUIRED: a real NDVI field
 * that cannot name its exact source products is not acceptable.
 */
export interface Sentinel2EarthGridProvenance {
  provider: 'copernicus-data-space' | 'earth-search' | 'planetary-computer';
  collection: string;
  /** Exact upstream scene/item/product identifiers. Required — never invented. */
  itemIds: string[];
  /** Upstream processing baseline/version when available. */
  processingBaseline?: string;
  bands: {
    red: 'B04';
    nir: 'B08';
    mask: 'SCL';
  };
  temporalComposite: 'median';
  /** SCL classes excluded before NDVI compositing. */
  sclExcluded: number[];
  /** How native/composite pixels become EarthGrid cells. */
  spatialAggregation: 'average';
  /** Snapshot generation date; NOT an acquisition date. */
  generatedAt: string;
  attribution: string;
  note?: string;
}

export type EarthGridProvenance =
  | MockEarthGridProvenance
  | Sentinel2EarthGridProvenance;

/**
 * A deterministic mock NDVI field. `source`/`evidenceStatus` are pinned literals
 * so a mock grid can NEVER compile as `derived`, and its provenance can carry no
 * Sentinel-2 pipeline claims.
 */
export interface MockEarthGrid extends EarthGridBase {
  source: 'mock-deterministic';
  evidenceStatus: 'simulated';
  provenance: MockEarthGridProvenance;
}

/**
 * A real Sentinel-2 L2A-derived NDVI field. `source`/`evidenceStatus` are pinned
 * literals so a real grid can NEVER compile as `simulated`, and its provenance
 * REQUIRES exact `itemIds` plus the band/mask/composite fields.
 */
export interface Sentinel2EarthGrid extends EarthGridBase {
  source: 'sentinel-2';
  evidenceStatus: 'derived';
  provenance: Sentinel2EarthGridProvenance;
}

/**
 * Raw Earth-observation raster for the EARTH module — a discriminated union so
 * the type system itself enforces evidence honesty (Phase 5A). This is the seam
 * where a real Sentinel-2 grid replaces the mock provider
 * (see docs/EARTH_REAL_DATA.md); the adapter and viz consume either arm
 * unchanged.
 */
export type EarthGrid = MockEarthGrid | Sentinel2EarthGrid;

/**
 * Scientific status of a piece of evidence. Generic across research projects:
 * it is the honesty backbone — a modelled or simulated value must never be
 * relabelled as if it were measured. A plain boolean (`validated`) cannot carry
 * this distinction, which is why it is its own type.
 *
 * - `observed`   — directly measured / sensed (a field instrument reading).
 * - `documented` — from an authoritative record or registry, not a physical
 *                  measurement (e.g. opening hours from OpenStreetMap).
 * - `derived`    — deterministically computed from other evidence by a rule.
 * - `modelled`   — output of a physical/statistical model, not measured.
 * - `simulated`  — a scenario-forced / hypothetical model run (e.g. a decision
 *                  tested under a forcing envelope).
 */
export type EvidenceStatus =
  | 'observed'
  | 'documented'
  | 'derived'
  | 'modelled'
  | 'simulated';

/**
 * Traceable origin of an evidence object. Every imported evidence entity keeps
 * one so provenance never becomes implicit. Fields are optional because
 * "missing means missing" — an absent field is never faked.
 */
export interface Provenance {
  sourceId: string; // ResearchSource.id — resolves in the sources collection
  sourceRepo?: string; // originating repository (e.g. "heat-adaptive-tourism-madrid")
  sourceFile?: string; // file within that repo/snapshot
  sourceRef?: string; // record ref within the file (scenario id, OSM ref, Wikidata id …)
  temporalContext?: string; // temporal frame the evidence applies to (may differ from now)
  fetchedAt?: string; // ISO date the snapshot was captured
  note?: string;
}

/**
 * A single named measurement/attribute carrying its own scientific status, so a
 * modelled number is never mistaken for a measured one. `value: null` means the
 * quantity is genuinely not available/not modelled — never a placeholder zero.
 */
export interface Metric {
  key: string; // machine key, e.g. "utci"
  label?: string;
  value: number | null;
  unit?: string;
  evidenceStatus: EvidenceStatus;
}

/**
 * A located real-world feature of interest that scenarios reason about.
 * Project-specific semantics (which categories exist, what attributes mean)
 * live in the string `category`/`attributes` DATA, never in this type.
 */
export interface Asset {
  id: string;
  label: string;
  category: string; // project-defined token (data)
  position?: LonLat;
  territoryId?: string;
  attributes?: Record<string, string>; // project-specific descriptive fields
  provenance: Provenance;
}

/**
 * A bounded decision/analysis context centred on one subject asset. Generic:
 * any research project can frame scenarios. `context` holds project parameters
 * (a timestamp, a radius) as opaque text — no decision logic lives here.
 */
export interface Scenario {
  id: string;
  label: string;
  subjectId: string; // Asset.id the scenario is centred on
  context?: string; // e.g. "15:00 · radius 800 m"
  summary?: string;
  provenance: Provenance;
}

/**
 * A recorded outcome for one asset within one scenario. FAB *consumes* these —
 * it never recomputes state, confidence or the constraint. All project decision
 * vocabulary (`state`, `confidence`, `constraintReason`) is opaque string DATA.
 */
export interface Decision {
  id: string; // stable: `${scenarioId}:${assetId}`
  scenarioId: string;
  assetId: string;
  role: 'subject' | 'alternative' | 'excluded';
  state: string; // decision token, e.g. "AVOID_PROLONGED_OUTDOOR_EXPOSURE"
  confidence?: string; // confidence token, e.g. "BOUNDARY"
  constraintReason?: string; // exclusion/constraint token, present when excluded
  evidenceStatus: EvidenceStatus; // scientific status of THIS decision's basis
  evidenceConfidence?: string; // supporting-evidence confidence token
  metrics?: Metric[]; // e.g. the UTCI the decision rests on (modelled)
  attributes?: Record<string, string>; // distance, walk time, experience type …
  provenance: Provenance;
}

/** Derived — never authored directly. Produced by adapters/fieldState. */
export interface FieldState {
  activeSignals: number;
  territories: number;
  activeProjects: number;
  experiments: number;
  observations: number;
  validatedRatio: number; // 0..1
  dominantDomain: ProjectDomain | null;
  updatedAt: string;
}

/** The whole atlas dataset — what adapters consume. */
export interface AtlasData {
  sources: ResearchSource[];
  territories: Territory[];
  projects: Project[];
  signals: Signal[];
  observations: Observation[];
  /**
   * Evidence-layer collections (added in Phase 2). Optional so a project may
   * carry none; when present they are ingested from a real research project via
   * a deterministic build-time transform and satisfy the same integrity rules.
   */
  assets?: Asset[];
  scenarios?: Scenario[];
  decisions?: Decision[];
}
