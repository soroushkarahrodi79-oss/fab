import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AtlasData, Observation } from '../data/types';
import { atlas } from '../data/index';
import { deriveFieldState } from '../adapters/fieldState';
import { FieldProvider } from '../interaction/FieldContext';
import { TerritoryMap } from '../viz/TerritoryMap';
import { FieldScanner } from '../interaction/FieldScanner';
import { FieldStateCore } from '../viz/FieldStateCore';

/**
 * Phase 4C1 — Observation now carries two INDEPENDENT axes:
 *   - evidenceStatus (production status: observed/documented/derived/modelled/simulated)
 *   - validated      (field-validation state only)
 * These guards fail if the two are ever conflated again, or if a not-yet-field-
 * validated derived/modelled value is rendered/announced as flagged or invalid.
 */

const EVIDENCE_STATUSES = ['observed', 'documented', 'derived', 'modelled', 'simulated'];

/** A minimal atlas fixture exercising all four required axis combinations. */
function fixture(): AtlasData {
  const observations: Observation[] = [
    // A — observed + field-validated
    { id: 'o-obs-t', at: [-3.7, 40.4], territoryId: 't', sourceId: 'field-survey', variable: 'presence', value: 1, observedAt: '2025-01-01T00:00:00Z', evidenceStatus: 'observed', validated: true },
    // B — observed + not field-validated
    { id: 'o-obs-f', at: [-3.71, 40.41], territoryId: 't', sourceId: 'field-survey', variable: 'presence', value: 1, observedAt: '2025-01-01T00:00:00Z', evidenceStatus: 'observed', validated: false },
    // C — derived + not field-validated (the SNTO-shaped case)
    { id: 'o-der-f', at: [-3.72, 40.42], territoryId: 't', sourceId: 'sentinel-2', variable: 'ndvi', value: 0.7, observedAt: '2025-01-01T00:00:00Z', evidenceStatus: 'derived', validated: false },
    // D — modelled + not field-validated
    { id: 'o-mod-f', at: [-3.73, 40.43], territoryId: 't', sourceId: 'landcover-model', variable: 'land-cover', value: 3, observedAt: '2025-01-01T00:00:00Z', evidenceStatus: 'modelled', validated: false },
  ];
  return {
    sources: [
      { id: 'field-survey', label: 'Field Survey', kind: 'field' },
      { id: 'sentinel-2', label: 'Sentinel-2', kind: 'satellite' },
      { id: 'landcover-model', label: 'Land-Cover Model', kind: 'model' },
    ],
    territories: [{ id: 't', label: 'Test', kind: 'range', centroid: [-3.71, 40.41] }],
    projects: [],
    signals: [],
    observations,
  };
}

const PEJORATIVE = /flag|invalid|unreliable|failed|\bbad\b|suspect/i;

describe('4C1 A — contract: every observation has a production status', () => {
  it('assigns a valid evidenceStatus to every real observation', () => {
    for (const o of atlas.observations) {
      expect(EVIDENCE_STATUSES, o.id).toContain(o.evidenceStatus);
      expect(typeof o.validated, o.id).toBe('boolean');
    }
  });
});

describe('4C1 B — the two axes are independent', () => {
  it('represents derived + not-field-validated and modelled + not-field-validated distinctly', () => {
    const data = fixture();
    const der = data.observations.find((o) => o.id === 'o-der-f')!;
    const mod = data.observations.find((o) => o.id === 'o-mod-f')!;
    expect(der.evidenceStatus).toBe('derived');
    expect(der.validated).toBe(false);
    expect(mod.evidenceStatus).toBe('modelled');
    expect(mod.validated).toBe(false);
    // Not-field-validated does NOT remove them from the observation set.
    const fs = deriveFieldState(data);
    expect(fs.observations).toBe(4);
    // validatedRatio reflects ONLY field validation (1 of 4 here).
    expect(fs.validatedRatio).toBeCloseTo(0.25, 5);
  });

  it('all four axis combinations (A/B/C/D) are expressible without collapsing meaning', () => {
    const data = fixture();
    const combos = data.observations.map((o) => `${o.evidenceStatus}:${o.validated}`);
    expect(new Set(combos).size).toBe(4);
  });
});

describe('4C1 C — visual honesty: field-pending is never pejorative', () => {
  it('draws a derived + not-field-validated mark by its status, never as a flag/alert', () => {
    const { container } = render(
      <FieldProvider>
        <TerritoryMap data={fixture()} />
      </FieldProvider>,
    );
    // The mark carries its production status as the class, not a trust binary.
    expect(container.querySelector('.obs--derived')).not.toBeNull();
    expect(container.querySelector('.obs--modelled')).not.toBeNull();
    expect(container.querySelector('.obs--observed')).not.toBeNull();
    // No legacy pejorative classes anywhere.
    expect(container.querySelector('.obs--flag')).toBeNull();
    expect(container.querySelector('.obs--ok')).toBeNull();

    // The accessible name states both axes, and never a pejorative word.
    const mark = screen.getByRole('button', { name: /ndvi, Derived evidence/i });
    const label = mark.getAttribute('aria-label') ?? '';
    expect(label).toMatch(/not field-validated/i);
    expect(label).not.toMatch(PEJORATIVE);
  });
});

describe('4C1 D — scanner honesty: status and field validation are separate rows', () => {
  it('shows EVIDENCE (production status) and FIELD VAL as distinct concepts', () => {
    render(
      <FieldProvider>
        <TerritoryMap data={fixture()} />
        <FieldScanner />
      </FieldProvider>,
    );
    const mark = screen.getByRole('button', { name: /ndvi, Derived evidence/i });
    fireEvent.mouseEnter(mark);

    expect(screen.getByText('EVIDENCE')).toBeInTheDocument();
    expect(screen.getByText(/ndvi · Derived/)).toBeInTheDocument();
    expect(screen.getByText('FIELD VAL')).toBeInTheDocument();
    expect(screen.getByText('Not field-validated')).toBeInTheDocument();
    // The scanner never announces the derived, field-pending value as flagged.
    expect(screen.queryByText(PEJORATIVE)).toBeNull();
  });
});

describe('4C1 E — FIELD STATE label communicates FIELD validation', () => {
  it('computes the ratio from validated only and labels it FIELD-VALIDATED', () => {
    // computation unchanged: field-validated / total
    const fs = deriveFieldState(fixture());
    const expected = fixture().observations.filter((o) => o.validated).length / 4;
    expect(fs.validatedRatio).toBeCloseTo(expected, 5);

    render(
      <FieldProvider>
        <FieldStateCore data={atlas} />
      </FieldProvider>,
    );
    expect(screen.getByText('FIELD-VALIDATED')).toBeInTheDocument();
    expect(screen.getByText(/percent\s+field-validated/i)).toBeInTheDocument();
    // The old ambiguous generic label is gone.
    expect(screen.queryByText('VALIDATED')).toBeNull();
  });
});
