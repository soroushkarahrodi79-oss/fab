import type { ResearchSource } from './types';

/** Deterministic mock research sources. Real missions/surveys drop in here. */
export const sources: ResearchSource[] = [
  {
    id: 'sentinel-2',
    label: 'Sentinel-2',
    kind: 'satellite',
    agency: 'ESA Copernicus',
    detail: 'MSI · 10–60 m · ~5-day revisit · optical / NDVI',
  },
  {
    id: 'sentinel-1',
    label: 'Sentinel-1',
    kind: 'satellite',
    agency: 'ESA Copernicus',
    detail: 'C-band SAR · all-weather · surface / moisture',
  },
  {
    id: 'field-survey',
    label: 'Field Survey',
    kind: 'field',
    agency: 'in-situ',
    detail: 'Ground validation transects and point records',
  },
  {
    id: 'landcover-model',
    label: 'Land-Cover Model',
    kind: 'model',
    detail: 'Deterministic classification over the EO grid',
  },
];
