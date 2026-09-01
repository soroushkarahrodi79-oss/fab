import { describe, it, expect } from 'vitest';
import { atlas } from '../data/index';
import type { Decision } from '../data/types';

/**
 * Scientific-honesty guards. These fail if modelled/simulated evidence ever
 * loses its status label, or if a thermal value is invented where HATI models
 * none. FAB must not launder modelled HATI outputs into apparent observations.
 */
const decisions = (atlas.decisions ?? []) as Decision[];
const utciOf = (d: Decision) => d.metrics?.find((m) => m.key === 'utci');

describe('HATI honesty — evidence status is never laundered', () => {
  it('labels nothing as directly observed (HATI has no field measurements)', () => {
    for (const d of decisions) expect(d.evidenceStatus).not.toBe('observed');
  });

  it('marks every modelled UTCI value as modelled or simulated, never measured', () => {
    for (const d of decisions) {
      const m = utciOf(d);
      if (m && m.value !== null) {
        expect(['modelled', 'simulated'], d.id).toContain(m.evidenceStatus);
        expect(m.evidenceStatus, d.id).toBe(d.evidenceStatus);
      }
    }
  });

  it('labels indoor refuge decisions as derived (rule-based), never modelled/measured, with no faked UTCI', () => {
    const indoor = decisions.filter((d) => d.attributes?.thermal_state === 'INDOOR_NOT_MODELLED');
    expect(indoor.length).toBeGreaterThan(0);
    for (const d of indoor) {
      // The INDOOR_REFUGE decision is a rule over documented evidence → derived.
      expect(d.evidenceStatus, d.id).toBe('derived');
      // The thermal environment is explicitly not modelled: no fabricated UTCI.
      expect(utciOf(d), `${d.id} must not fake a UTCI`).toBeUndefined();
      // The documentary basis (OSM opening-hours / tags) is preserved.
      expect(d.provenance.sourceId, `${d.id} keeps documentary provenance`).toBe('openstreetmap');
    }
  });

  it('preserves the genuine UNSTABLE case as simulated, never softened', () => {
    const unstable = decisions.filter((d) => d.confidence === 'UNSTABLE');
    // A24 @ its solar-boundary timestamps is the canonical UNSTABLE example.
    expect(unstable.length).toBeGreaterThan(0);
    for (const d of unstable) {
      expect(d.evidenceStatus, `${d.id} UNSTABLE must stay simulated`).toBe('simulated');
      const m = utciOf(d);
      if (m) expect(m.evidenceStatus).toBe('simulated');
    }
  });

  it('every decision that rests on a model keeps a model status', () => {
    for (const d of decisions) {
      const modelled = d.attributes?.thermal_state === 'VERY_STRONG_HEAT_STRESS';
      if (modelled) expect(['modelled', 'simulated'], d.id).toContain(d.evidenceStatus);
    }
  });
});
