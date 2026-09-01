import type { AtlasData, LonLat, Territory, Observation } from '../data/types';

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
  validated: boolean;
  territoryId?: string;
  source?: string;
  lonlat: LonLat;
}

export interface TerritoryView {
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  shapes: TerritoryShape[];
  observations: ObservationMark[];
}

function extendBBox(b: [number, number, number, number], [lon, lat]: LonLat): void {
  if (lon < b[0]) b[0] = lon;
  if (lat < b[1]) b[1] = lat;
  if (lon > b[2]) b[2] = lon;
  if (lat > b[3]) b[3] = lat;
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

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const spanLon = maxLon - minLon || 1;
  const spanLat = maxLat - minLat || 1;

  const project = ([lon, lat]: LonLat): Pt => ({
    x: (lon - minLon) / spanLon,
    y: 1 - (lat - minLat) / spanLat, // flip: north is up
  });

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
    validated: o.validated,
    territoryId: o.territoryId,
    source: sourceLabel.get(o.sourceId),
    lonlat: o.at,
  }));

  return { bbox, shapes, observations: marks };
}

/** Format a lon/lat as an instrument coordinate readout, e.g. "40.80 N  3.96 W". */
export function formatCoord([lon, lat]: LonLat): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)} ${ns}  ${Math.abs(lon).toFixed(2)} ${ew}`;
}
