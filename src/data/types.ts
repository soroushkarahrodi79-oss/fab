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
   * Edge weight, 0..1. OPTIONAL — present only when a committed quantity
   * grounds it (e.g. the Jaccard overlap of two projects' `territoryIds`).
   * Absent is not a fabricated default: an edge with no defined strength
   * renders at a fixed idle weight and is announced without a strength claim
   * (Phase 4D — see docs/PHASE_4D_SIGNALS.md).
   */
  strength?: number;
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
 * Raw Earth-observation raster for the EARTH module — a resampled NDVI field
 * over a territory's bounding box. This is the seam where a real Sentinel-2
 * derived grid replaces the mock provider (see docs/EARTH_REAL_DATA.md); the
 * adapter and viz consume this shape unchanged either way.
 */
export interface EarthGrid {
  source: string; // "mock-deterministic" | "sentinel-2"
  variable: 'ndvi';
  territoryId?: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  cols: number;
  rows: number;
  capturedAt: string; // ISO date of the (composite) acquisition
  cloudCover?: number; // 0..1
  nodata?: number; // sentinel value for masked cells
  values: number[]; // row-major NDVI, length cols*rows
}

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
