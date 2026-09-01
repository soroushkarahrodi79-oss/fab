/**
 * Build the HATI Madrid evidence dataset from the committed raw CSV snapshots.
 *
 * Source: src/data/hati/*.snapshot.csv — an unmodified snapshot of the HATI
 * project's Phase 3 decision-layer artifacts (see src/data/hati/SNAPSHOT.md for
 * repo/commit/provenance). This is a build-time seam, not a runtime dependency:
 * no GitHub API, no network, no backend. The transform is deterministic, so
 * running it twice yields byte-identical output.
 *
 * Output: src/data/hati.generated.json (conforms to {assets, scenarios,
 * decisions} in the FAB contract). The viz layer never reads the CSVs.
 *
 * Run: npm run data:hati
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseCsv, buildHati } from './hati-transform.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../src/data/hati');
const outPath = resolve(here, '../src/data/hati.generated.json');

const read = (name) => parseCsv(readFileSync(resolve(dataDir, name), 'utf8'));

const result = buildHati({
  assetCatalog: read('phase3_asset_catalog.snapshot.csv'),
  scenariosSummary: read('phase3_scenarios_summary.snapshot.csv'),
  scenarios: read('phase3_scenarios.snapshot.csv'),
});

writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
console.log(
  `wrote ${result.assets.length} assets, ${result.scenarios.length} scenarios, ` +
    `${result.decisions.length} decisions → ${outPath}`,
);
