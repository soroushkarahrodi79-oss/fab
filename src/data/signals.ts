import type { Signal } from './types';

/**
 * Deterministic mock signals — the RELATIONSHIPS the SIGNALS module renders.
 * Edges live here, in data, never hardcoded in rendering logic. `from`/`to`
 * reference project / territory / source ids; referential integrity is tested.
 */
export const signals: Signal[] = [
  {
    id: 'fieldos-validates-snto',
    from: 'fieldos',
    to: 'snto',
    kind: 'validates',
    strength: 0.8,
    active: true,
    note: 'Field observations validate tourism signals.',
  },
  {
    id: 'snto-shares-guadarrama-hati',
    from: 'snto',
    to: 'hati-madrid',
    kind: 'shares-territory',
    strength: 0.6,
    active: true,
    note: 'Overlap in the Guadarrama corridor.',
  },
  {
    id: 'hati-derives-from-sentinel2',
    from: 'hati-madrid',
    to: 'sentinel-2',
    kind: 'derives-from',
    strength: 0.9,
    active: true,
  },
  {
    id: 'radar-derives-from-sentinel1',
    from: 'radar',
    to: 'sentinel-1',
    kind: 'derives-from',
    strength: 0.7,
    active: true,
  },
  {
    id: 'radar-feeds-hati',
    from: 'radar',
    to: 'hati-madrid',
    kind: 'feeds',
    strength: 0.4,
    active: false,
    note: 'Planned: change-detection feeds terrain intelligence.',
  },
  {
    id: 'fieldos-feeds-hati',
    from: 'fieldos',
    to: 'hati-madrid',
    kind: 'feeds',
    strength: 0.55,
    active: true,
  },
];
