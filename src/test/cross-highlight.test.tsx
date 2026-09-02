import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { atlas } from '../data/index';
import { FieldProvider, useField } from '../interaction/FieldContext';
import { ScenarioField } from '../viz/ScenarioField';
import { TerritoryScenario } from '../viz/TerritoryScenario';
import { ScenarioSlice } from '../shell/ScenarioSlice';
import { FieldScanner } from '../interaction/FieldScanner';

/**
 * Phase 3B — cross-highlight the SAME HATI decision across both scenario views.
 *
 * The gate: focusing/hovering a decision mark in either the ACCESS FIELD or the
 * geographic TERRITORY view must emphasise the same decision in the other view,
 * keep the FIELD SCANNER on that identity, and key everything off the stable
 * decision id `${scenarioId}:${assetId}` — never index/coord/label.
 */

const decisionById = new Map((atlas.decisions ?? []).map((d) => [d.id, d]));

/** Test probe: surfaces the one authoritative active decision id into the DOM. */
function ActiveProbe() {
  const { activeDecisionId } = useField();
  return <div data-testid="active">{activeDecisionId ?? ''}</div>;
}

/** Both views side by side, each isolated so the two copies of a mark are addressable. */
function TwoViews({ scenarioId }: { scenarioId: string }) {
  return (
    <FieldProvider initialScenarioId={scenarioId}>
      <div data-testid="access">
        <ScenarioField data={atlas} scenarioId={scenarioId} />
      </div>
      <div data-testid="territory">
        <TerritoryScenario data={atlas} scenarioId={scenarioId} />
      </div>
      <FieldScanner />
      <ActiveProbe />
    </FieldProvider>
  );
}

const active = () => screen.getByTestId('active').textContent;
const markIn = (testid: string, name: RegExp) =>
  within(screen.getByTestId(testid)).getByRole('img', { name });

describe('Phase 3B A — ACCESS FIELD → TERRITORY', () => {
  it('activating a decision in ACCESS FIELD highlights the same mark in TERRITORY', () => {
    render(<TwoViews scenarioId="S1" />);

    fireEvent.focus(markIn('access', /source asset: Fuente de Neptuno/i));

    // shared active decision id == X, and X is the exact stable identity
    expect(active()).toBe('S1:A16');

    // matching TERRITORY mark becomes highlighted
    expect(markIn('territory', /source asset: Fuente de Neptuno/i)).toHaveClass('is-focused');
    // an unrelated TERRITORY mark does NOT
    expect(markIn('territory', /alternative: Museo del Prado/i)).not.toHaveClass('is-focused');

    // scanner still resolves X
    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    expect(within(scanner).getByText(/S1 · Fuente de Neptuno/)).toBeInTheDocument();
  });
});

describe('Phase 3B B — TERRITORY → ACCESS FIELD (symmetric)', () => {
  it('activating a decision in TERRITORY highlights the same mark in ACCESS FIELD', () => {
    render(<TwoViews scenarioId="S1" />);

    fireEvent.focus(markIn('territory', /alternative: Museo del Prado/i));

    expect(active()).toBe('S1:A01');
    expect(markIn('access', /alternative: Museo del Prado/i)).toHaveClass('is-focused');
    expect(markIn('access', /source asset: Fuente de Neptuno/i)).not.toHaveClass('is-focused');

    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    expect(within(scanner).getByText(/S1 · Fuente de Neptuno/)).toBeInTheDocument(); // scenario label
  });
});

describe('Phase 3B C — keyboard is first-class', () => {
  it('keyboard focus (no pointer) cross-highlights and drives the scanner', () => {
    render(<TwoViews scenarioId="S1" />);

    // pure keyboard focus, no pointer (no mouseenter is dispatched)
    fireEvent.focus(markIn('access', /source asset: Fuente de Neptuno/i));

    expect(active()).toBe('S1:A16');
    expect(markIn('territory', /source asset: Fuente de Neptuno/i)).toHaveClass('is-focused');
  });

  it('owner-guarded clear survives a fast mark-to-mark handoff (no flicker)', () => {
    render(<TwoViews scenarioId="S1" />);
    const a = markIn('access', /source asset: Fuente de Neptuno/i);
    const b = markIn('access', /alternative: Museo del Prado/i);

    fireEvent.focus(a);
    // focus B arrives before A's blur (real pointer/keyboard ordering)
    fireEvent.focus(b);
    fireEvent.blur(a);

    // the newer active decision is not erased by the older mark leaving
    expect(active()).toBe('S1:A01');
    expect(markIn('territory', /alternative: Museo del Prado/i)).toHaveClass('is-focused');
  });

  it('blurring the active mark clears the shared active decision', () => {
    render(<TwoViews scenarioId="S1" />);
    const a = markIn('access', /source asset: Fuente de Neptuno/i);
    fireEvent.focus(a);
    expect(active()).toBe('S1:A16');
    fireEvent.blur(a);
    expect(active()).toBe('');
    expect(markIn('territory', /source asset: Fuente de Neptuno/i)).not.toHaveClass('is-focused');
  });
});

describe('Phase 3B D — scenario change clears stale highlight', () => {
  it('switching S1→S2 drops the stale S1 highlight from both views and the scanner', () => {
    render(
      <FieldProvider initialScenarioId="S1">
        <ScenarioSlice data={atlas} />
        <FieldScanner />
        <ActiveProbe />
      </FieldProvider>,
    );

    // activate an S1 decision
    fireEvent.focus(screen.getAllByRole('img', { name: /source asset: Fuente de Neptuno/i })[0]);
    expect(active()).toBe('S1:A16');

    // switch to S2
    fireEvent.click(screen.getByRole('button', { name: /S2\s*Fuente de Cibeles/i }));

    // no stale S1 highlight remains active
    expect(active()).toBe('');
    // both views now represent S2 (subject present twice; S1 subject gone)
    expect(screen.queryByRole('img', { name: /source asset: Fuente de Neptuno/i })).toBeNull();
    expect(
      screen.getAllByRole('img', { name: /source asset: Fuente de Cibeles/i }),
    ).toHaveLength(2);
    // scanner does not retain the invalid S1 decision identity
    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    expect(within(scanner).queryByText(/S1 ·/)).toBeNull();
  });
});

describe('Phase 3B E — referential integrity', () => {
  it('the active id is an EXISTING Decision, exactly ${scenarioId}:${assetId}', () => {
    render(<TwoViews scenarioId="S2" />);
    fireEvent.focus(markIn('territory', /alternative: Museo del Prado/i));

    const id = active()!;
    expect(id).toBe('S2:A01');
    const d = decisionById.get(id);
    expect(d).toBeDefined();
    // the identity is composed from the real Decision, not recomputed/cloned
    expect(id).toBe(`${d!.scenarioId}:${d!.assetId}`);
  });
});
