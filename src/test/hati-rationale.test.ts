import { describe, it, expect } from 'vitest';
import { parseCsv, buildHati } from '../../scripts/hati-transform.mjs';
import assetCatalogRaw from '../data/hati/phase3_asset_catalog.snapshot.csv?raw';
import scenariosSummaryRaw from '../data/hati/phase3_scenarios_summary.snapshot.csv?raw';
import scenariosRaw from '../data/hati/phase3_scenarios.snapshot.csv?raw';
import generated from '../data/hati.generated.json';
import { atlas } from '../data/index';
import { buildDecisionEvidence } from '../adapters/hati';

/**
 * Phase 3D — HATI's upstream `improvement_note` (candidate-decision rationale)
 * is carried through the transform LOSSLESSLY: verbatim pass-through, present on
 * exactly the upstream non-empty set, never on subjects, and adding it mutates
 * no pre-existing generated value. Durable integrity rule for the FIRST
 * intentional generated-contract extension.
 */

const clean = (s?: string) => (s ?? '').trim();

const raw = {
  assetCatalog: parseCsv(assetCatalogRaw),
  scenariosSummary: parseCsv(scenariosSummaryRaw),
  scenarios: parseCsv(scenariosRaw),
};

// upstream candidate rows keyed by the stable ${scenario}:${candidate_id} id
const rawByDecisionId = new Map(
  raw.scenarios.map((r: Record<string, string>) => [`${clean(r.scenario)}:${clean(r.candidate_id)}`, r]),
);

const candidateDecisions = generated.decisions.filter((d) => d.role !== 'subject');
const subjectDecisions = generated.decisions.filter((d) => d.role === 'subject');

// the attribute keys that existed on candidate decisions BEFORE Phase 3D
const PRE3D_CANDIDATE_ATTR_KEYS = [
  'indoor_outdoor',
  'thermal_state',
  'experience_type',
  'distance_m',
  'walk_min',
].sort();

describe('Phase 3D A — verbatim pass-through', () => {
  it('every candidate decision improvement_note === clean(upstream cell) for its exact id', () => {
    for (const d of candidateDecisions) {
      const row = rawByDecisionId.get(d.id);
      expect(row, `no upstream row for ${d.id}`).toBeTruthy();
      expect(d.attributes?.improvement_note, d.id).toBe(clean(row!.improvement_note));
    }
  });

  it('applies no transformation beyond clean(): no reformatting of the rule string', () => {
    // spot-check a real inequality trace is byte-for-byte identical to source
    const s1a14 = candidateDecisions.find((d) => d.id === 'S1:A14');
    expect(s1a14?.attributes?.improvement_note).toBe(
      clean(rawByDecisionId.get('S1:A14')!.improvement_note),
    );
    expect(s1a14?.attributes?.improvement_note).toMatch(/UTCI .* <= source .* - 0\.8/); // unparsed, as authored
  });
});

describe('Phase 3D B — population equivalence (computed from the snapshot, not hardcoded)', () => {
  it('the non-empty generated set exactly equals the non-empty upstream set', () => {
    const upstreamNonEmpty = new Set(
      raw.scenarios
        .filter((r: Record<string, string>) => clean(r.improvement_note) !== '')
        .map((r: Record<string, string>) => `${clean(r.scenario)}:${clean(r.candidate_id)}`),
    );
    const generatedNonEmpty = new Set(
      candidateDecisions.filter((d) => (d.attributes?.improvement_note ?? '') !== '').map((d) => d.id),
    );
    expect(generatedNonEmpty).toEqual(upstreamNonEmpty);
    // report the actual count the current snapshot yields (audit expected 71)
    expect(generatedNonEmpty.size).toBe(upstreamNonEmpty.size);
    expect(generatedNonEmpty.size).toBe(71);
  });
});

describe('Phase 3D C — subject exclusion', () => {
  it('no subject decision carries improvement_note (upstream has no such column)', () => {
    for (const d of subjectDecisions) {
      expect('improvement_note' in (d.attributes ?? {}), d.id).toBe(false);
    }
  });
});

