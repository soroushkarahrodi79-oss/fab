import type { Territory } from './types';

/**
 * Deterministic mock territories. Centroids are real WGS84 points; the polygon
 * rings are simplified placeholders (not survey-accurate) so the SVG projection
 * has geometry to draw. Real GeoJSON drops in here unchanged.
 */
export const territories: Territory[] = [
  {
    id: 'madrid',
    label: 'Madrid',
    code: 'MAD',
    kind: 'urban',
    centroid: [-3.7038, 40.4168],
    elevationRange: [589, 700],
    sourceIds: ['sentinel-2', 'field-survey'],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-3.78, 40.35],
          [-3.62, 40.35],
          [-3.60, 40.44],
          [-3.68, 40.51],
          [-3.79, 40.46],
          [-3.78, 40.35],
        ],
      ],
    },
    note: 'Urban core — mobility and tourism baseline.',
  },
  {
    id: 'sierra-de-guadarrama',
    label: 'Sierra de Guadarrama',
    code: 'PNSG',
    kind: 'protected',
    centroid: [-3.9556, 40.8],
    elevationRange: [900, 2428],
    sourceIds: ['sentinel-2', 'sentinel-1', 'field-survey', 'landcover-model'],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-4.10, 40.68],
          [-3.82, 40.72],
          [-3.75, 40.88],
          [-3.92, 40.95],
          [-4.12, 40.86],
          [-4.10, 40.68],
        ],
      ],
    },
    note: 'National park — primary EO / NDVI study area.',
  },
  {
    id: 'sierra-del-rincon',
    label: 'Sierra del Rincón',
    code: 'SRIN',
    kind: 'protected',
    centroid: [-3.45, 41.05],
    elevationRange: [900, 2040],
    sourceIds: ['sentinel-2', 'field-survey'],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-3.55, 40.98],
          [-3.36, 41.0],
          [-3.34, 41.11],
          [-3.47, 41.14],
          [-3.56, 41.07],
          [-3.55, 40.98],
        ],
      ],
    },
    note: 'Biosphere reserve — transition / mosaic land cover.',
  },
];
