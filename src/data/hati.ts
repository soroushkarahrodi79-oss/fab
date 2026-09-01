import type { Asset, Scenario, Decision } from './types';
import generated from './hati.generated.json';

/**
 * HATI Madrid evidence dataset — the Phase 2 authentic vertical slice.
 *
 * Ingested from the HATI project's real Phase 3 decision-layer CSVs via a
 * deterministic build-time transform (scripts/build-hati.mjs), conforming to the
 * generic Asset / Scenario / Decision contract. FAB *consumes* HATI's decision
 * outputs — it never recomputes eligibility, ranking, UTCI or thermal state.
 *
 * To refresh: re-copy the snapshots (see src/data/hati/SNAPSHOT.md) and run
 * `npm run data:hati`.
 */
const data = generated as unknown as {
  assets: Asset[];
  scenarios: Scenario[];
  decisions: Decision[];
};

export const hatiAssets: Asset[] = data.assets;
export const hatiScenarios: Scenario[] = data.scenarios;
export const hatiDecisions: Decision[] = data.decisions;
