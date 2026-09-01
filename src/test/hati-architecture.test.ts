import { describe, it, expect } from 'vitest';
// Viz sources imported as raw strings (bundler-native, no filesystem access).
import earthSrc from '../viz/EarthField.tsx?raw';
import territorySrc from '../viz/TerritoryMap.tsx?raw';
import signalSrc from '../viz/SignalGraph.tsx?raw';
import coreSrc from '../viz/FieldStateCore.tsx?raw';
import scenarioSrc from '../viz/ScenarioField.tsx?raw';
import territoryScenarioSrc from '../viz/TerritoryScenario.tsx?raw';

/**
 * Architecture boundary: the visualisation layer must never touch raw HATI
 * source files. Viz consumes finished view models from the adapter only, so the
 * data becoming real (or being refreshed) can never force a viz change (Q4).
 */
const vizFiles: Array<[string, string]> = [
  ['EarthField.tsx', earthSrc],
  ['TerritoryMap.tsx', territorySrc],
  ['SignalGraph.tsx', signalSrc],
  ['FieldStateCore.tsx', coreSrc],
  ['ScenarioField.tsx', scenarioSrc],
  ['TerritoryScenario.tsx', territoryScenarioSrc],
];

describe('architecture — viz never parses raw HATI files', () => {
  for (const [name, src] of vizFiles) {
    it(`${name} does not read raw CSV / snapshots / the filesystem`, () => {
      expect(src, `${name} references a CSV`).not.toMatch(/\.csv/);
      expect(src, `${name} references a HATI snapshot`).not.toMatch(/snapshot|phase3/i);
      expect(src, `${name} reaches into src/data/hati`).not.toMatch(/data\/hati/);
      expect(src, `${name} imports the filesystem`).not.toMatch(/node:fs|require\(['"]fs/);
    });
  }

  it('the SCENARIO viz depends on the adapter, not raw data', () => {
    expect(scenarioSrc).toMatch(/from '\.\.\/adapters\/hati'/);
  });

  it('the geographic scenario viz depends on adapters, not raw data', () => {
    expect(territoryScenarioSrc).toMatch(/from '\.\.\/adapters\/territoryScenario'/);
  });
});
