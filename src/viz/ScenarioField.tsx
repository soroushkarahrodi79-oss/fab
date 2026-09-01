import { useMemo } from 'react';
import type { AtlasData } from '../data/types';
import { buildScenarioView, type ScenarioNode } from '../adapters/hati';
import { useField } from '../interaction/FieldContext';

const V = 100;

// decision_state → semantic fill class (consumes HATI's locked token; the
// mapping is HATI's own — rust = avoid outdoor, teal = indoor refuge).
const STATE_CLASS: Record<string, string> = {
  AVOID_PROLONGED_OUTDOOR_EXPOSURE: 'avoid',
  INDOOR_REFUGE: 'refuge',
};
// decision_confidence → ring style (HATI Visual Semantics §6).
const RING_CLASS: Record<string, string> = {
  ROBUST: 'solid',
  BOUNDARY: 'dashed',
  UNSTABLE: 'dotted',
  INDOOR_BYPASS: 'none',
};
// evidence_confidence → opacity channel (HATI EVIDENCE_OPACITY).
const EVIDENCE_OPACITY: Record<string, number> = { HIGH: 1, MODERATE: 0.66, LOW: 0.4 };

function scanFor(view: { id: string; label: string }, n: ScenarioNode) {
  const statusText =
    n.role === 'excluded'
      ? `Excluded — ${n.constraintLabel ?? n.constraintReason ?? 'constraint'}`
      : n.role === 'subject'
        ? 'Source · heat-exposed'
        : 'Alternative';
  return {
    elementId: n.decisionId,
    module: 'scenario' as const,
    coord: n.coord,
    asset: `${n.label} · ${n.category}`,
    scenario: `${view.id} · ${view.label}`,
    decision: `${n.stateLabel}${n.confidenceLabel ? ` · ${n.confidenceLabel}` : ''}`,
    status: statusText,
    source: n.sourceLabel,
    evidence: `${n.evidenceStatusLabel}${n.utci != null ? ` · UTCI ${n.utci}°C` : ''}`,
  };
}

function ariaFor(n: ScenarioNode): string {
  const role =
    n.role === 'subject' ? 'source asset' : n.role === 'excluded' ? 'excluded candidate' : 'alternative';
  const bits = [
    `${role}: ${n.label}`,
    n.stateLabel,
    n.confidenceLabel && `confidence ${n.confidenceLabel}`,
    n.role === 'excluded' && n.constraintLabel && `excluded because ${n.constraintLabel}`,
    n.evidenceStatusLabel,
    n.utci != null && `UTCI ${n.utci} degrees`,
    n.distanceM != null && `${Math.round(n.distanceM)} metres away`,
  ].filter(Boolean);
  return bits.join(', ');
}

/**
 * SCENARIO — SVG evidence field. One heat-exposed source asset at the centre;
 * its candidate alternatives placed by REAL access geography (bearing + straight-
 * line distance), not by rank. Fill encodes HATI's decision_state, ring encodes
 * decision_confidence, opacity encodes evidence_confidence. Every mark is a real
 * HATI decision; nothing is recomputed here. Each node is keyboard-focusable and
 * drives the FIELD SCANNER identically to hover.
 */
export function ScenarioField({ data, scenarioId }: { data: AtlasData; scenarioId: string }) {
  const view = useMemo(() => buildScenarioView(data, scenarioId), [data, scenarioId]);
  const { scan, setScan, clearScan } = useField();

  if (!view) {
    return (
      <svg className="viz-svg" viewBox={`0 0 ${V} ${V}`} role="img" aria-label="No scenario selected" />
    );
  }

  const nodes: ScenarioNode[] = [...view.excluded, ...view.alternatives, view.subject];

  return (
    <svg
      className="viz-svg scenario"
      viewBox={`0 0 ${V} ${V}`}
      role="group"
      aria-label={`Scenario ${view.id}: ${view.label}. ${view.counts.alternatives} alternatives, ${view.counts.excluded} excluded. ${view.summary ?? ''}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* edges: subject → each candidate (drawn first, under the nodes) */}
      {[...view.alternatives, ...view.excluded].map((n) => (
        <line
          key={`edge-${n.decisionId}`}
          className={`sc-edge sc-edge--${n.role}`}
          x1={view.subject.x * V}
          y1={view.subject.y * V}
          x2={n.x * V}
          y2={n.y * V}
        />
      ))}

      {/* nodes */}
      {nodes.map((n) => {
        const focused = scan?.elementId === n.decisionId;
        const isSubject = n.role === 'subject';
        const r = isSubject ? 3.6 : 2.4;
        const ring = RING_CLASS[n.confidence ?? ''] ?? 'none';
        const opacity = EVIDENCE_OPACITY[n.evidenceConfidence ?? ''] ?? 1;
        return (
          <g
            key={n.decisionId}
            className={`sc-node sc-node--${n.role} sc-state--${STATE_CLASS[n.state] ?? 'other'}${focused ? ' is-focused' : ''}`}
            style={{ opacity }}
            tabIndex={0}
            // An inspectable data mark, not a control: it is focusable so its
            // evidence reaches the FIELD SCANNER by keyboard as well as pointer,
            // but it has no activation, so it must not claim button semantics.
            // role="img" announces the full label without promising an action.
            role="img"
            aria-label={ariaFor(n)}
            onMouseEnter={() => setScan(scanFor(view, n))}
            onFocus={() => setScan(scanFor(view, n))}
            onMouseLeave={() => clearScan(n.decisionId)}
            onBlur={() => clearScan(n.decisionId)}
          >
            {/* confidence ring */}
            {ring !== 'none' && (
              <circle className={`sc-ring sc-ring--${ring}`} cx={n.x * V} cy={n.y * V} r={r + 1.4} />
            )}
            <circle className="sc-dot" cx={n.x * V} cy={n.y * V} r={focused ? r + 0.8 : r} />
            {/* excluded marker: a small slash so it reads as excluded without colour alone */}
            {n.role === 'excluded' && (
              <line className="sc-excl" x1={n.x * V - r} y1={n.y * V - r} x2={n.x * V + r} y2={n.y * V + r} />
            )}
            {/* Instrument posture: only the subject is always labelled; other
                nodes reveal their label on focus/hover. Full identity is always
                available via aria-label and the FIELD SCANNER, so nothing is
                hidden from keyboard or assistive tech. */}
            {(isSubject || focused) && (
              <text className="sc-label" x={n.x * V} y={n.y * V - r - 1.6} textAnchor="middle">
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
