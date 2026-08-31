import { describe, it, expect } from 'vitest';
import { atlas } from '../data/index';
import type { AtlasData } from '../data/types';
import { deriveFieldState } from '../adapters/fieldState';
import { projectTerritories } from '../adapters/territory';
import { buildSignalGraph } from '../adapters/signals';
import { buildEarthField } from '../adapters/earth';

describe('adapters/fieldState', () => {
  it('derives counts that match the data', () => {
    const fs = deriveFieldState(atlas);
    expect(fs.territories).toBe(atlas.territories.length);
    expect(fs.activeSignals).toBe(atlas.signals.filter((s) => s.active).length);
    expect(fs.activeProjects).toBe(
      atlas.projects.filter((p) => p.status === 'active').length,
    );
    expect(fs.experiments).toBe(
      atlas.projects.filter((p) => p.status === 'concept').length,
    );
    expect(fs.observations).toBe(atlas.observations.length);
  });

  it('computes validatedRatio in [0,1]', () => {
    const fs = deriveFieldState(atlas);
    expect(fs.validatedRatio).toBeGreaterThanOrEqual(0);
    expect(fs.validatedRatio).toBeLessThanOrEqual(1);
  });

  it('handles an empty dataset without throwing', () => {
    const empty: AtlasData = {
      sources: [],
      territories: [],
      projects: [],
      signals: [],
      observations: [],
    };
    const fs = deriveFieldState(empty);
    expect(fs.validatedRatio).toBe(0);
    expect(fs.dominantDomain).toBeNull();
  });
});

describe('adapters/territory', () => {
  it('projects all points into [0,1]', () => {
    const view = projectTerritories(atlas);
    for (const s of view.shapes) {
      expect(s.centroid.x).toBeGreaterThanOrEqual(0);
      expect(s.centroid.x).toBeLessThanOrEqual(1);
      expect(s.centroid.y).toBeGreaterThanOrEqual(0);
      expect(s.centroid.y).toBeLessThanOrEqual(1);
    }
    for (const o of view.observations) {
      expect(o.at.x).toBeGreaterThanOrEqual(0);
      expect(o.at.x).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic (same input → identical output)', () => {
    expect(projectTerritories(atlas)).toEqual(projectTerritories(atlas));
  });
});

describe('adapters/signals', () => {
  it('creates a node for every entity referenced by a signal', () => {
    const g = buildSignalGraph(atlas);
    const ids = new Set(g.nodes.map((n) => n.id));
    for (const s of atlas.signals) {
      expect(ids.has(s.from)).toBe(true);
      expect(ids.has(s.to)).toBe(true);
    }
  });

  it('places every node in [0,1] and is deterministic', () => {
    const g = buildSignalGraph(atlas);
    for (const n of g.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(1);
    }
    expect(buildSignalGraph(atlas)).toEqual(buildSignalGraph(atlas));
  });
});

describe('adapters/earth', () => {
  it('produces cols*rows cells with ndvi in [0,1]', () => {
    const f = buildEarthField(atlas, 12, 8);
    expect(f.cells.length).toBe(12 * 8);
    for (const c of f.cells) {
      expect(c.ndvi).toBeGreaterThanOrEqual(0);
      expect(c.ndvi).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic — no randomness', () => {
    expect(buildEarthField(atlas, 12, 8)).toEqual(buildEarthField(atlas, 12, 8));
  });

  it('summary ndvi range brackets the mean', () => {
    const f = buildEarthField(atlas);
    expect(f.summary.ndviMin).toBeLessThanOrEqual(f.summary.ndviMean);
    expect(f.summary.ndviMean).toBeLessThanOrEqual(f.summary.ndviMax);
  });
});
