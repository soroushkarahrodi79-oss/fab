import { lazy, Suspense, useMemo } from 'react';
import type { AtlasData } from '../data/types';
import { deriveFieldState } from '../adapters/fieldState';
import { earthProvenance } from '../adapters/earth';
import { buildTerritoryScenario } from '../adapters/territoryScenario';
import { useField } from '../interaction/FieldContext';
import { Masthead } from './Masthead';
import { Module } from './Module';
import { ScenarioSlice } from './ScenarioSlice';
import { TerritoryMap } from '../viz/TerritoryMap';
import { SignalGraph } from '../viz/SignalGraph';
import { FieldStateCore } from '../viz/FieldStateCore';
import { FieldScanner } from '../interaction/FieldScanner';

// EARTH is the only Canvas module — code-split so its draw logic stays out of
// the initial bundle and loads on demand.
const EarthField = lazy(() => import('../viz/EarthField'));

export function Shell({ data }: { data: AtlasData }) {
  const fs = useMemo(() => deriveFieldState(data), [data]);
  const { scenarioId } = useField();
  // The active scenario's subject, pinned on the region map so TERRITORY reflects
  // the same selection as SCENARIO (shared state, no duplication).
  const territoryLocator = useMemo(() => {
    if (!scenarioId) return undefined;
    return buildTerritoryScenario(data, scenarioId)?.marks.find((m) => m.role === 'subject');
  }, [data, scenarioId]);

  return (
    <div className="shell">
      <Masthead updatedAt={fs.updatedAt} />

      <main className="atlas" aria-label="Field atlas">
        <div className="atlas__cell atlas__cell--territory">
          <Module
            code="01"
            title="TERRITORY"
            meta={`${data.territories.length} areas`}
            state={data.territories.length ? 'idle' : 'empty'}
          >
            <TerritoryMap data={data} locator={territoryLocator} />
          </Module>
        </div>

        <div className="atlas__cell atlas__cell--core">
          <FieldStateCore data={data} />
        </div>

        <div className="atlas__cell atlas__cell--earth">
          <Module
            code="02"
            title="EARTH"
            meta={`EO · ${earthProvenance.source}`}
            state={data.observations.length ? 'idle' : 'empty'}
          >
            <Suspense fallback={<div className="viz-skeleton" aria-hidden="true" />}>
              <EarthField data={data} />
            </Suspense>
          </Module>
        </div>

        <div className="atlas__cell atlas__cell--signals">
          <Module
            code="03"
            title="SIGNALS"
            meta={`${data.signals.length} relations`}
            state={data.signals.length ? 'idle' : 'empty'}
          >
            <SignalGraph data={data} />
          </Module>
        </div>

        <div className="atlas__cell atlas__cell--scanner">
          <FieldScanner />
        </div>
      </main>

      {(data.scenarios?.length ?? 0) > 0 && <ScenarioSlice data={data} />}
    </div>
  );
}
