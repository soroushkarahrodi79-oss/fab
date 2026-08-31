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
        <EarthField data={atlas} />
      </FieldProvider>,
    );
    // figcaption twin present with NDVI range + dominant cover.
    expect(screen.getByText(/EO FIELD/)).toBeInTheDocument();
    expect(screen.getByText(/NDVI/)).toBeInTheDocument();
    expect(screen.getByText(/dominant cover/)).toBeInTheDocument();
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
    // The screen-reader-only paragraph carries the full derived state.
    expect(
      screen.getByText(/percent\s+validated/i),
    ).toBeInTheDocument();
  });
});
