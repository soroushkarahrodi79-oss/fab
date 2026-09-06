import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { atlas } from '../data/index';
import { FieldProvider } from '../interaction/FieldContext';
import { EarthField } from '../viz/EarthField';
import { FieldStateCore } from '../viz/FieldStateCore';

/**
 * The semantic twin must carry the meaning when the canvas is unsupported
 * (jsdom returns no 2D context) and under reduced motion. Information can never
 * live only in generative graphics.
 */
describe('EARTH fallback', () => {
  it('renders the textual EO summary even with no canvas context', () => {
    render(
      <FieldProvider>
        <EarthField />
      </FieldProvider>,
    );
    // figcaption twin present with NDVI range + composite window + coverage.
    expect(screen.getByText(/EO FIELD/)).toBeInTheDocument();
    expect(screen.getByText(/NDVI/)).toBeInTheDocument();
    expect(screen.getByText(/coverage/)).toBeInTheDocument();
    // A composite window (start → end), never a single fake acquisition date.
    expect(screen.getByText(/\d{4}-\d{2}-\d{2}\s*→\s*\d{4}-\d{2}-\d{2}/)).toBeInTheDocument();
    // Provenance must travel with the numbers — the mock field is never
    // presented as evidence without its source + evidence-status label.
    expect(screen.getByText(/mock-deterministic/)).toBeInTheDocument();
    expect(screen.getByText(/simulated/)).toBeInTheDocument();
    // The removed pseudo-scientific layers must not reappear in the readout.
    expect(screen.queryByText(/dominant cover|coniferous|heat anomal|orbital/i)).toBeNull();
  });
});

describe('FIELD STATE core fallback', () => {
  it('exposes a full textual field-state summary for assistive tech', () => {
    render(
      <FieldProvider>
        <FieldStateCore data={atlas} />
      </FieldProvider>,
    );
    expect(screen.getAllByText(/active projects/).length).toBeGreaterThanOrEqual(1);
    // The screen-reader-only paragraph carries the full derived state. The
    // ratio is FIELD validation specifically (Phase 4C1), not generic quality.
    expect(
      screen.getByText(/percent\s+field-validated/i),
    ).toBeInTheDocument();
  });
});
