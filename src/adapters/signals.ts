import type { AtlasData, SignalKind } from '../data/types';
import { kindForId, labelForId } from '../data/index';

export interface GraphNode {
  id: string;
  label: string;
  type: 'project' | 'territory' | 'source' | 'unknown';
  x: number; // 0..1
  y: number; // 0..1
  degree: number; // number of incident signals
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: SignalKind;
  strength?: number;
  active: boolean;
  a: { x: number; y: number };
  b: { x: number; y: number };
}

export interface SignalGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Group ordering keeps like entities adjacent on the ring — a stable, readable,
// crossing-reducing layout without a live force simulation.
const TYPE_ORDER: Record<GraphNode['type'], number> = {
  project: 0,
  territory: 1,
  source: 2,
  unknown: 3,
};

/**
 * Deterministic radial layout of the signal graph. No force simulation, no
 * animation loop: node positions are a pure function of the data, so the graph
 * renders identically every time and needs no rAF.
 */
export function buildSignalGraph(data: AtlasData): SignalGraph {
  const degree = new Map<string, number>();
  const ids = new Set<string>();
  for (const s of data.signals) {
    ids.add(s.from);
    ids.add(s.to);
    degree.set(s.from, (degree.get(s.from) ?? 0) + 1);
    degree.set(s.to, (degree.get(s.to) ?? 0) + 1);
  }

  const ordered = [...ids].sort((a, b) => {
    const ta = kindForId(data, a);
    const tb = kindForId(data, b);
    if (TYPE_ORDER[ta] !== TYPE_ORDER[tb]) return TYPE_ORDER[ta] - TYPE_ORDER[tb];
    return a.localeCompare(b);
  });

  const n = ordered.length;
  const cx = 0.5;
  const cy = 0.5;
  const r = 0.38;
  const pos = new Map<string, { x: number; y: number }>();

  ordered.forEach((id, i) => {
    // Start at the top (-90°) and go clockwise for a predictable reading order.
    const theta = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
    pos.set(id, { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
  });

  const nodes: GraphNode[] = ordered.map((id) => {
    const p = pos.get(id)!;
    return {
      id,
      label: labelForId(data, id) ?? id,
      type: kindForId(data, id),
      x: p.x,
      y: p.y,
      degree: degree.get(id) ?? 0,
    };
  });

  const edges: GraphEdge[] = data.signals.map((s) => ({
    id: s.id,
    from: s.from,
    to: s.to,
    kind: s.kind,
    strength: s.strength,
    active: s.active,
    a: pos.get(s.from)!,
    b: pos.get(s.to)!,
  }));

  return { nodes, edges };
}
