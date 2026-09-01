# HATI Madrid — raw evidence snapshot (build-time input)

These CSVs are an **unmodified snapshot** of the authoritative decision-layer
artifacts produced by the HATI Madrid research project. They are the raw input
to the deterministic transform in `scripts/build-hati.mjs`; nothing downstream
(adapter, viz) reads these files.

- **Originating repository:** `soroushkarahrodi79-oss/heat-adaptive-tourism-madrid`
- **Commit:** `036c50b273b539140260097760a148893176f7ec`
- **Captured:** 2026-09-01
- **Temporal frame of the science:** one historical heat episode, 2023-08-21,
  three modelled timestamps (12:00 / 15:00 / 18:00). **Not live, not forecast.**

| Snapshot file | Source path in HATI repo | What it is |
|---|---|---|
| `phase3_asset_catalog.snapshot.csv` | `data/processed/phase3_asset_catalog.csv` | 27 tourism assets: location, category, opening hours, per-field evidence source (OSM ref / Wikidata id / ODbL). |
| `phase3_scenarios_summary.snapshot.csv` | `data/processed/phase3_scenarios_summary.csv` | 8 scenarios (S1–S8): a heat-exposed outdoor source asset + its candidate alternatives. |
| `phase3_scenarios.snapshot.csv` | `data/processed/phase3_scenarios.csv` | per scenario × candidate decision rows: included / excluded, exclusion reason, thermal & decision state, UTCI, evidence confidence. |

## Scientific-status provenance (why the evidence labels are what they are)

Transcribed from the HATI project's own limitations disclosure
(`app/constants.py` TIER2_LIMITATIONS) — HATI makes these caveats itself:

- **All thermal values (Tmrt / UTCI) are model-derived (SOLWEIG/UTCI).** There
  is **no field validation** anywhere in the project. FAB therefore labels
  outdoor thermal-based decisions `modelled`, never `observed`.
- **Indoor assets are `INDOOR_NOT_MODELLED`** — SOLWEIG models the outdoor
  environment only. Their decision rests on documented indoor-refuge rules and
  opening hours, so FAB labels them `documented` and stores **no** UTCI value
  (missing means missing).
- **A24 (La Rosaleda) @ 18:00 is a genuine, irreducible solar-boundary
  `UNSTABLE` case** — its decision flips under the tested solar-forcing
  envelope. FAB labels such decisions `simulated` (scenario-forced model runs)
  and never softens them to `modelled`.
- **Opening hours** are 2026-documented values applied retrospectively to the
  2023 study date — a `documented`, not observed, status.

To refresh: re-copy the three files from the pinned commit above, then run
`npm run data:hati`.
