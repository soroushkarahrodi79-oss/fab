import type { Project } from './types';

/** Deterministic mock projects. Later derivable from GitHub via the same shape. */
export const projects: Project[] = [
  {
    id: 'snto',
    label: 'SNTO',
    status: 'active',
    summary: 'Tourism signal observatory over Madrid and its ranges.',
    domains: ['tourism', 'geospatial', 'mobility'],
    territoryIds: ['madrid', 'sierra-de-guadarrama'],
    sourceIds: ['sentinel-2', 'field-survey'],
  },
  {
    id: 'fieldos',
    label: 'FieldOS',
    status: 'active',
    summary: 'Field research operating layer — observations and validation.',
    domains: ['field', 'software', 'geospatial'],
    territoryIds: ['sierra-de-guadarrama', 'sierra-del-rincon'],
    sourceIds: ['field-survey', 'sentinel-2'],
  },
  {
    id: 'hati-madrid',
    label: 'HATI Madrid',
    status: 'active',
    summary: 'Habitat and terrain intelligence for the Guadarrama corridor.',
    domains: ['earth-observation', 'climate', 'geospatial'],
    territoryIds: ['sierra-de-guadarrama'],
    sourceIds: ['sentinel-2', 'sentinel-1', 'landcover-model'],
  },
  {
    id: 'radar',
    label: 'Radar',
    status: 'concept',
    summary: 'Experimental change-detection probe over protected ranges.',
    domains: ['earth-observation', 'software'],
    territoryIds: ['sierra-del-rincon'],
    sourceIds: ['sentinel-1'],
  },
];
