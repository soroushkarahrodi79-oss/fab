import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { atlas } from '../data/index';
import { buildTerritoryScenario } from '../adapters/territoryScenario';
import { buildScenarioView } from '../adapters/hati';
import { FieldProvider } from '../interaction/FieldContext';
import { ScenarioSlice } from '../shell/ScenarioSlice';
import { TerritoryScenario } from '../viz/TerritoryScenario';
import { FieldScanner } from '../interaction/FieldScanner';

const assetById = new Map((atlas.assets ?? []).map((a) => [a.id, a]));
const decisionById = new Map((atlas.decisions ?? []).map((d) => [d.id, d]));

describe('TERRITORY×SCENARIO — deterministic projection of authentic coordinates', () => {
  it('projects real HATI coordinates into [0,1] deterministically', () => {
    const a = buildTerritoryScenario(atlas, 'S1');
    const b = buildTerritoryScenario(atlas, 'S1');
    expect(a).toEqual(b); // pure
    expect(a).not.toBeNull();
    for (const m of a!.marks) {
      expect(m.at.x).toBeGreaterThanOrEqual(0);
      expect(m.at.x).toBeLessThanOrEqual(1);
      expect(m.at.y).toBeGreaterThanOrEqual(0);
      expect(m.at.y).toBeLessThanOrEqual(1);
      // the projected point derives from the asset's authentic coordinate
      expect(m.lonlat).toEqual(assetById.get(m.assetId)!.position);
    }
  });

  it('frames the scenario to a small real extent (Madrid, not the whole region)', () => {
    const v = buildTerritoryScenario(atlas, 'S1')!;
    // central-Madrid scenario spans well under 5 km on each side
    expect(v.spanMeters.x).toBeLessThan(5000);
    expect(v.spanMeters.y).toBeLessThan(5000);
    expect(v.territoryLabel).toBe('Madrid');
  });
});

describe('TERRITORY×SCENARIO — referential identity', () => {
  it('every map mark resolves to an existing Asset and Decision id', () => {
    for (const id of ['S1', 'S4', 'S8']) {
      const v = buildTerritoryScenario(atlas, id)!;
      for (const m of v.marks) {
        expect(assetById.has(m.assetId), `${m.assetId}`).toBe(true);
        expect(decisionById.has(m.decisionId), `${m.decisionId}`).toBe(true);
        expect(m.decisionId).toBe(`${id}:${m.assetId}`);
      }
    }
  });
});

describe('TERRITORY×SCENARIO — no duplicated science', () => {
  it('marks carry the Decision roles/states verbatim (nothing recomputed)', () => {
    const v = buildTerritoryScenario(atlas, 'S1')!;
    for (const m of v.marks) {
      const d = decisionById.get(m.decisionId)!;
      expect(m.role, m.decisionId).toBe(d.role);
      expect(m.state, m.decisionId).toBe(d.state);
    }
    // it reflects the same subject + candidate set as the abstract view
    const sv = buildScenarioView(atlas, 'S1')!;
    const abstractIds = new Set([sv.subject, ...sv.alternatives, ...sv.excluded].map((n) => n.decisionId));
    const mapIds = new Set(v.marks.map((m) => m.decisionId));
    expect(mapIds).toEqual(abstractIds);
  });
});

describe('shared scenario state — SCENARIO and TERRITORY move together', () => {
  it('selecting a scenario updates both views to the same subject', () => {
    render(
      <FieldProvider initialScenarioId="S1">
        <ScenarioSlice data={atlas} />
      </FieldProvider>,
    );
    // Both the access field and the geographic view show S1's subject.
    expect(screen.getAllByRole('img', { name: /source asset: Fuente de Neptuno/i })).toHaveLength(2);

    // Select S2 via the shared picker.
    fireEvent.click(screen.getByRole('button', { name: /S2\s*Fuente de Cibeles/i }));

    // Both views now reflect S2 — no stale/duplicated state.
    expect(screen.queryByRole('img', { name: /source asset: Fuente de Neptuno/i })).toBeNull();
    expect(screen.getAllByRole('img', { name: /source asset: Fuente de Cibeles/i })).toHaveLength(2);
  });
});

describe('TERRITORY×SCENARIO — accessibility & scanner', () => {
  function mount(id: string) {
    return render(
      <FieldProvider initialScenarioId={id}>
        <TerritoryScenario data={atlas} scenarioId={id} />
        <FieldScanner />
      </FieldProvider>,
    );
  }

  it('mapped marks are keyboard-focusable images (not buttons)', () => {
    mount('S1');
    const subject = screen.getByRole('img', { name: /source asset: Fuente de Neptuno/i });
    expect(subject).toHaveAttribute('tabindex', '0');
    expect(screen.queryByRole('button', { name: /Fuente de Neptuno/i })).toBeNull();
  });

  it('focusing a mapped mark reports coordinate + decision identity in the scanner', () => {
    mount('S1');
    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    const subject = screen.getByRole('img', { name: /source asset: Fuente de Neptuno/i });
    fireEvent.focus(subject);

    expect(within(scanner).getByText(/N\s+.*W/)).toBeInTheDocument(); // real coordinate
    expect(within(scanner).getByText(/S1 · Fuente de Neptuno/)).toBeInTheDocument();
    expect(within(scanner).getByText(/Modelled/i)).toBeInTheDocument();
  });

  it('exposes an excluded candidate with its exclusion reason', () => {
    mount('S1');
    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    const excluded = screen.getByRole('img', { name: /excluded candidate: .*Reina Sof/i });
    fireEvent.focus(excluded);
    expect(within(scanner).getByText(/Excluded — /i)).toBeInTheDocument();
  });
});
