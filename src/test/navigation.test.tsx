import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { atlas } from '../data/index';
import { FieldProvider } from '../interaction/FieldContext';
import { TerritoryMap } from '../viz/TerritoryMap';
import { FieldScanner } from '../interaction/FieldScanner';

function mount() {
  return render(
    <FieldProvider>
      <TerritoryMap data={atlas} />
      <FieldScanner />
    </FieldProvider>,
  );
}

describe('navigation & scanner', () => {
  it('exposes keyboard-focusable, labelled elements for every territory', () => {
    mount();
    // Each territory is a focusable button with an accessible name.
    const madrid = screen.getByRole('button', { name: /Madrid/ });
    expect(madrid).toHaveAttribute('tabindex', '0');
  });

  it('scanner starts empty then reports the focused element', () => {
    mount();
    const scanner = screen.getByRole('complementary', {
      name: /field scanner/i,
    });
    expect(within(scanner).getByText(/point at or focus/i)).toBeInTheDocument();

    const guadarrama = screen.getByRole('button', {
      name: /Sierra de Guadarrama/,
    });
    fireEvent.focus(guadarrama);

    // Scanner now shows a TERRITORY readout with the coordinate + label.
    // ("TERRITORY" appears both as the module source tag and the field key.)
    expect(within(scanner).getAllByText('TERRITORY').length).toBeGreaterThanOrEqual(1);
    expect(within(scanner).getByText(/PNSG/)).toBeInTheDocument();
    expect(within(scanner).getByText(/N\s+.*W/)).toBeInTheDocument();
  });

  it('clears the readout on blur', () => {
    mount();
    const scanner = screen.getByRole('complementary', {
      name: /field scanner/i,
    });
    const madrid = screen.getByRole('button', { name: /Madrid/ });
    fireEvent.focus(madrid);
    expect(within(scanner).queryByText(/point at or focus/i)).not.toBeInTheDocument();
    fireEvent.blur(madrid);
    expect(within(scanner).getByText(/point at or focus/i)).toBeInTheDocument();
  });
});
