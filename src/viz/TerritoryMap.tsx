import { useMemo } from 'react';
import type { AtlasData, EvidenceStatus } from '../data/types';
import { projectTerritories, makeProjector, formatCoord } from '../adapters/territory';
import type { MapMark } from '../adapters/territoryScenario';
import { useField } from '../interaction/FieldContext';

const V = 100; // viewBox units

const KIND_LABEL: Record<string, string> = {
  urban: 'urban',
  protected: 'protected',
  range: 'range',
  transition: 'transition',
};

/**
 * Generic (FAB-owned) plain labels for the evidence PRODUCTION-status channel.
 * Neutral wording only — a production status is never a verdict on quality.
 */
const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  observed: 'Observed',
  documented: 'Documented',
  derived: 'Derived',
  modelled: 'Modelled',
  simulated: 'Simulated',
};

/**
 * TERRITORY — SVG cartographic instrument. A handful of projected GeoJSON
 * features with native hit-testing and accessible labels. No WebGL, no tiles.
 * Purely presentational: consumes the projected view model.
 */
export function TerritoryMap({
  data,
  locator,
}: {
  data: AtlasData;
  /**
   * Optional region-scale locator for an active selection (e.g. the current
   * scenario's subject). Generic: any located mark can be pinned here. When
   * absent the map renders exactly as before — Phase 1 behaviour is untouched.
   */
  locator?: MapMark;
}) {
  const view = useMemo(() => projectTerritories(data), [data]);
  const { scan, setScan, clearScan } = useField();
  const locAt = locator ? makeProjector(view.bbox)(locator.lonlat) : null;

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

      {/* observation marks — the mark's appearance encodes the EVIDENCE
          PRODUCTION status (categorical), never the field-validation boolean.
          A derived value that is not yet field-validated is sound evidence,
          so it is never drawn as an alert/flag. */}
      {view.observations.map((o) => {
        const focused = scan?.elementId === o.id;
        const statusLabel = EVIDENCE_STATUS_LABEL[o.evidenceStatus];
        const fieldVal = o.validated ? 'Field-validated' : 'Not field-validated';
        return (
          <g
            key={o.id}
            className={`obs obs--${o.evidenceStatus}${focused ? ' is-focused' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`Observation ${o.variable}, ${statusLabel} evidence, ${fieldVal.toLowerCase()}, source ${o.source ?? 'unknown'}`}
            onMouseEnter={() =>
              setScan({
                elementId: o.id,
                module: 'territory',
                coord: formatCoord(o.lonlat),
                source: o.source,
                evidence: `${o.variable} · ${statusLabel}`,
                fieldValidation: fieldVal,
              })
            }
            onFocus={() =>
              setScan({
                elementId: o.id,
                module: 'territory',
                coord: formatCoord(o.lonlat),
                source: o.source,
                evidence: `${o.variable} · ${statusLabel}`,
                fieldValidation: fieldVal,
              })
            }
            onMouseLeave={() => clearScan(o.id)}
            onBlur={() => clearScan(o.id)}
          >
            <circle cx={o.at.x * V} cy={o.at.y * V} r={focused ? 1.4 : 0.7} />
          </g>
        );
      })}

      {/* active-scenario locator: a crosshair pinning the scenario subject in
          the region, so TERRITORY visibly reflects the shared selection. */}
      {locator && locAt && (
        <g
          className={`territory-locator${scan?.elementId === locator.decisionId ? ' is-focused' : ''}`}
          tabIndex={0}
          role="img"
          aria-label={`Active scenario location: ${locator.label} (${formatCoord(locator.lonlat)})`}
          onMouseEnter={() => setScan(locator.scan)}
          onFocus={() => setScan(locator.scan)}
          onMouseLeave={() => clearScan(locator.decisionId)}
          onBlur={() => clearScan(locator.decisionId)}
        >
          <circle className="territory-locator__ring" cx={locAt.x * V} cy={locAt.y * V} r={2.6} />
          <line className="territory-locator__x" x1={locAt.x * V - 3.6} y1={locAt.y * V} x2={locAt.x * V + 3.6} y2={locAt.y * V} />
          <line className="territory-locator__x" x1={locAt.x * V} y1={locAt.y * V - 3.6} x2={locAt.x * V} y2={locAt.y * V + 3.6} />
          <text className="territory-locator__label" x={locAt.x * V + 3} y={locAt.y * V - 3} textAnchor="start">
            scenario
          </text>
        </g>
      )}
    </svg>
  );
}
