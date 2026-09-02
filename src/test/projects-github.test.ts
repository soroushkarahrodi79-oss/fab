import { describe, it, expect } from 'vitest';
import { projects } from '../data/projects';
import { deriveStructuralSignals } from '../data/signals-derive';
import type { ProjectDomain } from '../data/types';

/**
 * Guards the mock→real PROJECTS swap. Projects are now derived from real GitHub
 * repositories; this asserts the data is genuinely repo-backed and that the ids
 * SIGNALS structurally derives shares-territory edges from survived the swap
 * (so no viz changes were needed and referential integrity holds). Since
 * Phase 4D, SIGNALS derives from PROJECTS rather than the reverse — see
 * docs/PHASE_4D_SIGNALS.md.
 */
const VALID_DOMAINS: ProjectDomain[] = [
  'tourism',
  'geospatial',
  'earth-observation',
  'mobility',
  'climate',
  'software',
  'field',
];

describe('PROJECTS derived from real GitHub repos', () => {
  it('every project links to a real repository URL', () => {
    for (const p of projects) {
      expect(p.repoUrl, p.id).toMatch(
        /^https:\/\/github\.com\/soroushkarahrodi79-oss\/[\w.-]+$/,
      );
    }
  });

  it('preserves the project ids SIGNALS structurally derives from', () => {
    const ids = new Set(projects.map((p) => p.id));
    // The four conceptual projects the original vertical slice was built
    // around must still exist under the same ids after the GitHub swap.
    for (const id of ['snto', 'fieldos', 'hati-madrid', 'radar']) {
      expect(ids.has(id), `project ${id} missing after swap`).toBe(true);
    }
    // PROJECTS data must still support SIGNALS having something to derive —
    // every derived edge's project endpoint must resolve to a real project.
    const derived = deriveStructuralSignals({ projects });
    expect(derived.length).toBeGreaterThan(0);
    for (const s of derived) {
      expect(ids.has(s.from), `signal ${s.id}.from=${s.from}`).toBe(true);
    }
  });

  it('assigns valid statuses and non-empty domains', () => {
    for (const p of projects) {
      expect(['active', 'dormant', 'archived', 'concept']).toContain(p.status);
      expect(p.domains.length, p.id).toBeGreaterThan(0);
      for (const d of p.domains) expect(VALID_DOMAINS).toContain(d);
    }
  });

  it('reflects real repositories, not the four hand-authored mocks', () => {
    // The real dataset includes repos beyond the original four conceptual ones.
    expect(projects.length).toBeGreaterThan(4);
    expect(projects.some((p) => p.id === 'firstlook-mad')).toBe(true);
  });
});
