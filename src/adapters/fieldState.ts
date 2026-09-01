import type { AtlasData, FieldState, ProjectDomain } from '../data/types';

/**
 * Derive the central FIELD STATE readout from the atlas data.
 * Pure and deterministic: the same data always yields the same state, so the
 * core can never drift from the structure it claims to summarise.
 */
export function deriveFieldState(data: AtlasData): FieldState {
  const activeSignals = data.signals.filter((s) => s.active).length;
  const activeProjects = data.projects.filter((p) => p.status === 'active').length;
  const experiments = data.projects.filter((p) => p.status === 'concept').length;
  const observations = data.observations.length;
  const validated = data.observations.filter((o) => o.validated).length;
  const validatedRatio = observations === 0 ? 0 : validated / observations;

  // Dominant domain = most frequent domain across all projects.
  const counts = new Map<ProjectDomain, number>();
  for (const p of data.projects) {
    for (const d of p.domains) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let dominantDomain: ProjectDomain | null = null;
  let best = 0;
  // Iterate deterministically by insertion order; ties keep the first seen.
  for (const [domain, n] of counts) {
    if (n > best) {
      best = n;
      dominantDomain = domain;
    }
  }

  // updatedAt = latest observation time, else a stable build sentinel.
  const times = data.observations
    .map((o) => o.observedAt)
    .filter(Boolean)
    .sort();
  const updatedAt = times.length ? times[times.length - 1] : '1970-01-01T00:00:00Z';

  return {
    activeSignals,
    territories: data.territories.length,
    activeProjects,
    experiments,
    observations,
    validatedRatio,
    dominantDomain,
    updatedAt,
  };
}
