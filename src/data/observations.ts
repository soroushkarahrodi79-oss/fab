import type { Observation } from './types';

/**
 * Deterministic mock observations. Point records over the study territories.
 * Later fed by FieldOS / EO extraction via the same Observation shape.
 *
 * Each record carries two independent axes (see Observation in types.ts):
 *  - `evidenceStatus` — how the value was produced;
 *  - `validated` — whether it has been independently field-validated.
 * A satellite-derived index that has not been field-checked is
 * `evidenceStatus: 'derived'` + `validated: false` — sound evidence, pending
 * field validation, NOT flagged or invalid.
 */
export const observations: Observation[] = [
  {
    id: 'obs-guad-ndvi-01',
    at: [-3.98, 40.79],
    territoryId: 'sierra-de-guadarrama',
    sourceId: 'sentinel-2',
    variable: 'ndvi',
    value: 0.71,
    unit: 'index',
    observedAt: '2025-06-14T10:41:00Z',
    // NDVI is a deterministic band-ratio index from Sentinel-2 reflectance.
    evidenceStatus: 'derived',
    validated: true,
  },
  {
    id: 'obs-guad-ndvi-02',
    at: [-3.9, 40.83],
    territoryId: 'sierra-de-guadarrama',
    sourceId: 'sentinel-2',
    variable: 'ndvi',
    value: 0.58,
    unit: 'index',
    observedAt: '2025-06-14T10:41:00Z',
    evidenceStatus: 'derived',
    validated: true,
  },
  {
    id: 'obs-guad-temp-01',
    at: [-3.95, 40.8],
    territoryId: 'sierra-de-guadarrama',
    sourceId: 'sentinel-1',
    variable: 'temperature',
    value: 24.6,
    unit: '°C',
    observedAt: '2025-07-02T11:03:00Z',
    // A surface-temperature retrieval requires a model, not a direct reading.
    evidenceStatus: 'modelled',
    validated: false,
  },
  {
    id: 'obs-guad-landcover-01',
    at: [-4.02, 40.86],
    territoryId: 'sierra-de-guadarrama',
    sourceId: 'landcover-model',
    variable: 'land-cover',
    value: 3,
    unit: 'class',
    observedAt: '2025-06-20T00:00:00Z',
    // Output of a land-cover classification model.
    evidenceStatus: 'modelled',
    validated: false,
    note: 'Class 3 = coniferous forest.',
  },
  {
    id: 'obs-rincon-ndvi-01',
    at: [-3.44, 41.06],
    territoryId: 'sierra-del-rincon',
    sourceId: 'sentinel-2',
    variable: 'ndvi',
    value: 0.63,
    unit: 'index',
    observedAt: '2025-06-16T10:52:00Z',
    evidenceStatus: 'derived',
    validated: true,
  },
  {
    id: 'obs-rincon-presence-01',
    at: [-3.48, 41.09],
    territoryId: 'sierra-del-rincon',
    sourceId: 'field-survey',
    variable: 'presence',
    value: 1,
    unit: 'count',
    observedAt: '2025-06-16T09:15:00Z',
    // A direct in-situ field record.
    evidenceStatus: 'observed',
    validated: true,
  },
  {
    id: 'obs-madrid-mobility-01',
    at: [-3.7, 40.42],
    territoryId: 'madrid',
    sourceId: 'field-survey',
    variable: 'mobility',
    value: 0.82,
    unit: 'index',
    observedAt: '2025-06-01T08:00:00Z',
    // A normalised mobility index computed from survey records.
    evidenceStatus: 'derived',
    validated: true,
  },
  {
    id: 'obs-madrid-temp-01',
    at: [-3.69, 40.4],
    territoryId: 'madrid',
    sourceId: 'sentinel-1',
    variable: 'temperature',
    value: 31.2,
    unit: '°C',
    observedAt: '2025-07-18T13:20:00Z',
    evidenceStatus: 'modelled',
    validated: false,
    note: 'Urban heat — field validation pending.',
  },
];
