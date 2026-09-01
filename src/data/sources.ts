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
  {
    id: 'github',
    label: 'GitHub',
    kind: 'repository',
    agency: 'github.com',
    detail: 'Source repositories for the research software projects',
  },
  // ── HATI Madrid evidence sources (Phase 2 vertical slice) ────────────────
  {
    id: 'hati-madrid-repo',
    label: 'HATI Madrid',
    kind: 'repository',
    agency: 'soroushkarahrodi79-oss',
    detail:
      'Heat-Aware Tourism Intelligence — decision-layer CSV artifacts ' +
      '(Phase 3 asset catalog, scenarios, screening).',
  },
  {
    id: 'openstreetmap',
    label: 'OpenStreetMap',
    kind: 'repository',
    agency: 'OSM / ODbL',
    detail: 'Documented asset location, category and opening hours (via Overpass).',
  },
  {
    id: 'solweig-utci',
    label: 'SOLWEIG / UTCI',
    kind: 'model',
    detail:
      'Modelled outdoor thermal environment (Tmrt → UTCI). Not field-measured; ' +
      'indoor environments are not modelled.',
  },
];
