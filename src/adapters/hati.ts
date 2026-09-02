import type { AtlasData, Asset, Decision, EvidenceStatus, LonLat, Scenario } from '../data/types';
import type { EvidenceGroup, EvidenceRow } from '../interaction/FieldContext';

/**
 * HATI adapter — turns the evidence layer (Asset / Scenario / Decision) into a
 * finished view model for the SCENARIO viz. Pure and deterministic.
 *
 * IMPORTANT: no HATI decision logic is recomputed here. State, confidence and
 * exclusion tokens pass through verbatim; the maps below only *translate* those
 * locked tokens into human copy. They are transcribed from HATI's own
 * presentation layer (heat-adaptive-tourism-madrid app/constants.py), which
 * states they "never decide anything" — this is display metadata, not science.
 */

const DECISION_STATE_LABEL: Record<string, string> = {
  AVOID_PROLONGED_OUTDOOR_EXPOSURE: 'Avoid prolonged outdoor exposure',
  INDOOR_REFUGE: 'Indoor refuge',
};
const CONFIDENCE_LABEL: Record<string, string> = {
  ROBUST: 'Robust',
  BOUNDARY: 'Boundary',
  UNSTABLE: 'Unstable',
  INDOOR_BYPASS: 'Indoor bypass',
};
const EXCLUSION_LABEL: Record<string, string> = {
  CLOSED_AT_TIMESTAMP: 'Closed at this time (documented hours)',
  ACCESSIBILITY_CONSTRAINT: 'Outside the straight-line search radius',
  THERMAL_LIMIT_EXCEEDED: 'Modelled heat stress exceeds tolerable limit',
  INSUFFICIENT_EVIDENCE: 'Not enough reliable data to decide',
  NO_MEANINGFUL_THERMAL_IMPROVEMENT: 'Not meaningfully cooler than the source',
  OUTDOOR_EXPOSURE_TOO_HIGH: 'Another hot outdoor location',
};
const EXPERIENCE_LABEL: Record<string, string> = {
  green_outdoor: 'Green outdoor space',
  indoor_cultural: 'Indoor cultural',
  indoor_green_refuge: 'Indoor green refuge',
  outdoor_monument: 'Outdoor monument',
  shaded_outdoor: 'Shaded outdoor',
  transit_refuge: 'Transit refuge',
};
/** Generic (FAB-owned) plain labels for the scientific-status channel. */
const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  observed: 'Observed (measured in the field)',
  documented: 'Documented (authoritative record, not measured)',
  derived: 'Derived (rule-based, not measured)',
  modelled: 'Modelled (SOLWEIG/UTCI, not field-measured)',
  simulated: 'Simulated (decision flips under the tested forcing envelope)',
};
/**
 * Indoor-refuge decisions are `derived`: a rule applied to documented
 * indoor/opening-hours evidence, with the thermal state explicitly not modelled.
 * Spell that out so the scanner never implies a measured indoor temperature.
 */
const INDOOR_DERIVED_LABEL =
  'Derived — rule-based from documented indoor/opening-hours evidence; ' +
  'indoor thermal not physically modelled';

/**
 * HATI's own scenario-level recommendation token (a pre-existing scenario
 * OUTPUT, not FAB advice). Only these two values occur in the data.
 */
const RECOMMENDATION_LABEL: Record<string, string> = {
  ALTERNATIVES_FOUND: 'Alternatives found',
  NO_DEFENSIBLE_ALTERNATIVE: 'No defensible alternative',
};
/** decision-basis thermal state token → human copy (display only, HATI's token). */
const THERMAL_STATE_LABEL: Record<string, string> = {
  VERY_STRONG_HEAT_STRESS: 'Very strong heat stress',
  STRONG_HEAT_STRESS: 'Strong heat stress',
  MODERATE_HEAT_STRESS: 'Moderate heat stress',
  INDOOR_NOT_MODELLED: 'Indoor — not modelled',
};

export const decisionStateLabel = (t: string) => DECISION_STATE_LABEL[t] ?? t;
export const recommendationLabel = (t?: string) =>
  t ? (RECOMMENDATION_LABEL[t] ?? t) : undefined;
