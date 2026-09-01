import type { AtlasData, LonLat } from '../data/types';
import { buildScenarioView, scenarioNodeScan, type ScenarioNodeScan } from './hati';
import { frameBBox, makeProjector, formatCoord, type Pt } from './territory';

/**
 * Project a scenario's located assets into the TERRITORY instrument frame.
 *
 * This is the generic "located assets → map marks" seam the geographic overlay
 * rides on. It reuses the ONE territory projection (frameBBox / makeProjector)
 * — no second map system — and reuses the scenario view model for decision
 * semantics, so it recomputes no science: role, state, exclusion and evidence
 * all come straight from the existing Decision outputs. Positions are the
 * authentic asset coordinates, projected but never jittered or invented.
 */

export interface MapMark {
  decisionId: string; // stable id shared with the abstract SCENARIO field
  assetId: string;
  label: string;
  role: 'subject' | 'alternative' | 'excluded';
  state: string; // HATI decision token (data), for the semantic fill class
  at: Pt; // projected position in [0,1]
  lonlat: LonLat; // authentic coordinate
  aria: string;
  scan: ScenarioNodeScan;
}

export interface TickLabel {
  /** position along the axis in [0,1] */
  t: number;
  label: string;
}

export interface TerritoryScenarioView {
  id: string;
  label: string;
  context?: string;
  /** the territory the assets sit in (e.g. "Madrid"), for a geographic caption */
  territoryLabel?: string;
  bbox: [number, number, number, number];
  /** span of the framed area in metres, for an honest scale note */
  spanMeters: { x: number; y: number };
  marks: MapMark[];
  lonTicks: TickLabel[];
  latTicks: TickLabel[];
  /** subject coordinate, for a region-scale locator on module 01 */
  subjectLonLat?: LonLat;
}

function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}

/** A few labelled coordinate ticks so the frame reads as real geography. */
function ticks(min: number, max: number): TickLabel[] {
  const span = max - min;
  if (span <= 0) return [];
  // choose a "nice" step giving ~3 ticks
  const raw = span / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag;
  const out: TickLabel[] = [];
  for (let v = roundTo(min, step); v <= max; v += step) {
    if (v < min) continue;
    out.push({ t: (v - min) / span, label: v.toFixed(3) });
  }
  return out;
}

export function buildTerritoryScenario(
  data: AtlasData,
  scenarioId: string,
): TerritoryScenarioView | null {
  const view = buildScenarioView(data, scenarioId);
  if (!view) return null;

  const nodes = [view.subject, ...view.alternatives, ...view.excluded];
  const positioned = nodes.filter((n) => n.position);
  const points = positioned.map((n) => n.position as LonLat);
  const bbox = frameBBox(points, 0.12);
  const project = makeProjector(bbox);

  const territoryLabel = (() => {
    const tid = (data.assets ?? []).find((a) => a.id === view.subject.assetId)?.territoryId;
    return data.territories.find((t) => t.id === tid)?.label;
  })();

  const marks: MapMark[] = positioned.map((n) => {
    const lonlat = n.position as LonLat;
    return {
      decisionId: n.decisionId,
      assetId: n.assetId,
      label: n.label,
      role: n.role,
      state: n.state,
      at: project(lonlat),
      lonlat,
      aria: [
        n.role === 'subject'
          ? `source asset: ${n.label}`
          : n.role === 'excluded'
            ? `excluded candidate: ${n.label}`
            : `alternative: ${n.label}`,
        n.stateLabel,
        n.role === 'excluded' && n.constraintLabel ? `excluded because ${n.constraintLabel}` : '',
        n.evidenceStatusLabel,
        formatCoord(lonlat),
      ]
        .filter(Boolean)
        .join(', '),
      scan: scenarioNodeScan({ id: view.id, label: view.label }, n),
    };
  });

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const midLat = (minLat + maxLat) / 2;
  const spanMeters = {
    x: (maxLon - minLon) * 111_320 * Math.cos((midLat * Math.PI) / 180),
    y: (maxLat - minLat) * 110_540,
  };

  return {
    id: view.id,
    label: view.label,
    context: view.context,
    territoryLabel,
    bbox,
    spanMeters,
    marks,
    lonTicks: ticks(minLon, maxLon),
    latTicks: ticks(minLat, maxLat),
    subjectLonLat: view.subject.position,
  };
}
