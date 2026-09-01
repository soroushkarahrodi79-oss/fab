import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { atlas } from '../data/index';
import { FieldProvider } from '../interaction/FieldContext';
import { ScenarioField } from '../viz/ScenarioField';
import { FieldScanner } from '../interaction/FieldScanner';

/**
 * Interaction proof: a user can inspect authentic HATI evidence and answer the
 * five questions (what / which scenario / observed-vs-modelled / why excluded /
 * what source) via the FIELD SCANNER, using the keyboard alone.
 */
function mount(scenarioId: string) {
  return render(
    <FieldProvider>
      <ScenarioField data={atlas} scenarioId={scenarioId} />
      <FieldScanner />
    </FieldProvider>,
  );
}

describe('SCENARIO navigation & scanner', () => {
  it('exposes every decision as a keyboard-focusable, labelled data mark (not a button)', () => {
    mount('S1');
    // Inspectable data marks are focusable images, not controls: they carry the
    // full label but must not advertise button semantics they cannot honour.
    const source = screen.getByRole('img', { name: /source asset: Fuente de Neptuno/i });
    expect(source).toHaveAttribute('tabindex', '0');
    expect(screen.queryByRole('button', { name: /Fuente de Neptuno/i })).toBeNull();
  });

  it('reports the full evidence readout for a modelled outdoor source', () => {
    mount('S1');
    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    const source = screen.getByRole('img', { name: /source asset: Fuente de Neptuno/i });
    fireEvent.focus(source); // keyboard focus, not hover

    // "SCENARIO" appears as both the module source tag and the field key.
    expect(within(scanner).getAllByText('SCENARIO').length).toBeGreaterThanOrEqual(1);
    expect(within(scanner).getByText(/S1 · Fuente de Neptuno/)).toBeInTheDocument();
    // scientific status is explicit and honest: modelled, not measured
    expect(within(scanner).getByText(/Modelled/i)).toBeInTheDocument();
    expect(within(scanner).getByText(/Source · heat-exposed/)).toBeInTheDocument();
  });

  it('distinguishes an indoor refuge as derived (rule-based), with no faked thermal value', () => {
    mount('S1');
    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    const prado = screen.getByRole('img', { name: /Museo del Prado/i });
    fireEvent.focus(prado);

    expect(within(scanner).getByText(/Indoor refuge/i)).toBeInTheDocument();
    // rule-based on documented evidence; must not imply measured indoor thermal
    expect(within(scanner).getByText(/Derived/i)).toBeInTheDocument();
    expect(within(scanner).getByText(/not physically modelled/i)).toBeInTheDocument();
    // no invented UTCI for an indoor asset
    expect(within(scanner).queryByText(/UTCI/)).not.toBeInTheDocument();
  });

  it('explains why an excluded candidate was excluded', () => {
    mount('S1');
    const scanner = screen.getByRole('complementary', { name: /field scanner/i });
    const excluded = screen.getByRole('img', { name: /excluded candidate: .*Reina Sof/i });
    fireEvent.focus(excluded);

    expect(within(scanner).getByText(/Excluded — .*search radius/i)).toBeInTheDocument();
    fireEvent.blur(excluded);
    expect(within(scanner).getByText(/point at or focus/i)).toBeInTheDocument();
  });
});
