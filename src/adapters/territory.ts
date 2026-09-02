import type { AtlasData, EvidenceStatus, LonLat, Territory, Observation } from '../data/types';
import type { EvidenceGroup } from '../interaction/FieldContext';
import { buildObservationEvidence } from './observation';

export interface Pt {
  x: number; // 0..1 within the instrument viewport
  y: number; // 0..1, top-down (lat flipped)
}

export interface TerritoryShape {
  id: string;
  label: string;
  code?: string;
  kind: Territory['kind'];
  centroid: Pt;
  rings: Pt[][]; // projected polygon rings (empty if no geometry)
  lonlat: LonLat;
  elevationRange?: [number, number];
  observationCount: number;
}

export interface ObservationMark {
  id: string;
  at: Pt;
  variable: Observation['variable'];
  value: number;
  /** Production status — drives the mark's categorical appearance. */
  evidenceStatus: EvidenceStatus;
  /** Independent field-validation state — never the mark's trust colour. */
  validated: boolean;
  territoryId?: string;
  source?: string;
  lonlat: LonLat;
  /** Traceable evidence + provenance for the scanner disclosure (generic). */
  detail: EvidenceGroup[];
}

export interface TerritoryView {
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  shapes: TerritoryShape[];
  observations: ObservationMark[];
}

export type BBox = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]

function extendBBox(b: BBox, [lon, lat]: LonLat): void {
  if (lon < b[0]) b[0] = lon;
  if (lat < b[1]) b[1] = lat;
  if (lon > b[2]) b[2] = lon;
  if (lat > b[3]) b[3] = lat;
}

/**
 * Compute a padded bounding box that frames a set of points. Generic and pure —
 * reused to frame the whole region (TERRITORY) or a single scenario's assets
 * (the geographic scenario view), so both share one projection, not two maps.
 */
export function frameBBox(points: LonLat[], padFrac = 0.1): BBox {
  const b: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) extendBBox(b, p);
  if (!Number.isFinite(b[0])) return [-0.1, -0.1, 0.1, 0.1];
  const padX = (b[2] - b[0]) * padFrac || 0.002;
  const padY = (b[3] - b[1]) * padFrac || 0.002;
  return [b[0] - padX, b[1] - padY, b[2] + padX, b[3] + padY];
}

/**
 * A deterministic equirectangular projector into normalised instrument space
 * [0,1], north up. Each axis is fit independently to the bbox — a research
 * instrument frame, not a slippy map. The single projection used everywhere.
 */
export function makeProjector(bbox: BBox): (p: LonLat) => Pt {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const spanLon = maxLon - minLon || 1;
  const spanLat = maxLat - minLat || 1;
  return ([lon, lat]: LonLat): Pt => ({
    x: (lon - minLon) / spanLon,
    y: 1 - (lat - minLat) / spanLat,
  });
}

/**
 * Project geographic territories into normalised instrument space [0,1].
 * A deliberately simple equirectangular fit to the data's bounding box — this
 * is a research instrument, not a slippy map. Real GeoJSON geometry is consumed
 * unchanged; swapping the dataset does not touch any viz component (Q4).
 */
export function projectTerritories(data: AtlasData): TerritoryView {
  const bbox: [number, number, number, number] = [
    Infinity,
    Infinity,
    -Infinity,
    -Infinity,
  ];

  for (const t of data.territories) {
    extendBBox(bbox, t.centroid);
    const geom = t.geometry;
    if (geom?.type === 'Polygon') {
      for (const ring of geom.coordinates)
        for (const c of ring) extendBBox(bbox, c as LonLat);
    } else if (geom?.type === 'MultiPolygon') {
      for (const poly of geom.coordinates)
        for (const ring of poly)
          for (const c of ring) extendBBox(bbox, c as LonLat);
    }
  }
  for (const o of data.observations) extendBBox(bbox, o.at);

  // Pad the box by 8% so nothing sits on the frame edge.
  const padX = (bbox[2] - bbox[0]) * 0.08 || 0.1;
  const padY = (bbox[3] - bbox[1]) * 0.08 || 0.1;
  bbox[0] -= padX;
  bbox[1] -= padY;
  bbox[2] += padX;
  bbox[3] += padY;

  const project = makeProjector(bbox);

  const obsByTerritory = new Map<string, number>();
  for (const o of data.observations) {
    if (o.territoryId)
      obsByTerritory.set(o.territoryId, (obsByTerritory.get(o.territoryId) ?? 0) + 1);
  }

  const shapes: TerritoryShape[] = data.territories.map((t) => {
    const rings: Pt[][] = [];
    if (t.geometry?.type === 'Polygon') {
      for (const ring of t.geometry.coordinates)
        rings.push(ring.map((c) => project(c as LonLat)));
    } else if (t.geometry?.type === 'MultiPolygon') {
      for (const poly of t.geometry.coordinates)
        for (const ring of poly) rings.push(ring.map((c) => project(c as LonLat)));
    }
    return {
      id: t.id,
      label: t.label,
      code: t.code,
      kind: t.kind,
      centroid: project(t.centroid),
      rings,
      lonlat: t.centroid,
      elevationRange: t.elevationRange,
      observationCount: obsByTerritory.get(t.id) ?? 0,
    };
  });

  const sourceLabel = new Map(data.sources.map((s) => [s.id, s.label]));
  const marks: ObservationMark[] = data.observations.map((o) => ({
    id: o.id,
    at: project(o.at),
    variable: o.variable,
    value: o.value,
    evidenceStatus: o.evidenceStatus,
    validated: o.validated,
    territoryId: o.territoryId,
    source: sourceLabel.get(o.sourceId),
    lonlat: o.at,
    detail: buildObservationEvidence(o, sourceLabel.get(o.sourceId)),
  }));

  return { bbox, shapes, observations: marks };
}

/** Format a lon/lat as an instrument coordinate readout, e.g. "40.80 N  3.96 W". */
export function formatCoord([lon, lat]: LonLat): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)} ${ns}  ${Math.abs(lon).toFixed(2)} ${ew}`;
}
