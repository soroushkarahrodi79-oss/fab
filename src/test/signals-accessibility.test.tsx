import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { atlas } from '../data/index';
import { FieldProvider } from '../interaction/FieldContext';
import { SignalGraph } from '../viz/SignalGraph';

/**
 * Phase 4D1 — a territory-overlap count is not a generic scientific
 * "relationship strength"; SIGNALS must never announce a fabricated number.
 */
describe('SignalGraph accessibility', () => {
  it('contains no "strength" text anywhere in its accessible labels', () => {
    render(
      <FieldProvider>
        <SignalGraph data={atlas} />
      </FieldProvider>,
    );
    const labelled = [
      ...screen.getAllByRole('group'),
      ...screen.getAllByRole('button'),
    ];
    expect(labelled.length).toBeGreaterThan(0);
    for (const el of labelled) {
      const label = el.getAttribute('aria-label') ?? '';
      expect(label).not.toMatch(/strength/i);
    }
  });
});
