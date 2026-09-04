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

/**
 * Phase 4D2 — SIGNALS UX / decision context. `shares-territory` is easy to
 * misread as a causal, methodological, or collaborative link. These guard the
 * two interpretation invariants this phase exists to protect: (1) the exact
 * canonical territory backing the edge is named in its accessible label, not
 * left implicit; (2) the label explicitly rules out the stronger readings the
 * data does not support. See docs/PHASE_4D_SIGNALS.md.
 */
describe('SignalGraph — shares-territory edge honesty (Phase 4D2)', () => {
  it("names the canonical shared territory in the edge's accessible label", () => {
    render(
      <FieldProvider>
        <SignalGraph data={atlas} />
      </FieldProvider>,
    );
    const edge = atlas.signals.find((s) => s.kind === 'shares-territory');
    expect(edge?.note).toBeTruthy();
    const edgeEl = screen.getByRole('button', { name: new RegExp(edge!.note!) });
    expect(edgeEl).toBeTruthy();
  });

  it('never implies a stronger relationship than a territorial reference', () => {
    render(
      <FieldProvider>
        <SignalGraph data={atlas} />
      </FieldProvider>,
    );
    const buttons = screen.getAllByRole('button');
    // Every affirmative overclaim word must appear only inside the edge's own
    // explicit negation ("not a collaboration, methodology, data, or lineage
    // link"), never asserted on its own.
    const affirmativeOverclaim =
      /is (a |)(causal|corroborat\w*|collaborat\w*|mutual validation|shared dataset|shared finding|dependency)/i;
    for (const el of buttons) {
      const label = el.getAttribute('aria-label') ?? '';
      expect(label).not.toMatch(affirmativeOverclaim);
    }
    const territoryEdge = buttons.find((el) =>
      (el.getAttribute('aria-label') ?? '').includes('canonical territory'),
    );
    expect(territoryEdge?.getAttribute('aria-label')).toMatch(
      /not a collaboration, methodology, data, or lineage link/,
    );
  });
});