describe('Phase 3D D — no-mutation guard (additive lossless pass-through only)', () => {
  it('candidate attributes = the exact pre-3D key set PLUS improvement_note', () => {
    for (const d of candidateDecisions) {
      const keys = Object.keys(d.attributes ?? {}).sort();
      expect(keys, d.id).toEqual([...PRE3D_CANDIDATE_ATTR_KEYS, 'improvement_note'].sort());
    }
  });

  it('removing improvement_note reproduces every pre-existing value verbatim from source', () => {
    for (const d of candidateDecisions) {
      const row = rawByDecisionId.get(d.id)!;
      const { improvement_note, ...pre3d } = (d.attributes ?? {}) as unknown as Record<string, string>;
      void improvement_note; // conceptually removed
      // every remaining attribute equals what the pre-3D transform produced
      expect(pre3d, d.id).toEqual({
        indoor_outdoor: clean(row.indoor_outdoor),
        thermal_state: clean(row.cand_thermal_state),
        experience_type: clean(row.experience_type),
        distance_m: clean(row.distance_m),
        walk_min: clean(row.walk_min),
      });
    }
  });

  it('stripping improvement_note from the whole generated dataset changes nothing else', () => {
    // Rebuild from source, delete the new key, and confirm the rest is intact —
    // proving the ONLY generated change is the added attribute.
    const fresh = buildHati(raw);
    expect(fresh).toEqual(generated); // determinism: committed output is current
    const stripped = structuredClone(generated);
    for (const d of stripped.decisions) {
      if (d.attributes) delete (d.attributes as unknown as Record<string, string>).improvement_note;
    }
    // every decision still has its full non-attribute identity + provenance intact
    for (let i = 0; i < stripped.decisions.length; i++) {
      const s = stripped.decisions[i];
      const g = generated.decisions[i];
      expect(s.id).toBe(g.id);
      expect(s.role).toBe(g.role);
      expect(s.state).toBe(g.state);
      expect(s.provenance).toEqual(g.provenance);
      expect(s.metrics).toEqual(g.metrics);
    }
  });
});

describe('Phase 3D E — UI: verbatim rationale in the existing DECISION group', () => {
  const aById = new Map((atlas.assets ?? []).map((a) => [a.id, a]));
  const sById = new Map((atlas.scenarios ?? []).map((s) => [s.id, s]));
  const dById = new Map((atlas.decisions ?? []).map((d) => [d.id, d]));
  const decisionRow = (id: string, k: string) => {
    const d = dById.get(id)!;
    const groups = buildDecisionEvidence(d, aById.get(d.assetId), sById.get(d.scenarioId));
    return groups.find((g) => g.label === 'DECISION')!.rows.find((r) => r.k === k);
  };

  it.each([
    ['S1:A01', 'indoor refuge vs outdoor source (categorical)'],
    ['S1:A14', 'UTCI 40.5 <= source 45.0 - 0.8'],
    ['S1:A18', 'confidence gain (ROBUST vs boundary/unstable source), not hotter'],
  ])('%s shows the rationale VERBATIM, tagged HATI (not evidence)', (id, expected) => {
    const row = decisionRow(id, 'Decision basis');
    expect(row).toBeTruthy();
    expect(row!.v).toBe(expected); // exact upstream string, no parsing/reformatting
    expect(row!.v).toBe(dById.get(id)!.attributes!.improvement_note); // === generated value
    expect(row!.status).toBe('HATI rationale'); // rationale, never an evidence-status tag
  });

  it('renders NO Decision-basis row when the note is empty (excluded candidate)', () => {
    expect(dById.get('S1:A02')!.attributes!.improvement_note).toBe(''); // honest absence upstream
    expect(decisionRow('S1:A02', 'Decision basis')).toBeUndefined();
  });

  it('renders NO Decision-basis row for a subject decision', () => {
    expect(decisionRow('S1:A16', 'Decision basis')).toBeUndefined();
  });

  it('keeps rationale distinct from evidence: Evidence basis still carries the status token', () => {
    const ev = decisionRow('S1:A14', 'Evidence basis');
    expect(ev!.status).toBe('modelled'); // evidence row unchanged, not conflated with rationale
  });
});