export const confidenceLabel = (t?: string) => (t ? (CONFIDENCE_LABEL[t] ?? t) : undefined);
export const exclusionLabel = (t?: string) => (t ? (EXCLUSION_LABEL[t] ?? t) : undefined);
export const experienceLabel = (t?: string) => (t ? (EXPERIENCE_LABEL[t] ?? t) : undefined);
export const evidenceStatusLabel = (s: EvidenceStatus) => EVIDENCE_STATUS_LABEL[s];

export interface ScenarioNode {
  decisionId: string;
  assetId: string;
  label: string;
  category: string;
  indoorOutdoor: string;
  role: Decision['role'];
  state: string;
  stateLabel: string;
  confidence?: string;
  confidenceLabel?: string;
  constraintReason?: string;
  constraintLabel?: string;
  evidenceStatus: EvidenceStatus;
  evidenceStatusLabel: string;
  evidenceConfidence?: string;
  utci: number | null;
  experienceType?: string;
  experienceLabel?: string;
  distanceM: number | null;
  walkMin: number | null;
  position?: LonLat;
  coord?: string;
  sourceLabel: string;
  /** Traceable evidence + provenance for this exact decision (claim→evidence→
   * source→limitation), composed from existing Decision/Asset/Scenario fields. */
  evidence: EvidenceGroup[];
  x: number; // 0..1 layout position
  y: number; // 0..1 layout position
}

export interface ScenarioView {
  id: string;
  label: string;
  context?: string;
  summary?: string;
  subject: ScenarioNode;
  alternatives: ScenarioNode[];
  excluded: ScenarioNode[];
  counts: { alternatives: number; excluded: number };
}

/**
 * The FIELD SCANNER readout for a scenario node — a structural payload (no
 * dependency on the interaction layer). Shared by the abstract SCENARIO field
 * and the geographic TERRITORY view so a decision reports the SAME identity in
 * both, keyed by the stable decision id.
 */
export interface ScenarioNodeScan {
  elementId: string;
  module: 'scenario';
  coord?: string;
  asset?: string;
  scenario?: string;
  decision?: string;
  status?: string;
  source?: string;
  evidence?: string;
  detail?: EvidenceGroup[];
}

export function scenarioNodeScan(
  view: { id: string; label: string },
  n: ScenarioNode,
): ScenarioNodeScan {
  const status =
    n.role === 'excluded'
      ? `Excluded — ${n.constraintLabel ?? n.constraintReason ?? 'constraint'}`
      : n.role === 'subject'
        ? 'Source · heat-exposed'
        : 'Alternative';
  return {
    elementId: n.decisionId,
    module: 'scenario',
    coord: n.coord,
    asset: `${n.label} · ${n.category}`,
    scenario: `${view.id} · ${view.label}`,
    decision: `${n.stateLabel}${n.confidenceLabel ? ` · ${n.confidenceLabel}` : ''}`,
    status,
    source: n.sourceLabel,
    evidence: `${n.evidenceStatusLabel}${n.utci != null ? ` · UTCI ${n.utci}°C` : ''}`,
    detail: n.evidence,
  };
}

export interface ScenarioListItem {
  id: string;
  label: string;
  context?: string;
  subjectState: string;
  counts: { alternatives: number; excluded: number };
}

function fmtCoord([lon, lat]: LonLat): string {
  const ns = `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? 'N' : 'S'}`;
  const ew = `${Math.abs(lon).toFixed(4)} ${lon >= 0 ? 'E' : 'W'}`;
  return `${ns}  ${ew}`;
}

const SOURCE_LABEL: Record<string, string> = {
  'solweig-utci': 'SOLWEIG / UTCI',
  openstreetmap: 'OpenStreetMap (ODbL)',
  'hati-madrid-repo': 'HATI Madrid',
};

/** Pull the existing Wikidata Q-id out of the asset's evidence string, verbatim. */
function extractWikidata(s?: string): string | undefined {
  const m = s?.match(/Wikidata:(Q\d+)/i);
  return m ? m[1] : undefined;
}

