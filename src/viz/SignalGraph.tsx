import { useMemo } from 'react';
import type { AtlasData } from '../data/types';
import { buildSignalGraph } from '../adapters/signals';
import { labelForId } from '../data/index';
import { useField } from '../interaction/FieldContext';

const V = 100;

const NODE_ROLE: Record<string, string> = {
  project: 'project',
  territory: 'territory',
  source: 'source',
  unknown: 'node',
};

/**
 * SIGNALS — SVG relationship graph. Nodes and edges come from the signals data
 * file via a deterministic precomputed layout (no force simulation, no rAF).
 * Edges encode real relationships; nothing here is decorative.
 */
export function SignalGraph({ data }: { data: AtlasData }) {
  const graph = useMemo(() => buildSignalGraph(data), [data]);
  const { scan, setScan, clearScan } = useField();

  return (
    <svg
      className="viz-svg"
      viewBox={`0 0 ${V} ${V}`}
      role="group"
      aria-label="Signal graph: relationships among projects, sources and territories"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* edges first so nodes sit on top */}
      {graph.edges.map((e) => {
        const focused = scan?.elementId === e.id;
        const fromL = labelForId(data, e.from) ?? e.from;
        const toL = labelForId(data, e.to) ?? e.to;
        return (
          <g
            key={e.id}
            className={`edge edge--${e.active ? 'active' : 'idle'}${focused ? ' is-focused' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`Signal: ${fromL} ${e.kind.replace('-', ' ')} ${toL}, strength ${e.strength.toFixed(2)}, ${e.active ? 'active' : 'planned'}`}
            onMouseEnter={() =>
              setScan({
                elementId: e.id,
                module: 'signals',
                signal: `${fromL} → ${toL}`,
                evidence: `${e.kind} · ${e.active ? 'active' : 'planned'}`,
              })
            }
            onFocus={() =>
              setScan({
                elementId: e.id,
                module: 'signals',
                signal: `${fromL} → ${toL}`,
                evidence: `${e.kind} · ${e.active ? 'active' : 'planned'}`,
              })
            }
            onMouseLeave={() => clearScan(e.id)}
            onBlur={() => clearScan(e.id)}
          >
            <line
              x1={e.a.x * V}
              y1={e.a.y * V}
              x2={e.b.x * V}
              y2={e.b.y * V}
              strokeWidth={0.4 + e.strength * 1.1}
            />
          </g>
        );
      })}

      {/* nodes */}
      {graph.nodes.map((n) => {
        const focused = scan?.elementId === n.id;
        const r = 1.6 + n.degree * 0.7;
        const key: 'project' | 'source' | 'territory' =
          n.type === 'unknown' ? 'project' : n.type;
        return (
          <g
            key={n.id}
            className={`node node--${n.type}${focused ? ' is-focused' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`${NODE_ROLE[n.type]} ${n.label}, ${n.degree} signals`}
            onMouseEnter={() =>
              setScan({
                elementId: n.id,
                module: 'signals',
                [key]: n.label,
                evidence: `${NODE_ROLE[n.type]} · ${n.degree} signals`,
              })
            }
            onFocus={() =>
              setScan({
                elementId: n.id,
                module: 'signals',
                [key]: n.label,
                evidence: `${NODE_ROLE[n.type]} · ${n.degree} signals`,
              })
            }
            onMouseLeave={() => clearScan(n.id)}
            onBlur={() => clearScan(n.id)}
          >
            <circle cx={n.x * V} cy={n.y * V} r={focused ? r + 0.8 : r} />
            <text x={n.x * V} y={n.y * V - r - 1.4} className="node__label" textAnchor="middle">
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
