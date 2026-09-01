/**
 * Build the PROJECTS dataset from real GitHub repositories.
 *
 * Source: the authenticated user's public repos, fetched from the GitHub API
 * and captured in src/data/github/repos.snapshot.json. This replaces the
 * hand-authored mock projects with real repo-derived data, conforming to the
 * same Project contract — so the visualization layer is untouched.
 *
 * In a real pipeline the snapshot is refreshed in CI with a token, e.g.:
 *   gh api "users/<login>/repos?per_page=100" > src/data/github/repos.snapshot.json
 * (or an Octokit fetch). The transform below is deterministic and reproducible.
 *
 * Output: src/data/projects.generated.json (conforms to Project[]).
 * Run: node scripts/build-projects.mjs   (dev/build tooling, not runtime)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const snapPath = resolve(here, '../src/data/github/repos.snapshot.json');
const outPath = resolve(here, '../src/data/projects.generated.json');

const snapshot = JSON.parse(readFileSync(snapPath, 'utf8'));

// Stable id + label per repo. Ids referenced by signals.ts (snto, fieldos,
// hati-madrid, radar) are preserved so relationships keep resolving.
const IDENTITY = {
  'snto-smart-tourism-observatory': { id: 'snto', label: 'SNTO' },
  'snto-alpine': { id: 'snto-alpine', label: 'SNTO Alpine' },
  fieldos: { id: 'fieldos', label: 'FieldOS' },
  radar: { id: 'radar', label: 'Radar' },
  'heat-adaptive-tourism-madrid': { id: 'hati-madrid', label: 'HATI Madrid' },
  'firstlook-mad': { id: 'firstlook-mad', label: 'FirstLook MAD' },
  'travel-agency-crm-google-sheets': { id: 'travel-crm', label: 'Travel CRM' },
};

// topic / language → domain. Unioned per repo, then ordered deterministically.
const TOPIC_DOMAIN = {
  'remote-sensing': ['geospatial', 'earth-observation'],
  'sentinel-2': ['earth-observation', 'geospatial'],
  'sentinel-1': ['earth-observation', 'geospatial'],
  geospatial: ['geospatial'],
  postgis: ['geospatial'],
  'protected-areas': ['climate'],
  sustainability: ['climate'],
  tourism: ['tourism'],
  'smart-tourism': ['tourism'],
  'tourism-research': ['tourism'],
  'travel-agency': ['tourism'],
  'booking-management': ['tourism'],
  crm: ['tourism', 'software'],
  'field-research': ['field'],
  'evidence-collection': ['field'],
  geolocation: ['field', 'geospatial'],
  'decision-support': ['software'],
  validation: ['software'],
  'research-tool': ['software'],
  streamlit: ['software'],
  react: ['software'],
  pwa: ['software'],
  'web-app': ['software'],
  indexeddb: ['software'],
  'google-apps-script': ['software'],
};
const LANG_DOMAIN = { Python: 'software', TypeScript: 'software', JavaScript: 'software' };
const DOMAIN_ORDER = [
  'tourism',
  'geospatial',
  'earth-observation',
  'mobility',
  'climate',
  'field',
  'software',
];

// keyword → domain, applied to the description text (covers repos with no topics)
const TEXT_DOMAIN = [
  [/sentinel-?2|sentinel-?1|teledetecci|remote sensing|ndvi/i, ['earth-observation', 'geospatial']],
  [/turismo|tourism|destino|destination/i, ['tourism']],
  [/heat|calor|climate|clim|ecolog|wildfire|incendio|fire/i, ['climate']],
  [/uas|uav|drone|dron|mobility|movilidad/i, ['mobility']],
  [/field|campo|gps|geojson|provenance/i, ['field']],
  [/geospatial|geoespacial|gis|postgis/i, ['geospatial']],
];

// territory linkage by text mention (only when the repo actually references it).
const TEXT_TERRITORY = [
  [/guadarrama/i, 'sierra-de-guadarrama'],
  [/rinc[oó]n/i, 'sierra-del-rincon'],
  [/madrid/i, 'madrid'],
];

function inferStatus(repo) {
  if (repo.archived) return 'archived';
  const text = `${repo.description ?? ''}`;
  if (/not yet built|pre-build|phase 0|concept|planned|prototype/i.test(text)) return 'concept';
  const days = (Date.parse(snapshot.fetched_at) - Date.parse(repo.pushed_at)) / 86400000;
  return days <= 120 ? 'active' : 'dormant';
}

function inferDomains(repo) {
  const set = new Set();
  for (const t of repo.topics ?? []) for (const d of TOPIC_DOMAIN[t] ?? []) set.add(d);
  const text = `${repo.name} ${repo.description ?? ''}`;
  for (const [re, ds] of TEXT_DOMAIN) if (re.test(text)) ds.forEach((d) => set.add(d));
  if (set.size === 0 && LANG_DOMAIN[repo.language]) set.add(LANG_DOMAIN[repo.language]);
  if (set.size === 0) set.add('software');
  return DOMAIN_ORDER.filter((d) => set.has(d));
}

function inferTerritories(repo) {
  const text = `${repo.description ?? ''}`;
  const ids = [];
  for (const [re, id] of TEXT_TERRITORY) if (re.test(text) && !ids.includes(id)) ids.push(id);
  return ids;
}

function inferSources(repo) {
  const ids = ['github']; // the repo itself is always a source
  const text = `${repo.name} ${repo.description ?? ''} ${(repo.topics ?? []).join(' ')}`;
  if (/sentinel-?2|ndvi|remote sensing|teledetecci/i.test(text)) ids.push('sentinel-2');
  if (/sentinel-?1|sar/i.test(text)) ids.push('sentinel-1');
  if (/field|campo|evidence|survey|fieldos/i.test(text)) ids.push('field-survey');
  return [...new Set(ids)];
}

const projects = snapshot.repos.map((repo) => {
  const identity = IDENTITY[repo.name] ?? { id: repo.name, label: repo.name };
  const summary =
    (repo.description ?? '').trim() ||
    `${identity.label} — ${repo.language ?? 'software'} project.`;
  return {
    id: identity.id,
    label: identity.label,
    status: inferStatus(repo),
    summary: summary.length > 160 ? summary.slice(0, 157) + '…' : summary,
    domains: inferDomains(repo),
    territoryIds: inferTerritories(repo),
    sourceIds: inferSources(repo),
    repoUrl: repo.html_url,
    note: `Derived from GitHub repo ${repo.full_name} (pushed ${repo.pushed_at.slice(0, 10)}).`,
  };
});

// Drop empty optional arrays for a clean dataset.
for (const p of projects) {
  if (p.territoryIds.length === 0) delete p.territoryIds;
}

writeFileSync(outPath, JSON.stringify(projects, null, 2) + '\n');
console.log(`wrote ${projects.length} projects → ${outPath}`);
for (const p of projects) {
  console.log(`  ${p.id.padEnd(14)} ${p.status.padEnd(8)} [${p.domains.join(', ')}]`);
}
