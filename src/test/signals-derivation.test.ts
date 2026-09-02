import { describe, it, expect } from 'vitest';
import { atlas, projects } from '../data/index';
import { deriveStructuralSignals } from '../data/signals-derive';

/**
 * Phase 4D — SIGNALS honesty. Every derived edge must be a pure function of
 * already-tested Project fields, so it can never drift from its source (see
 * docs/PHASE_4D_SIGNALS.md).
 */
describe('signals — structural derivation', () => {
  it('is deterministic (same input → identical output)', () => {
    expect(deriveStructuralSignals({ projects })).toEqual(deriveStructuralSignals({ projects }));
  });

  it('derives every derives-from edge from a real, non-trivial Project.sourceIds entry', () => {
    const derived = deriveStructuralSignals({ projects }).filter((s) => s.kind === 'derives-from');
    expect(derived.length).toBeGreaterThan(0);
    for (const s of derived) {
      const p = projects.find((proj) => proj.id === s.from);
      expect(p?.sourceIds ?? []).toContain(s.to);
      expect(s.to).not.toBe('github'); // trivial — every project cites it
    }
  });

  it('derives every shares-territory edge from two projects with an overlapping Territory.id, weighted by real overlap', () => {
    const derived = deriveStructuralSignals({ projects }).filter(
      (s) => s.kind === 'shares-territory',
    );
    expect(derived.length).toBeGreaterThan(0);
    for (const s of derived) {
      const from = projects.find((p) => p.id === s.from);
      const to = projects.find((p) => p.id === s.to);
      const shared = (from?.territoryIds ?? []).filter((t) => (to?.territoryIds ?? []).includes(t));
      expect(shared.length).toBeGreaterThan(0);
      expect(s.strength).toBeGreaterThan(0);
      expect(s.strength).toBeLessThanOrEqual(1);
    }
  });

  it('never derives feeds or validates edges — no structural fact backs those kinds', () => {
    const kinds = new Set(deriveStructuralSignals({ projects }).map((s) => s.kind));
    expect(kinds.has('feeds')).toBe(false);
    expect(kinds.has('validates')).toBe(false);
  });

  it('the atlas includes every derived edge, unmodified', () => {
    for (const d of deriveStructuralSignals({ projects })) {
      expect(atlas.signals.find((s) => s.id === d.id)).toEqual(d);
    }
  });
});
