import { describe, it, expect } from 'vitest';
import { atlas } from '../data/index';

/**
 * Referential integrity for the HATI evidence layer inside the whole atlas.
 * Scenario → subject asset, decision → scenario, decision → asset, and every
 * provenance sourceId must resolve. This is how the evidence layer stays safe
 * to swap/refresh, exactly like the Phase 1 contract test.
 */
describe('HATI evidence — referential integrity', () => {
  const assetIds = new Set((atlas.assets ?? []).map((a) => a.id));
  const scenarioIds = new Set((atlas.scenarios ?? []).map((s) => s.id));
  const sourceIds = new Set(atlas.sources.map((s) => s.id));
  const territoryIds = new Set(atlas.territories.map((t) => t.id));

  it('resolves every scenario subject to a real asset', () => {
    for (const s of atlas.scenarios ?? [])
      expect(assetIds.has(s.subjectId), `scenario ${s.id} → asset ${s.subjectId}`).toBe(true);
  });

  it('resolves every decision scenario + asset reference', () => {
    for (const d of atlas.decisions ?? []) {
      expect(scenarioIds.has(d.scenarioId), `decision ${d.id} → scenario`).toBe(true);
      expect(assetIds.has(d.assetId), `decision ${d.id} → asset`).toBe(true);
    }
  });

  it('resolves every provenance sourceId to a ResearchSource', () => {
    const all = [...(atlas.assets ?? []), ...(atlas.scenarios ?? []), ...(atlas.decisions ?? [])];
    for (const o of all)
      expect(sourceIds.has(o.provenance.sourceId), `${o.id} → ${o.provenance.sourceId}`).toBe(true);
  });

  it('resolves every asset territory reference', () => {
    for (const a of atlas.assets ?? [])
      if (a.territoryId) expect(territoryIds.has(a.territoryId), `asset ${a.id}`).toBe(true);
  });

  it('gives every scenario exactly one subject and at least one candidate decision', () => {
    for (const s of atlas.scenarios ?? []) {
      const rows = (atlas.decisions ?? []).filter((d) => d.scenarioId === s.id);
      expect(rows.filter((d) => d.role === 'subject')).toHaveLength(1);
      expect(rows.filter((d) => d.role !== 'subject').length).toBeGreaterThan(0);
    }
  });
});
