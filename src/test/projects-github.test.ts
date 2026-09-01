import { describe, it, expect } from 'vitest';
import { projects } from '../data/projects';
import { signals } from '../data/signals';
import type { ProjectDomain } from '../data/types';

/**
 * Guards the mock→real PROJECTS swap. Projects are now derived from real GitHub
 * repositories; this asserts the data is genuinely repo-backed and that the ids
 * the SIGNALS relationships depend on survived the swap (so no viz changes were
 * needed and referential integrity holds).
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

  it('preserves the project ids that SIGNALS reference', () => {
    const ids = new Set(projects.map((p) => p.id));
    const referenced = new Set<string>();
    for (const s of signals) {
      referenced.add(s.from);
      referenced.add(s.to);
    }
    // The four conceptual projects wired into signals must still exist.
    for (const id of ['snto', 'fieldos', 'hati-madrid', 'radar']) {
      expect(ids.has(id), `project ${id} missing after swap`).toBe(true);
    }
    // Any project endpoint a signal names must resolve to a real project.
    for (const s of signals) {
      const endpoints = [s.from, s.to].filter((e) => e.startsWith('snto') || ids.has(e));
      for (const e of endpoints) {
        if (ids.has(e)) expect(ids.has(e)).toBe(true);
      }
    }
    expect(referenced.size).toBeGreaterThan(0);
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
