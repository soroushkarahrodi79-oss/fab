/**
 * FIELD ATLAS — domain data contract.
 * Single source of truth for domain shapes. Adapters and viz depend on these
 * types, never on concrete datasets. See docs/DATA_CONTRACT.md.
 *
 * Coordinates are WGS84 [lon, lat] (GeoJSON order). Timestamps are ISO-8601 UTC.
 */
import type { Polygon, MultiPolygon } from 'geojson';

export type LonLat = [number, number];

export interface ResearchSource {
  id: string;
  label: string;
  kind: 'satellite' | 'field' | 'model' | 'repository' | 'sensor';
  agency?: string;
  detail?: string;
  note?: string;
}

export interface Territory {
  id: string;
  label: string;
  code?: string;
  kind: 'urban' | 'protected' | 'range' | 'transition';
  centroid: LonLat;
  geometry?: Polygon | MultiPolygon;
  elevationRange?: [number, number];
  sourceIds?: string[];
  note?: string;
}

export type ProjectDomain =
  | 'tourism'
  | 'geospatial'
  | 'earth-observation'
  | 'mobility'
  | 'climate'
  | 'software'
  | 'field';

export interface Project {
  id: string;
  label: string;
  status: 'active' | 'dormant' | 'archived' | 'concept';
  summary: string;
  domains: ProjectDomain[];
  territoryIds?: string[];
  sourceIds?: string[];
  repoUrl?: string;
  note?: string;
}

export type SignalKind =
  | 'derives-from'
  | 'validates'
  | 'shares-territory'
  | 'feeds'
  | 'related';

export interface Signal {
  id: string;
  from: string;
  to: string;
  kind: SignalKind;
  strength: number; // 0..1
  active: boolean;
  note?: string;
}

export type ObservationVariable =
  | 'ndvi'
  | 'land-cover'
  | 'temperature'
  | 'presence'
  | 'mobility';

export interface Observation {
  id: string;
  at: LonLat;
  territoryId?: string;
  sourceId: string;
  variable: ObservationVariable;
  value: number;
  unit?: string;
  observedAt: string;
  validated: boolean;
  note?: string;
}

/** Derived — never authored directly. Produced by adapters/fieldState. */
export interface FieldState {
  activeSignals: number;
  territories: number;
  activeProjects: number;
  experiments: number;
  observations: number;
  validatedRatio: number; // 0..1
  dominantDomain: ProjectDomain | null;
  updatedAt: string;
}

/** The whole atlas dataset — what adapters consume. */
export interface AtlasData {
  sources: ResearchSource[];
  territories: Territory[];
  projects: Project[];
  signals: Signal[];
  observations: Observation[];
}