/**
 * Compose the traceable evidence + provenance for ONE decision:
 * claim (decision) → evidence (thermal, access) → source (provenance) → limitation.
 *
 * Reads ONLY existing Decision / Asset / Scenario fields. It recomputes no
 * science: no UTCI, no accessibility, no ranking, no scoring, no composite
 * confidence. Missing evidence is stated explicitly ("Not modelled",
 * "Unavailable", "Missing source metadata") — never faked. HATI's own scenario
 * recommendation is passed through, clearly tagged as a pre-existing HATI output.
 */
export function buildDecisionEvidence(
  d: Decision,
  asset: Asset | undefined,
  scenario: Scenario | undefined,
): EvidenceGroup[] {
  const attr = d.attributes ?? {};
  const aattr = asset?.attributes ?? {};
  const prov = d.provenance;
  const groups: EvidenceGroup[] = [];

  const roleLabel =
    d.role === 'subject'
      ? 'Source (heat-exposed)'
      : d.role === 'excluded'
        ? 'Excluded candidate'
        : 'Alternative';

  // 1) DECISION — the claim being made.
  const decisionRows: EvidenceRow[] = [
    { k: 'State', v: decisionStateLabel(d.state) },
    { k: 'Role', v: roleLabel },
  ];
  if (d.confidence) decisionRows.push({ k: 'Confidence', v: confidenceLabel(d.confidence)! });
  if (d.role === 'excluded' && d.constraintReason)
    decisionRows.push({ k: 'Excluded because', v: exclusionLabel(d.constraintReason) ?? d.constraintReason });
  decisionRows.push({ k: 'Evidence basis', v: evidenceStatusLabel(d.evidenceStatus), status: d.evidenceStatus });
  if (d.evidenceConfidence) decisionRows.push({ k: 'Evidence confidence', v: d.evidenceConfidence });
  groups.push({ label: 'DECISION', rows: decisionRows });

  // 2) THERMAL — the thermal evidence the decision rests on (or its honest absence).
  const utciMetric = d.metrics?.find((m) => m.key === 'utci');
  const thermalRows: EvidenceRow[] = [];
  if (attr.thermal_state === 'INDOOR_NOT_MODELLED') {
    thermalRows.push({ k: 'UTCI', v: 'Not modelled (indoor)', status: 'not modelled' });
    thermalRows.push({ k: 'Thermal state', v: 'Indoor — not modelled' });
    thermalRows.push({
      k: 'Limitation',
      v: 'Indoor thermal environment not physically modelled; the refuge decision is derived from documented indoor / opening-hours evidence.',
    });
  } else {
    if (utciMetric && utciMetric.value != null) {
      thermalRows.push({
        k: 'UTCI',
        v: `${utciMetric.value} ${utciMetric.unit ?? '°C'}`,
        status: utciMetric.evidenceStatus,
      });
    } else {
      thermalRows.push({ k: 'UTCI', v: 'Unavailable', status: 'unavailable' });
    }
    if (attr.thermal_state)
      thermalRows.push({ k: 'Thermal state', v: THERMAL_STATE_LABEL[attr.thermal_state] ?? attr.thermal_state });
    thermalRows.push({
      k: 'Limitation',
      v:
        d.evidenceStatus === 'simulated'
          ? 'Simulated — scenario-forced model run; the decision flips under the tested forcing envelope. Not field-measured.'
          : 'Modelled (SOLWEIG / UTCI) — not field-measured.',
    });
  }
  if (prov.temporalContext) thermalRows.push({ k: 'Timestamp', v: prov.temporalContext });
  groups.push({ label: 'THERMAL', rows: thermalRows });

  // 3) ACCESS — the accessibility evidence (straight-line, never routed).
  const accessRows: EvidenceRow[] = [];
  if (asset?.position) accessRows.push({ k: 'Coordinate', v: fmtCoord(asset.position) });
  if (d.role === 'subject') {
    accessRows.push({ k: 'Access', v: 'Scenario origin (source asset)' });
  } else {
    accessRows.push(
      attr.distance_m
        ? { k: 'Distance', v: `${Math.round(Number(attr.distance_m))} m`, status: 'straight-line' }
        : { k: 'Distance', v: 'Unavailable', status: 'unavailable' },
    );
    if (attr.walk_min) accessRows.push({ k: 'Walk estimate', v: `~${attr.walk_min} min` });
    if (attr.experience_type)
      accessRows.push({ k: 'Experience', v: experienceLabel(attr.experience_type) ?? attr.experience_type });
    accessRows.push({
      k: 'Limitation',
      v: 'Straight-line distance and a derived walk estimate — not a routed walking path.',
    });
  }
  groups.push({ label: 'ACCESS', rows: accessRows });

  // 4) SOURCE — provenance identifiers, verbatim.
  const provRows: EvidenceRow[] = [{ k: 'Source', v: SOURCE_LABEL[prov.sourceId] ?? prov.sourceId }];
  if (prov.sourceRepo) provRows.push({ k: 'Dataset', v: prov.sourceRepo });
  if (prov.sourceFile) provRows.push({ k: 'File', v: prov.sourceFile });
  if (prov.sourceRef) provRows.push({ k: 'Record', v: prov.sourceRef });
  if (asset?.provenance?.sourceRef)
    provRows.push({ k: 'OSM', v: asset.provenance.sourceRef, status: 'documented' });
  const wikidata = extractWikidata(aattr.tourism_relevance_evidence);
  provRows.push(
    wikidata
      ? { k: 'Wikidata', v: wikidata, status: 'documented' }
      : { k: 'Wikidata', v: 'Missing source metadata', status: 'missing' },
  );
  if (aattr.opening_hours) provRows.push({ k: 'Opening hours', v: aattr.opening_hours, status: 'documented' });
  if (aattr.evidence_completeness) provRows.push({ k: 'Asset evidence', v: aattr.evidence_completeness });
  if (prov.fetchedAt) provRows.push({ k: 'Fetched', v: prov.fetchedAt });
  if (asset?.provenance?.note) provRows.push({ k: 'Note', v: asset.provenance.note });
  groups.push({ label: 'SOURCE', rows: provRows });

  // 5) SCENARIO OUTCOME — HATI's own pre-existing scenario output (never FAB advice).
  const outRows: EvidenceRow[] = [];
  if (attr.recommendation)
    outRows.push({
      k: 'HATI recommendation',
      v: recommendationLabel(attr.recommendation) ?? attr.recommendation,
      status: 'HATI output',
    });
  if (attr.n_alternatives != null) outRows.push({ k: 'Alternatives', v: attr.n_alternatives });
  if (scenario?.summary) outRows.push({ k: 'Scenario note', v: scenario.summary, status: 'HATI output' });
  if (outRows.length) groups.push({ label: 'SCENARIO OUTCOME', rows: outRows });

  return groups;
}

