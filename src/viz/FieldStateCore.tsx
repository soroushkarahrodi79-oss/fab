import { useMemo } from 'react';
import type { AtlasData } from '../data/types';
import { deriveFieldState } from '../adapters/fieldState';

const V = 100;
const R = 40;
const C = 2 * Math.PI * R;

/**
 * FIELD STATE — the central organism. Not a portrait or a giant name: a compact
 * instrument readout whose every mark derives from the data (see
 * deriveFieldState). Static by design — it is alive through meaning, not motion.
 */
export function FieldStateCore({ data }: { data: AtlasData }) {
  const fs = useMemo(() => deriveFieldState(data), [data]);

  // Outer ring: FIELD-validated fraction of observations (field validation only,
  // not evidence quality — see deriveFieldState / Observation contract).
  const validatedArc = C * fs.validatedRatio;

  // Signal ticks: one mark per active signal, evenly spaced.
  const ticks = Array.from({ length: fs.activeSignals }, (_, i) => {
    const theta = -Math.PI / 2 + (i / Math.max(1, fs.activeSignals)) * Math.PI * 2;
    return {
      x1: 50 + (R - 4) * Math.cos(theta),
      y1: 50 + (R - 4) * Math.sin(theta),
      x2: 50 + (R + 4) * Math.cos(theta),
      y2: 50 + (R + 4) * Math.sin(theta),
    };
  });

  return (
    <div className="core" role="group" aria-label="Field state summary">
      <svg
        className="core__dial"
        viewBox={`0 0 ${V} ${V}`}
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle cx={50} cy={50} r={R} className="core__track" />
        <circle
          cx={50}
          cy={50}
          r={R}
          className="core__arc"
          strokeDasharray={`${validatedArc} ${C - validatedArc}`}
          transform="rotate(-90 50 50)"
        />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="core__tick" />
        ))}
        <circle cx={50} cy={50} r={2} className="core__hub" />
      </svg>

      <div className="core__center">
        <div className="u-micro core__eyebrow">FIELD STATE</div>
        <div className="core__figure">{fs.activeProjects}</div>
        <div className="u-micro">active projects</div>
      </div>

      <dl className="core__readout u-micro">
        <div><dt>SIGNALS</dt><dd>{fs.activeSignals} active</dd></div>
        <div><dt>TERRITORIES</dt><dd>{fs.territories}</dd></div>
        <div><dt>EXPERIMENTS</dt><dd>{fs.experiments}</dd></div>
        <div><dt>OBSERVATIONS</dt><dd>{fs.observations}</dd></div>
        <div><dt>FIELD-VALIDATED</dt><dd>{Math.round(fs.validatedRatio * 100)}%</dd></div>
        <div><dt>FOCUS</dt><dd>{fs.dominantDomain ?? '—'}</dd></div>
      </dl>

      <p className="u-sr-only">
        Field state: {fs.activeProjects} active projects, {fs.experiments} experiments,
        {fs.activeSignals} active signals across {fs.territories} territories,
        {fs.observations} observations of which {Math.round(fs.validatedRatio * 100)} percent
        field-validated. Dominant research focus: {fs.dominantDomain ?? 'none'}.
      </p>
    </div>
  );
}
