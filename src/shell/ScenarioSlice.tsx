import { useMemo } from 'react';
import type { AtlasData } from '../data/types';
import { listScenarios } from '../adapters/hati';
import { buildTerritoryScenario } from '../adapters/territoryScenario';
import { useField } from '../interaction/FieldContext';
import { Module } from './Module';
import { ScenarioField } from '../viz/ScenarioField';
import { TerritoryScenario } from '../viz/TerritoryScenario';

/**
 * SCENARIO slice — the HATI Madrid heat-refuge scenarios. Selection lives in the
 * shared FIELD interaction context (single source of truth), so the abstract
 * access field and the geographic Madrid view reflect the SAME scenario, and a
 * focused asset reports the same decision identity in both. FAB recomputes
 * nothing — all state is real HATI decision output.
 */
export function ScenarioSlice({ data }: { data: AtlasData }) {
  const scenarios = useMemo(() => listScenarios(data), [data]);
  const { scenarioId, selectScenario } = useField();
  const current = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  const geo = useMemo(
    () => (current ? buildTerritoryScenario(data, current.id) : null),
    [data, current],
  );

  if (!current) return null;

  const spanX = geo ? Math.round(geo.spanMeters.x) : 0;
  const spanY = geo ? Math.round(geo.spanMeters.y) : 0;

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
            role="group"
            aria-label="Select a HATI heat-refuge scenario"
          >
            {scenarios.map((s) => {
              const active = s.id === current.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  className={`slice__tab${active ? ' is-active' : ''}`}
                  onClick={() => selectScenario(s.id)}
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

            <div className="slice__views">
              <figure className="slice__view">
                <figcaption className="u-micro slice__view-cap">
                  ACCESS FIELD · relationships
                </figcaption>
                <ScenarioField data={data} scenarioId={current.id} />
              </figure>
              <figure className="slice__view">
                <figcaption className="u-micro slice__view-cap">
                  {geo?.territoryLabel ?? 'TERRITORY'} · real coordinates
                  {geo ? ` · ~${spanX}×${spanY} m straight-line` : ''}
                </figcaption>
                <TerritoryScenario data={data} scenarioId={current.id} />
              </figure>
            </div>
          </div>
        </div>
      </Module>
    </section>
  );
}