function nodeFrom(
  d: Decision,
  asset: Asset | undefined,
  x: number,
  y: number,
  scenario: Scenario | undefined,
): ScenarioNode {
  const attr = d.attributes ?? {};
  const utci = d.metrics?.find((m) => m.key === 'utci')?.value ?? null;
  const indoorNotModelled = attr.thermal_state === 'INDOOR_NOT_MODELLED';
  const evLabel =
    d.evidenceStatus === 'derived' && indoorNotModelled
      ? INDOOR_DERIVED_LABEL
      : evidenceStatusLabel(d.evidenceStatus);
  return {
    decisionId: d.id,
    assetId: d.assetId,
    label: asset?.label ?? d.assetId,
    category: asset?.category ?? attr.category ?? '',
    indoorOutdoor: attr.indoor_outdoor ?? asset?.attributes?.indoor_outdoor ?? '',
    role: d.role,
    state: d.state,
    stateLabel: decisionStateLabel(d.state),
    confidence: d.confidence,
    confidenceLabel: confidenceLabel(d.confidence),
    constraintReason: d.constraintReason,
    constraintLabel: exclusionLabel(d.constraintReason),
    evidenceStatus: d.evidenceStatus,
    evidenceStatusLabel: evLabel,
    evidenceConfidence: d.evidenceConfidence,
    utci,
    experienceType: attr.experience_type || undefined,
    experienceLabel: experienceLabel(attr.experience_type || undefined),
    distanceM: attr.distance_m ? Number(attr.distance_m) : null,
    walkMin: attr.walk_min ? Number(attr.walk_min) : null,
    position: asset?.position,
    coord: asset?.position ? fmtCoord(asset.position) : undefined,
    sourceLabel: SOURCE_LABEL[d.provenance.sourceId] ?? d.provenance.sourceId,
    evidence: buildDecisionEvidence(d, asset, scenario),
    x,
    y,
  };
}

