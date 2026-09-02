import { describe, it, expect } from 'vitest';
import { atlas } from '../data/index';

/**
 * Referential integrity of the atlas dataset. A real dataset must pass this
 * same suite — this is how "swap mock for real" stays safe (Q4).
 */
describe('data contract — referential integrity', () => {
  const sourceIds = new Set(atlas.sources.map((s) => s.id));
  const territoryIds = new Set(atlas.territories.map((t) => t.id));
  const projectIds = new Set(atlas.projects.map((p) => p.id));
  const entityIds = new Set([...sourceIds, ...territoryIds, ...projectIds]);

  const unique = (ids: string[]) => new Set(ids).size === ids.length;

  it('has unique ids within each collection', () => {
    expect(unique(atlas.sources.map((s) => s.id))).toBe(true);
    expect(unique(atlas.territories.map((t) => t.id))).toBe(true);
    expect(unique(atlas.projects.map((p) => p.id))).toBe(true);
    expect(unique(atlas.signals.map((s) => s.id))).toBe(true);
    expect(unique(atlas.observations.map((o) => o.id))).toBe(true);
  });

  it('resolves every signal endpoint to an existing entity', () => {
    for (const s of atlas.signals) {
      expect(entityIds.has(s.from), `signal ${s.id}.from=${s.from}`).toBe(true);
      expect(entityIds.has(s.to), `signal ${s.id}.to=${s.to}`).toBe(true);
    }
  });

  it('resolves every referenced source id', () => {
    for (const t of atlas.territories)
      for (const sid of t.sourceIds ?? [])
        expect(sourceIds.has(sid), `territory ${t.id} → ${sid}`).toBe(true);
    for (const p of atlas.projects)
      for (const sid of p.sourceIds ?? [])
        expect(sourceIds.has(sid), `project ${p.id} → ${sid}`).toBe(true);
    for (const o of atlas.observations)
      expect(sourceIds.has(o.sourceId), `obs ${o.id} → ${o.sourceId}`).toBe(true);
  });

  it('resolves every referenced territory id', () => {
    for (const p of atlas.projects)
      for (const tid of p.territoryIds ?? [])
        expect(territoryIds.has(tid), `project ${p.id} → ${tid}`).toBe(true);
    for (const o of atlas.observations)
      if (o.territoryId)
        expect(territoryIds.has(o.territoryId), `obs ${o.id} → ${o.territoryId}`).toBe(true);
  });

  it('keeps defined signal strength within [0,1] (strength is optional — Phase 4D)', () => {
    for (const s of atlas.signals) {
      if (s.strength == null) continue;
      expect(s.strength).toBeGreaterThanOrEqual(0);
      expect(s.strength).toBeLessThanOrEqual(1);
    }
  });

  const EVIDENCE_STATUSES = new Set([
    'observed',
    'documented',
    'derived',
    'modelled',
    'simulated',
  ]);

  it('gives every observation a valid evidence-production status', () => {
    for (const o of atlas.observations) {
      expect(EVIDENCE_STATUSES.has(o.evidenceStatus), `obs ${o.id} status=${o.evidenceStatus}`).toBe(
        true,
      );
    }
  });

  it('resolves observation provenance.sourceId when provenance is present', () => {
    for (const o of atlas.observations) {
      if (o.provenance)
        expect(sourceIds.has(o.provenance.sourceId), `obs ${o.id} prov → ${o.provenance.sourceId}`).toBe(
          true,
        );
    }
  });

  it('keeps observation.sourceId and provenance.sourceId consistent', () => {
    // Prevents silent divergence between the legacy source channel and the
    // provenance chain (discovered in PR #7 review; enforced from 4C2A).
    for (const o of atlas.observations) {
      if (o.provenance)
        expect(o.provenance.sourceId, `obs ${o.id} sourceId vs provenance`).toBe(o.sourceId);
    }
  });
});
