import { useMemo } from 'react';
import type { AtlasData } from '../data/types';
import { buildTerritoryScenario, type MapMark } from '../adapters/territoryScenario';
import { useField } from '../interaction/FieldContext';

const V = 100;

// decision_state → semantic fill class (same grammar as the abstract SCENARIO
// field: warm = avoid outdoor, cool = indoor refuge — HATI's own channel).
const STATE_CLASS: Record<string, string> = {
  AVOID_PROLONGED_OUTDOOR_EXPOSURE: 'avoid',
  INDOOR_REFUGE: 'refuge',
};

/**
 * TERRITORY × SCENARIO — the authentic HATI scenario read in real Madrid
 * geography. Reuses the ONE territory projection and the Phase-2 mark grammar;
 * marks sit at their authentic coordinates (no jitter, no routes). Role
 * (subject / alternative / excluded) and every decision field come straight
 * from the existing Decision outputs — nothing is recomputed here. Each mark is
 * keyboard-focusable and drives the FIELD SCANNER with the same decision
 * identity as the abstract field.
 */
export function TerritoryScenario({
  data,
  scenarioId,
}: {
  data: AtlasData;
  scenarioId: string;
}) {
  const view = useMemo(() => buildTerritoryScenario(data, scenarioId), [data, scenarioId]);
  const { scan, setScan, clearScan } = useField();

  if (!view) {
    return (
      <svg className="viz-svg" viewBox={`0 0 ${V} ${V}`} role="img" aria-label="No scenario selected" />
    );
  }

  const order: Record<MapMark['role'], number> = { excluded: 0, alternative: 1, subject: 2 };
  const marks = [...view.marks].sort((a, b) => order[a.role] - order[b.role]);

  return (
    <svg
      className="viz-svg scenario geo"
      viewBox={`0 0 ${V} ${V}`}
      role="group"
      aria-label={`Scenario ${view.id} on the ${view.territoryLabel ?? 'territory'} map: ${view.marks.length} located assets at authentic coordinates.`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* coordinate graticule with real lon/lat tick labels — geographic honesty */}
      {view.lonTicks.map((t) => (
        <g key={`lon-${t.t}`}>
          <line className="geo__grid" x1={t.t * V} y1={0} x2={t.t * V} y2={V} />
          <text className="geo__tick" x={t.t * V + 0.6} y={V - 0.8}>
            {t.label}
          </text>
        </g>
      ))}
      {view.latTicks.map((t) => (
        <g key={`lat-${t.t}`}>
          <line className="geo__grid" x1={0} y1={(1 - t.t) * V} x2={V} y2={(1 - t.t) * V} />
          <text className="geo__tick" x={0.6} y={(1 - t.t) * V - 0.8}>
            {t.label}
          </text>
        </g>
      ))}

      {marks.map((m) => {
        const focused = scan?.elementId === m.decisionId;
        const isSubject = m.role === 'subject';
        const r = isSubject ? 2.8 : 1.9;
        return (
          <g
            key={m.decisionId}
            className={`sc-node sc-node--${m.role} sc-state--${STATE_CLASS[m.state] ?? 'other'}${focused ? ' is-focused' : ''}`}
            tabIndex={0}
            role="img"
            aria-label={m.aria}
            onMouseEnter={() => setScan(m.scan)}
            onFocus={() => setScan(m.scan)}
            onMouseLeave={() => clearScan(m.decisionId)}
            onBlur={() => clearScan(m.decisionId)}
          >
            {isSubject && <circle className="geo__subject-halo" cx={m.at.x * V} cy={m.at.y * V} r={r + 1.8} />}
            <circle className="sc-dot" cx={m.at.x * V} cy={m.at.y * V} r={focused ? r + 0.8 : r} />
            {m.role === 'excluded' && (
              <line
                className="sc-excl"
                x1={m.at.x * V - r}
                y1={m.at.y * V - r}
                x2={m.at.x * V + r}
                y2={m.at.y * V + r}
              />
            )}
            {(isSubject || focused) && (
              <text className="sc-label" x={m.at.x * V} y={m.at.y * V - r - 1.6} textAnchor="middle">
                {m.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