/**
 * Spatial layout of a scenario's candidates around its subject. Positions come
 * from REAL geometry: bearing from the subject to each candidate, radius scaled
 * by straight-line distance. This encodes access geography — it is not a ranking
 * (HATI forbids ranking). Deterministic: a pure function of the coordinates.
 */
function layout(subjectPos: LonLat | undefined, candPos: LonLat | undefined, i: number, n: number, maxDist: number, distM: number | null): { x: number; y: number } {
  if (!subjectPos || !candPos) {
    // No geometry → stable ring position by index (never random).
    const theta = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
    return { x: 0.5 + 0.36 * Math.cos(theta), y: 0.5 + 0.36 * Math.sin(theta) };
  }
  const [slon, slat] = subjectPos;
  const [clon, clat] = candPos;
  // local equirectangular bearing (small AOI; central Madrid)
  const dx = (clon - slon) * Math.cos((slat * Math.PI) / 180);
  const dy = clat - slat;
  const bearing = Math.atan2(dx, dy); // 0 = north
  const frac = maxDist > 0 && distM != null ? distM / maxDist : (i + 1) / (n + 1);
  const r = 0.14 + 0.32 * Math.min(1, frac);
  // screen y grows downward → invert north
  return { x: 0.5 + r * Math.sin(bearing), y: 0.5 - r * Math.cos(bearing) };
}

export function listScenarios(data: AtlasData): ScenarioListItem[] {
  const scenarios = data.scenarios ?? [];
  const decisions = data.decisions ?? [];
  return scenarios.map((s) => {
    const rows = decisions.filter((d) => d.scenarioId === s.id);
    const subject = rows.find((d) => d.role === 'subject');
    return {
      id: s.id,
      label: s.label,
      context: s.context,
      subjectState: subject ? decisionStateLabel(subject.state) : '',
      counts: {
        alternatives: rows.filter((d) => d.role === 'alternative').length,
        excluded: rows.filter((d) => d.role === 'excluded').length,
      },
    };
  });
}

/** Build the finished view model for one scenario, or null if unknown. */
export function buildScenarioView(data: AtlasData, scenarioId: string): ScenarioView | null {
  const scenario = (data.scenarios ?? []).find((s) => s.id === scenarioId);
  if (!scenario) return null;
  const assetById = new Map((data.assets ?? []).map((a) => [a.id, a]));
  const rows = (data.decisions ?? []).filter((d) => d.scenarioId === scenarioId);

  const subjectDecision =
    rows.find((d) => d.role === 'subject') ??
    // defensive: synthesise nothing — a scenario must have a subject
    rows[0];
  const subjectAsset = assetById.get(scenario.subjectId);
  const subject = nodeFrom(subjectDecision, subjectAsset, 0.5, 0.5, scenario);

  const candidates = rows.filter((d) => d.role !== 'subject');
  const maxDist = candidates.reduce((m, d) => {
    const v = d.attributes?.distance_m ? Number(d.attributes.distance_m) : 0;
    return Math.max(m, Number.isFinite(v) ? v : 0);
  }, 0);

  const nodes = candidates.map((d, i) => {
    const asset = assetById.get(d.assetId);
    const distM = d.attributes?.distance_m ? Number(d.attributes.distance_m) : null;
    const p = layout(subjectAsset?.position, asset?.position, i, candidates.length, maxDist, distM);
    return nodeFrom(d, asset, p.x, p.y, scenario);
  });

  return {
    id: scenario.id,
    label: scenario.label,
    context: scenario.context,
    summary: scenario.summary,
    subject,
    alternatives: nodes.filter((n) => n.role === 'alternative'),
    excluded: nodes.filter((n) => n.role === 'excluded'),
    counts: {
      alternatives: nodes.filter((n) => n.role === 'alternative').length,
      excluded: nodes.filter((n) => n.role === 'excluded').length,
    },
  };
}
