import type { AtlasData } from './types';
import { sources } from './sources';
import { territories } from './territories';
import { projects } from './projects';
import { signals } from './signals';
import { observations } from './observations';
import { sntoObservations } from './snto';
import { hatiAssets, hatiScenarios, hatiDecisions } from './hati';

/**
 * The complete deterministic dataset. Phase 1 collections are joined by the
 * Phase 2 evidence layer (HATI Madrid) and the Phase 4C2A authentic SNTO NDVI
 * observation slice — both ingested from real research artifacts. The existing
 * observations are preserved unchanged; SNTO records are appended.
 */
export const atlas: AtlasData = {
  sources,
  territories,
  projects,
  signals,
  observations: [...observations, ...sntoObservations],
  assets: hatiAssets,
  scenarios: hatiScenarios,
  decisions: hatiDecisions,
};

export * from './types';
export { sources, territories, projects, signals, observations, sntoObservations };
export { hatiAssets, hatiScenarios, hatiDecisions };

/** Resolve any entity id to a human label across all collections. */
export function labelForId(data: AtlasData, id: string): string | undefined {
  return (
    data.projects.find((p) => p.id === id)?.label ??
    data.territories.find((t) => t.id === id)?.label ??
    data.sources.find((s) => s.id === id)?.label
  );
}

/** Classify an entity id by which collection it belongs to. */
export function kindForId(
  data: AtlasData,
  id: string,
): 'project' | 'territory' | 'source' | 'unknown' {
  if (data.projects.some((p) => p.id === id)) return 'project';
  if (data.territories.some((t) => t.id === id)) return 'territory';
  if (data.sources.some((s) => s.id === id)) return 'source';
  return 'unknown';
}
