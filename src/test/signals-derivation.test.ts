import { describe, it, expect } from 'vitest';
import { atlas, projects } from '../data/index';
import { deriveStructuralSignals } from '../data/signals-derive';
import type { Project } from '../data/types';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const OLD_MOCK_IDS = [
  'fieldos-validates-snto',
  'snto-shares-guadarrama-hati',
  'hati-derives-from-sentinel2',
  'radar-derives-from-sentinel1',
  'radar-feeds-hati',
  'fieldos-feeds-hati',
];

const mockProject = (id: string, territoryIds?: string[]): Project => ({
  id,
  label: id,
  status: 'active',
  summary: '',
  domains: [],
  territoryIds,
});

/**
 * Phase 4D1 — SIGNALS honesty patch. Every derived edge must be a pure
 * function of already-tested Project fields (so it can never drift from its
 * source), match FAB's kebab-case id convention, and never overstate what
 * `Project.sourceIds` proves — see docs/PHASE_4D_SIGNALS.md.
 */
describe('signals — structural derivation (Phase 4D1)', () => {
  it('produces only kebab-case ids, never containing ":"', () => {
    const derived = deriveStructuralSignals({ projects });
    expect(derived.length).toBeGreaterThan(0);
    for (const s of derived) {
      expect(s.id).toMatch(KEBAB_CASE);
      expect(s.id).not.toContain(':');
    }
  });

  it('never derives a derives-from edge from Project.sourceIds', () => {
    const derived = deriveStructuralSignals({ projects });
    expect(derived.some((s) => s.kind === 'derives-from')).toBe(false);
  });

  it('derives shares-territory only when the two projects share an exact Territory.id', () => {
    const derived = deriveStructuralSignals({ projects }).filter(
      (s) => s.kind === 'shares-territory',
    );
    expect(derived.length).toBeGreaterThan(0);
    for (const s of derived) {
      const from = projects.find((p) => p.id === s.from);
      const to = projects.find((p) => p.id === s.to);
      const shared = (from?.territoryIds ?? []).filter((t) => (to?.territoryIds ?? []).includes(t));
      expect(shared.length).toBeGreaterThan(0);
    }
  });

  it('orders every pair deterministically (from < to) and never emits a duplicate A/B, B/A edge', () => {
    const derived = deriveStructuralSignals({ projects });
    const seen = new Set<string>();
    for (const s of derived) {
      expect(s.from < s.to, `${s.id}: from should sort before to`).toBe(true);
      const unordered = [s.from, s.to].sort().join('|');
      expect(seen.has(unordered), `duplicate pair ${unordered}`).toBe(false);
      seen.add(unordered);
    }
  });

  it('never invents a derives-from edge from metadata-inferred sourceIds', () => {
    const derived = deriveStructuralSignals({ projects });
    const has = (from: string, to: string) =>
      derived.some((s) => s.kind === 'derives-from' && s.from === from && s.to === to);
    // HATI/Sentinel-2 and Radar/Sentinel-1 were the two prior misattributed
    // edges; Radar/field-survey and FieldOS/field-survey were both mechanical
    // keyword matches in build-projects.mjs, not verified provenance.
    expect(has('hati-madrid', 'sentinel-2')).toBe(false);
    expect(has('radar', 'sentinel-1')).toBe(false);
    expect(has('radar', 'field-survey')).toBe(false);
    expect(has('fieldos', 'field-survey')).toBe(false);
  });

  it('never invents a FieldOS validates SNTO edge', () => {
    const derived = deriveStructuralSignals({ projects });
    expect(
      derived.some(
        (s) =>
          s.kind === 'validates' &&
          ((s.from === 'fieldos' && s.to === 'snto') || (s.from === 'snto' && s.to === 'fieldos')),
      ),
    ).toBe(false);
  });

  it('the old six hand-authored mock edges remain absent from the atlas', () => {
    for (const id of OLD_MOCK_IDS) {
      expect(atlas.signals.find((s) => s.id === id), id).toBeUndefined();
    }
  });

  it('carries no strength field on Signal', () => {
    for (const s of atlas.signals) {
      expect('strength' in s, `signal ${s.id} carries strength`).toBe(false);
    }
  });

  it('every endpoint resolves to a real project id', () => {
    const projectIds = new Set(projects.map((p) => p.id));
    for (const s of deriveStructuralSignals({ projects })) {
      expect(projectIds.has(s.from), `${s.id}.from=${s.from}`).toBe(true);
      expect(projectIds.has(s.to), `${s.id}.to=${s.to}`).toBe(true);
    }
  });

  it('is deterministic (same input → identical output)', () => {
    expect(deriveStructuralSignals({ projects })).toEqual(deriveStructuralSignals({ projects }));
  });

  it('the atlas includes every derived edge, unmodified', () => {
    for (const d of deriveStructuralSignals({ projects })) {
      expect(atlas.signals.find((s) => s.id === d.id)).toEqual(d);
    }
  });

  it('changing canonical territoryIds automatically changes derived edges', () => {
    const noOverlap = deriveStructuralSignals({
      projects: [mockProject('a', ['x']), mockProject('b', ['y'])],
    });
    expect(noOverlap).toHaveLength(0);

    const withOverlap = deriveStructuralSignals({
      projects: [mockProject('a', ['x']), mockProject('b', ['x'])],
    });
    expect(withOverlap).toHaveLength(1);
    expect(withOverlap[0]).toMatchObject({
      id: 'shares-territory-a-b',
      from: 'a',
      to: 'b',
      kind: 'shares-territory',
      active: true,
    });
  });

  it('aggregates multiple shared territories into exactly one edge per pair', () => {
    const derived = deriveStructuralSignals({
      projects: [mockProject('alpha', ['x', 'y']), mockProject('beta', ['x', 'y'])],
    });
    expect(derived).toHaveLength(1);
    expect(derived[0].note).toContain('x');
    expect(derived[0].note).toContain('y');
  });

  it('current committed dataset yields exactly the firstlook-mad/hati-madrid edge (report if this ever changes)', () => {
    const derived = deriveStructuralSignals({ projects });
    expect(derived).toHaveLength(1);
    expect(derived[0]).toMatchObject({
      id: 'shares-territory-firstlook-mad-hati-madrid',
      from: 'firstlook-mad',
      to: 'hati-madrid',
      kind: 'shares-territory',
      active: true,
    });
  });
});
