import type { Polygon, MultiPolygon } from 'geojson';
import type { Territory } from './types';
import territoriesGeo from './geo/territories.geo.json';

/**
 * Real territory geometry — authoritative INE (Instituto Nacional de
 * Estadística) municipality boundaries, sourced from the `es-atlas` dataset and
 * merged per territory by scripts/build-territories.mjs. This replaced the
 * hand-authored placeholder rings from Phase 1 with real data, WITHOUT changing
 * any visualization code (the adapter/viz seam consumes Territory.geometry
 * unchanged). Centroids/codes/metadata remain authored labels for the
 * instrument. To regenerate: `node scripts/build-territories.mjs`.
 */
interface GeoEntry {
  ine: string[];
  municipalities: string[];
  geometry: Polygon | MultiPolygon;
}
const geo = territoriesGeo as Record<string, GeoEntry>;

export const territories: Territory[] = [
  {
    id: 'madrid',
    label: 'Madrid',
    code: 'MAD',
    kind: 'urban',
    centroid: [-3.7038, 40.4168],
    geometry: geo['madrid'].geometry,
    elevationRange: [589, 700],
    sourceIds: ['sentinel-2', 'field-survey'],
    note: 'Municipality of Madrid (INE 28079) — urban mobility/tourism baseline.',
  },
  {
    id: 'sierra-de-guadarrama',
    label: 'Sierra de Guadarrama',
    code: 'PNSG',
    kind: 'protected',
    centroid: [-3.9556, 40.8],
    geometry: geo['sierra-de-guadarrama'].geometry,
    elevationRange: [900, 2428],
    sourceIds: ['sentinel-2', 'sentinel-1', 'field-survey', 'landcover-model'],
    note:
      'Core Madrid-side massif municipalities (INE footprint) containing the ' +
      'national park — primary EO / NDVI study area.',
  },
  {
    id: 'sierra-del-rincon',
    label: 'Sierra del Rincón',
    code: 'SRIN',
    kind: 'protected',
    centroid: [-3.45, 41.05],
    geometry: geo['sierra-del-rincon'].geometry,
    elevationRange: [900, 2040],
    sourceIds: ['sentinel-2', 'field-survey'],
    note:
      'The five municipalities of the Reserva de la Biosfera Sierra del Rincón ' +
      '(INE footprint) — transition / mosaic land cover.',
  },
];
