import { useMemo, useState } from 'react';
import type { AtlasData } from '../data/types';
import { listScenarios } from '../adapters/hati';
import { Module } from './Module';
import { ScenarioField } from '../viz/ScenarioField';

/**
 * SCENARIO slice — the Phase 2 authentic vertical: HATI Madrid heat-refuge
 * scenarios. Owns the selected-scenario interaction (keyboard + pointer) and
 * frames the evidence field with an explicit provenance / limitations caption.
 * All information here is real HATI decision output; FAB recomputes nothing.
 */
export function ScenarioSlice({ data }: { data: AtlasData }) {
  const scenarios = useMemo(() => listScenarios(data), [data]);
  const [selected, setSelected] = useState(scenarios[0]?.id ?? '');
  const current = scenarios.find((s) => s.id === selected) ?? scenarios[0];

  if (!current) return null;

  return (
    <section className="slice" aria-label="HATI Madrid scenarios">
      <Module
        code="04"
        title="SCENARIO"
        meta={`HATI · ${scenarios.length} scenarios`}
        state="idle"
      >
        <div className="slice__body">
          <div
            className="slice__picker"
            role="tablist"
            aria-label="Select a HATI heat-refuge scenario"
          >
            {scenarios.map((s) => {
              const active = s.id === current.id;
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={active}
                  className={`slice__tab${active ? ' is-active' : ''}`}
                  onClick={() => setSelected(s.id)}
                >
                  <span className="slice__tab-id u-micro">{s.id}</span>
                  <span className="slice__tab-label">{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="slice__stage">
            <header className="slice__caption">
              <div className="slice__scenario-desc">
                <span className="u-micro slice__ctx">{current.context}</span>
                {current.counts.alternatives} alternatives · {current.counts.excluded} excluded
              </div>
              <div className="slice__legend u-micro" aria-hidden="true">
                <span className="slice__key slice__key--avoid">avoid outdoor</span>
                <span className="slice__key slice__key--refuge">indoor refuge</span>
                <span className="slice__key">ring = confidence</span>
                <span className="slice__key">⊘ excluded</span>
              </div>
              <p className="slice__provenance u-micro">
                Source: HATI Madrid (heat-adaptive-tourism-madrid) · Phase 3 decision
                CSVs. 3 modelled timestamps for one historical heat episode
                (2023-08-21) — not live or forecast. Thermal values are modelled
                (SOLWEIG/UTCI), never field-measured; indoor assets are not
                thermally modelled. Distances are straight-line. Assets ©
                OpenStreetMap (ODbL). This is screening, not a prediction of choice.
              </p>
            </header>
            <ScenarioField data={data} scenarioId={current.id} />
          </div>
        </div>
      </Module>
    </section>
  );
}
