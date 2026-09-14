# PROJECT STATUS

_Audit date: 2026-09-14. This document is the canonical status record. Any
status wording elsewhere (README, docs/) is subordinate to this file — if
they conflict, this file wins until it is next updated._

## 1. Status: **PAUSED_PENDING_EVIDENCE**

Development is paused specifically on the one roadmap item the project's
own documentation names as next: real Sentinel-2 ingestion for the EARTH
module ("Phase 5B", see [`docs/EARTH_REAL_DATA.md`](docs/EARTH_REAL_DATA.md)).
That work cannot proceed without external prerequisites this environment
does not have (§6). Everything currently shipped is internally consistent,
documented, and passing CI as of the reference commit — this is not a
project in disrepair, it is a project blocked on one named, external
dependency.

## 2. Current reference

- **Repository:** `soroushkarahrodi79-oss/fab`
- **Default branch:** `main`
- **Reference commit:** `8e629706e9255d62b298eb3a39130b9c947756f5`
  (merge of PR #12, "Phase 5A: harden EARTH contract, de-authenticate
  misleading layers"), 2026-09-06.
- **Releases / tags:** none exist. There is no GitHub Release and no git tag
  in this repository, so the commit SHA above — not a version number — is
  the only precise reference. `package.json` carries `"version": "0.1.0"`,
  which is not tagged or published anywhere; treat it as informational only,
  not a release identifier.
- **CI:** `.github/workflows/ci.yml` runs typecheck, lint, test, and build on
  every push to `main` and every PR. `.github/workflows/deploy.yml` deploys
  `main` to GitHub Pages. Both were green on the reference commit's PR (#12).

## 3. Demonstrated vs. simulated / derived / provisional / unvalidated

This table is a condensed pointer to the module-by-module evidence table
already maintained in the [README](README.md#evidence-status-by-module) and
[`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md); it is not a duplicate
source of truth — see those files for the authoritative detail.

| Claim | Demonstrated (real) | Simulated / derived / provisional |
|---|---|---|
| TERRITORY geometry | Real INE municipal boundaries, build-time snapshot | — |
| PROJECTS | Real GitHub repositories, build-time snapshot | — |
| SIGNALS (`shares-territory`) | Computed at read time from real `Project.territoryIds` overlap | Sparse by design — one true edge, not a dense plausible graph |
| HATI Madrid decisions | Real research project's decision layer, ingested verbatim | Individual decisions carry their own `observed/documented/derived/modelled/simulated` status; FAB does not recompute them |
| SNTO NDVI observations | 3 real Sentinel-2 NDVI zonal aggregates, point-anchor only | Deliberately point-only; polygon/line assets deferred, not faked |
| Other point observations (NDVI/temp/land-cover/mobility) | — | `MOCK-DETERMINISTIC`, illustrative values, each explicitly labelled |
| EARTH raster | — | `MOCK-DETERMINISTIC (simulated)`; land-cover, heat-anomaly, and orbital-arc layers were **removed** in Phase 5A because they would become false claims over real data |

No claim ceiling issue was found where UI text overstates what a value
actually is — the honesty contract (`evidenceStatus` + `validated`, enforced
by `contracts.test.ts`, `hati-integrity.test.ts`, `hati-honesty.test.ts`) is
the reason this audit found no first-page/canonical wording that needed
correcting.

## 4. Claim ceiling

Nothing in this repository may be described, in a portfolio context, résumé,
or external communication, as more than:

- Working, tested software that renders three real, cross-referenced
  research datasets (Madrid/Sierra territory geometry, GitHub project
  metadata, and a real research project's decision layer) plus one
  deliberately-labelled illustrative raster module.
- A **contract**, not a delivered product, for real Sentinel-2 EARTH data —
  the contract (`EarthGrid` discriminated union) is implemented and tested;
  the acquisition pipeline behind it is not wired.
- Zero peer-reviewed or externally validated scientific findings. HATI and
  SNTO evidence is ingested "verbatim" from those projects' own outputs;
  this repository does not itself claim to have validated that upstream
  evidence.

## 5. Allowed maintenance changes

Within `PAUSED_PENDING_EVIDENCE`, the following remain in scope without
requiring a status change:

- Dependency/security updates that keep `npm run typecheck / lint / test /
  build` green.
- Documentation corrections (including this file) to keep claims aligned
  with what the code actually does.
- Bug fixes that do not add a new data source, new visualisation module, or
  new claim of authenticity.
- CI/deploy configuration fixes (as already done in PR #11).

Out of scope until reopened: wiring any live external data source (Sentinel
Hub, Earth Search, Planetary Computer, etc.), adding new modules, or
re-adding any of the layers removed in Phase 5A (land-cover class, heat
anomalies, orbital arcs) under any derivation.

## 6. What reopens development

Development on the EARTH real-data seam (Phase 5B) reopens when **either**:

- This environment (or a successor session) gains outbound network egress
  to an EO data provider **and** a provider account/OAuth client secret
  (Copernicus Data Space, Earth Search, or Planetary Computer), stored as a
  CI secret — both explicitly named as missing in
  [`docs/EARTH_REAL_DATA.md`](docs/EARTH_REAL_DATA.md#what-needs-escalation--credentials-not-doable-in-this-environment); or
- A concrete user/audience need arises (e.g. a reviewer or collaborator
  specifically needs the real Sentinel-2 field, not the labelled mock) that
  justifies prioritizing the credential/access work outside this repo.

Absent one of those, further "growth" work should not be started — it would
either stall on the same missing credentials or (per §5) require an
explicit status change first.

## 7. Open issues and PRs

As of the audit date:

- **Open issues:** 0.
- **Open pull requests:** 0.
- **All 12 pull requests in this repository's history are closed/merged**
  (#1–#12, spanning Phase 0 through Phase 5A). None require disposition —
  there is nothing open to triage, reopen, or close.

## 8. Licensing note (unresolved — not guessed)

No `LICENSE` file exists for code, and no explicit license is declared for
the datasets under `src/data/` (including the HATI Madrid and SNTO
ingested-verbatim data, which originate from the author's other research
projects). `package.json` sets `"private": true`, which affects npm
publishing only and is not a license. This audit does not assert a license
where none is declared — resolving this (e.g. adding a code license and
stating the terms under which the ingested HATI/SNTO data may be reused) is
a decision for the repository owner, not something to infer here.
