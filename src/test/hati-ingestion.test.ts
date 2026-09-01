import { describe, it, expect } from 'vitest';
// The transform under test is the exact code the build script runs. CSV
// snapshots are imported as raw strings (bundler-native, no filesystem access),
// so the test exercises the same parse → transform path as the build.
import { parseCsv, buildHati } from '../../scripts/hati-transform.mjs';
import assetCatalogRaw from '../data/hati/phase3_asset_catalog.snapshot.csv?raw';
import scenariosSummaryRaw from '../data/hati/phase3_scenarios_summary.snapshot.csv?raw';
import scenariosRaw from '../data/hati/phase3_scenarios.snapshot.csv?raw';
import generated from '../data/hati.generated.json';

/**
 * Guards the raw-HATI → FAB-contract ingestion seam: the transform is
 * deterministic, its output matches the committed dataset, ids are stable, and
 * provenance is preserved. This is the Phase 2 equivalent of the mock→real
 * swap guards used for TERRITORY and PROJECTS.
 */
const raw = {
  assetCatalog: parseCsv(assetCatalogRaw),
  scenariosSummary: parseCsv(scenariosSummaryRaw),
  scenarios: parseCsv(scenariosRaw),
};

describe('HATI ingestion — deterministic transform', () => {
  it('is a pure function: two runs produce identical output', () => {
    const a = buildHati(raw);
    const b = buildHati(raw);
    expect(a).toEqual(b);
    // byte-identical serialisation (what the build writes)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('matches the committed generated dataset (build output is up to date)', () => {
    const fresh = buildHati(raw);
    expect(fresh).toEqual(generated);
  });

  it('ingests the real slice: 8 scenarios, referenced assets, per-candidate decisions', () => {
    expect(generated.scenarios).toHaveLength(8);
    expect(generated.assets.length).toBeGreaterThan(0);
    // subject + candidate decisions for every scenario
    expect(generated.decisions.length).toBeGreaterThan(generated.scenarios.length);
    for (const s of generated.scenarios) {
      const subj = generated.decisions.filter((d) => d.scenarioId === s.id && d.role === 'subject');
      expect(subj, `scenario ${s.id} subject`).toHaveLength(1);
    }
  });
});

describe('HATI ingestion — stable ids', () => {
  it('has unique, stable ids within each collection', () => {
    const uniq = (a: string[]) => new Set(a).size === a.length;
    expect(uniq(generated.assets.map((a) => a.id))).toBe(true);
    expect(uniq(generated.scenarios.map((s) => s.id))).toBe(true);
    expect(uniq(generated.decisions.map((d) => d.id))).toBe(true);
    // decision id is the documented `${scenarioId}:${assetId}` composite
    for (const d of generated.decisions) expect(d.id).toBe(`${d.scenarioId}:${d.assetId}`);
  });
});

describe('HATI ingestion — provenance preserved', () => {
  it('every evidence object carries a traceable HATI provenance', () => {
    const objs = [...generated.assets, ...generated.scenarios, ...generated.decisions];
    for (const o of objs) {
      expect(o.provenance, o.id).toBeTruthy();
      expect(o.provenance.sourceRepo).toBe('heat-adaptive-tourism-madrid');
      expect(o.provenance.sourceFile).toMatch(/^data\/processed\/phase3_.*\.csv$/);
      expect(o.provenance.sourceId).toBeTruthy();
    }
  });

  it('preserves real OSM/Wikidata references on assets', () => {
    const prado = generated.assets.find((a) => a.id === 'A01');
    expect(prado?.provenance.sourceRef).toMatch(/OpenStreetMap/);
    expect(prado?.attributes?.tourism_relevance_evidence).toMatch(/Wikidata:Q\d+/);
  });

  it('anchors every scenario to the 2023-08-21 historical episode', () => {
    for (const s of generated.scenarios)
      expect(s.provenance.temporalContext).toMatch(/^2023-08-21/);
  });
});
