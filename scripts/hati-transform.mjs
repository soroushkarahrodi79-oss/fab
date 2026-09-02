/**
 * Deterministic transform: raw HATI Madrid decision-layer CSVs → FAB contract
 * objects (Asset / Scenario / Decision). PURE — a function of its inputs only,
 * so the build output is byte-identical on every run. Shared by
 * scripts/build-hati.mjs (writes the committed JSON) and the ingestion test
 * (asserts determinism + provenance). No decision logic is recomputed here;
 * HATI's own state/confidence/exclusion tokens pass through untouched.
 */

const HATI_REPO = 'heat-adaptive-tourism-madrid';
const STUDY_DATE = '2023-08-21';
const CAPTURED = '2026-09-01';
const ASSET_FETCHED = '2026-08-17';

/** Minimal RFC-4180 CSV parser: quotes, escaped quotes, commas, CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // ignore; \n handles the row break
    } else field += c;
  }
  // trailing field/row (file without final newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift();
  return rows
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const num = (s) => {
  if (s === undefined || s === null || s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const clean = (s) => (s ?? '').trim();
const S = (n) => Number(String(n).replace(/^S/, '')); // "S1" → 1 (natural sort)

/**
 * Scientific status of a decision, from HATI's own markers — never invented:
 *  - indoor asset (thermal not physically modelled) → the INDOOR_REFUGE
 *    decision is a RULE applied to documented indoor/opening-hours evidence,
 *    so the decision itself is `derived` (the underlying OSM evidence is
 *    documented; the thermal environment is explicitly not modelled).
 *  - outdoor, decision flips under the tested solar envelope (UNSTABLE) →
 *    scenario-forced model run                    → `simulated`
 *  - outdoor, otherwise                            → modelled thermal (UTCI)
 */
function evidenceStatusFor(thermalState, confidence) {
  if (thermalState === 'INDOOR_NOT_MODELLED') return 'derived';
  if (confidence === 'UNSTABLE') return 'simulated';
  return 'modelled';
}

/**
 * The source that backs a decision's evidence: the documented OSM record for
 * indoor (rule-based) decisions, the SOLWEIG/UTCI model for outdoor thermal
 * decisions. Chosen by the thermal basis, not by the status label.
 */
function basisSource(thermalState) {
  return thermalState === 'INDOOR_NOT_MODELLED' ? 'openstreetmap' : 'solweig-utci';
}

function utciMetric(value, evidenceStatus) {
  if (value === null) return undefined; // missing means missing — never faked
  return [{ key: 'utci', label: 'UTCI', value, unit: '°C', evidenceStatus }];
}

/**
 * @param {{assetCatalog: object[], scenariosSummary: object[], scenarios: object[]}} raw
 * @returns {{assets: object[], scenarios: object[], decisions: object[]}}
 */
