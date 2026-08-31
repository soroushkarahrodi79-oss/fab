import { useMemo } from 'react';
import type { AtlasData } from '../data/types';
import { projectTerritories, formatCoord } from '../adapters/territory';
import { useField } from '../interaction/FieldContext';

const V = 100; // viewBox units

const KIND_LABEL: Record<string, string> = {
  urban: 'urban',
  protected: 'protected',
  range: 'range',
  transition: 'transition',
};

/**
 * TERRITORY — SVG cartographic instrument. A handful of projected GeoJSON
 * features with native hit-testing and accessible labels. No WebGL, no tiles.
 * Purely presentational: consumes the projected view model.
 */
export function TerritoryMap({ data }: { data: AtlasData }) {
  const view = useMemo(() => projectTerritories(data), [data]);
  const { scan, setScan, clearScan } = useField();

  return (
    <svg
      className="viz-svg"
      viewBox={`0 0 ${V} ${V}`}
      role="group"
      aria-label="Territory map: research areas around Madrid"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* graticule ticks — coordinate context, static */}
      {[0.25, 0.5, 0.75].map((t) => (
        <g key={t} stroke="var(--panel-line)" strokeWidth={0.15}>
          <line x1={t * V} y1={0} x2={t * V} y2={V} />
          <line x1={0} y1={t * V} x2={V} y2={t * V} />
        </g>
      ))}

      {/* territory polygons */}
      {view.shapes.map((s) => {
        const focused = scan?.elementId === s.id;
        const evidence = `${KIND_LABEL[s.kind]} · ${s.observationCount} obs`;
        return (
          <g
            key={s.id}
            className={`territory${focused ? ' is-focused' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`${s.label}${s.code ? ` (${s.code})` : ''}, ${KIND_LABEL[s.kind]}, ${s.observationCount} observations`}
            onMouseEnter={() =>
              setScan({
                elementId: s.id,
                module: 'territory',
                coord: formatCoord(s.lonlat),
                territory: s.code ? `${s.label} · ${s.code}` : s.label,
                evidence,
              })
            }
            onFocus={() =>
              setScan({
                elementId: s.id,
                module: 'territory',
                coord: formatCoord(s.lonlat),
                territory: s.code ? `${s.label} · ${s.code}` : s.label,
                evidence,
              })
            }
            onMouseLeave={() => clearScan(s.id)}
            onBlur={() => clearScan(s.id)}
          >
            {s.rings.map((ring, i) => (
              <polygon
                key={i}
                points={ring.map((p) => `${p.x * V},${p.y * V}`).join(' ')}
                className="territory__poly"
              />
            ))}
            <circle cx={s.centroid.x * V} cy={s.centroid.y * V} r={0.9} className="territory__dot" />
            <text
              x={s.centroid.x * V}
              y={s.centroid.y * V - 2.4}
              className="territory__label"
              textAnchor="middle"
            >
              {s.code ?? s.label}
            </text>
          </g>
        );
      })}

      {/* observation marks */}
      {view.observations.map((o) => {
        const focused = scan?.elementId === o.id;
        return (
          <g
            key={o.id}
            className={`obs obs--${o.validated ? 'ok' : 'flag'}${focused ? ' is-focused' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`Observation ${o.variable}${o.validated ? ', validated' : ', unvalidated'}, source ${o.source ?? 'unknown'}`}
            onMouseEnter={() =>
              setScan({
                elementId: o.id,
                module: 'territory',
                coord: formatCoord(o.lonlat),
                source: o.source,
                evidence: `${o.variable}${o.validated ? ' · validated' : ' · flagged'}`,
              })
            }
            onFocus={() =>
              setScan({
                elementId: o.id,
                module: 'territory',
                coord: formatCoord(o.lonlat),
                source: o.source,
                evidence: `${o.variable}${o.validated ? ' · validated' : ' · flagged'}`,
              })
            }
            onMouseLeave={() => clearScan(o.id)}
            onBlur={() => clearScan(o.id)}
          >
            <circle cx={o.at.x * V} cy={o.at.y * V} r={focused ? 1.4 : 0.7} />
          </g>
        );
      })}
    </svg>
  );
}