export function buildHati(raw) {
  const decisions = [];
  const referenced = new Set();

  // ── subject decisions (one per scenario) from the summary ────────────────
  const scenarios = raw.scenariosSummary.map((r) => {
    const sid = clean(r.scenario);
    const subjectId = clean(r.source_id);
    referenced.add(subjectId);
    const ts = clean(r.timestamp);
    const status = evidenceStatusFor(clean(r.source_thermal_state), clean(r.source_decision_confidence));
    decisions.push({
      id: `${sid}:${subjectId}`,
      scenarioId: sid,
      assetId: subjectId,
      role: 'subject',
      state: clean(r.source_decision_state),
      confidence: clean(r.source_decision_confidence) || undefined,
      evidenceStatus: status,
      metrics: utciMetric(num(r.source_utci), status),
      attributes: {
        indoor_outdoor: clean(r.source_indoor_outdoor),
        open: clean(r.source_open),
        thermal_state: clean(r.source_thermal_state),
        recommendation: clean(r.recommendation),
        scenario_class: clean(r.scenario_class),
        n_alternatives: clean(r.n_candidate_alternatives),
      },
      provenance: {
        sourceId: basisSource(clean(r.source_thermal_state)),
        sourceRepo: HATI_REPO,
        sourceFile: 'data/processed/phase3_scenarios_summary.csv',
        sourceRef: sid,
        temporalContext: `${STUDY_DATE} ${ts}`,
        fetchedAt: CAPTURED,
      },
    });
    return {
      id: sid,
      label: clean(r.source_name),
      subjectId,
      context: `${ts} · radius ${clean(r.access_radius_m)} m`,
      summary: clean(r.scenario_desc),
      provenance: {
        sourceId: 'hati-madrid-repo',
        sourceRepo: HATI_REPO,
        sourceFile: 'data/processed/phase3_scenarios_summary.csv',
        sourceRef: sid,
        temporalContext: `${STUDY_DATE} ${ts}`,
        fetchedAt: CAPTURED,
      },
    };
  });

  // ── candidate decisions (scenario × candidate) ───────────────────────────
  for (const r of raw.scenarios) {
    const sid = clean(r.scenario);
    const assetId = clean(r.candidate_id);
    referenced.add(assetId);
    const excluded = clean(r.status) === 'EXCLUDED';
    const thermal = clean(r.cand_thermal_state);
    const confidence = clean(r.cand_decision_confidence);
    const status = evidenceStatusFor(thermal, confidence);
    decisions.push({
      id: `${sid}:${assetId}`,
      scenarioId: sid,
      assetId,
      role: excluded ? 'excluded' : 'alternative',
      state: clean(r.cand_decision_state),
      confidence: confidence || undefined,
      constraintReason: excluded ? clean(r.exclusion_reason) || undefined : undefined,
      evidenceStatus: status,
      evidenceConfidence: clean(r.cand_evidence_confidence) || undefined,
      metrics: utciMetric(num(r.cand_utci), status),
      attributes: {
        indoor_outdoor: clean(r.indoor_outdoor),
        thermal_state: thermal,
        experience_type: clean(r.experience_type),
        distance_m: clean(r.distance_m),
        walk_min: clean(r.walk_min),
        // HATI's own decision-rationale trace (candidate rows only): the rule
        // derivation HATI applied to reach this candidate's state. Passed
        // through VERBATIM (trim only) — FAB never parses, recomputes, or
        // reinterprets it. Subject rows have no such upstream column.
        improvement_note: clean(r.improvement_note),
      },
      provenance: {
        sourceId: basisSource(thermal),
        sourceRepo: HATI_REPO,
        sourceFile: 'data/processed/phase3_scenarios.csv',
        sourceRef: `${sid}:${assetId}`,
        temporalContext: `${STUDY_DATE} ${clean(r.timestamp)}`,
        fetchedAt: CAPTURED,
      },
    });
  }

  // ── assets referenced by the slice, from the catalog ─────────────────────
  const assets = raw.assetCatalog
    .filter((r) => referenced.has(clean(r.asset_id)))
    .map((r) => ({
      id: clean(r.asset_id),
      label: clean(r.name),
      category: clean(r.tourism_category),
      position: [num(r.longitude), num(r.latitude)],
      territoryId: 'madrid',
      attributes: {
        indoor_outdoor: clean(r.indoor_outdoor),
        opening_hours: clean(r.opening_hours),
        evidence_completeness: clean(r.evidence_completeness),
        tourism_relevance_evidence: clean(r.tourism_relevance_evidence),
      },
      provenance: {
        sourceId: 'openstreetmap',
        sourceRepo: HATI_REPO,
        sourceFile: 'data/processed/phase3_asset_catalog.csv',
        sourceRef: clean(r.asset_source),
        temporalContext: STUDY_DATE,
        fetchedAt: ASSET_FETCHED,
        note:
          'Location & tags from OSM; opening hours are 2026-documented values ' +
          'applied to the 2023 study date.',
      },
    }));

  // ── deterministic ordering ───────────────────────────────────────────────
  const roleOrder = { subject: 0, alternative: 1, excluded: 2 };
  assets.sort((a, b) => a.id.localeCompare(b.id));
  scenarios.sort((a, b) => S(a.id) - S(b.id));
  decisions.sort(
    (a, b) =>
      S(a.scenarioId) - S(b.scenarioId) ||
      roleOrder[a.role] - roleOrder[b.role] ||
      a.assetId.localeCompare(b.assetId),
  );

  return { assets, scenarios, decisions };
}
