import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// Snapshots imported as raw strings (bundler-native, no filesystem access) —
// the same pattern the HATI ingestion tests use.
import csvText from '../data/snto/pnsg_gee_timeseries.snapshot.csv?raw';
import geojsonText from '../data/snto/pnsg_assets.snapshot.geojson?raw';
import { atlas, sntoObservations } from '../data/index';
import { earthProvenance } from '../adapters/earth';
import { signals as authoredSignals } from '../data/signals';
import { deriveStructuralSignals } from '../data/signals-derive';
import { projects } from '../data/projects';
import { hatiAssets, hatiScenarios, hatiDecisions } from '../data/hati';
import { FieldProvider } from '../interaction/FieldContext';
import { TerritoryMap } from '../viz/TerritoryMap';
import { FieldScanner } from '../interaction/FieldScanner';

/**
 * Phase 4C2A zero-fabrication guards for the authentic SNTO point-anchor slice.
 * The generated observations must be a lossless, honestly-labelled projection of
 * the pinned SNTO snapshot — never invented spatial evidence.
 */

// Re-derive the ground truth directly from the committed snapshots.
interface PointFeature {
  properties: { asset_id: string };
  geometry: { type: string; coordinates: number[] };
}
const geojson = JSON.parse(geojsonText) as { features: PointFeature[] };

const csvRows: Record<string, string>[] = (() => {
  const lines = csvText.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  return lines.slice(1).map((l) => {
    const c = l.split(',');
    return Object.fromEntries(header.map((h, i) => [h, c[i]]));
  });
})();

const pointFeatures = geojson.features.filter((f) => f.geometry.type === 'Point');
const pointIds = pointFeatures.map((f) => f.properties.asset_id);
const csvByRef = new Map(
  csvRows.filter((r) => r.date === '2026-06-01').map((r) => [`${r.asset_id}@2026-06-01`, r]),
);
const coordByAsset = new Map(pointFeatures.map((f) => [f.properties.asset_id, f.geometry.coordinates]));

const EXPECTED_IDS = [
  'pnsg_vuelo_libre_el_nevero',
  'pnsg_vuelo_libre_la_nevera',
  'pnsg_vuelo_libre_el_espartal',
];

describe('SNTO slice — bounded and correctly typed', () => {
  it('generates exactly 3 observations for the 3 upstream Point assets', () => {
    expect(sntoObservations).toHaveLength(3);
    expect(pointFeatures).toHaveLength(3);
    const assetIds = sntoObservations.map((o) => o.provenance!.sourceRef!.split('@')[0]);
    expect(new Set(assetIds)).toEqual(new Set(EXPECTED_IDS));
  });

  it('uses stable kebab-case ids (no underscore), while sourceRef keeps upstream identity', () => {
    const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const EXPECTED = new Set([
      'snto-pnsg-ndvi-2026-06-vuelo-libre-el-nevero',
      'snto-pnsg-ndvi-2026-06-vuelo-libre-la-nevera',
      'snto-pnsg-ndvi-2026-06-vuelo-libre-el-espartal',
    ]);
    for (const o of sntoObservations) {
      expect(o.id).not.toContain('_');
      expect(o.id, o.id).toMatch(KEBAB);
      // Upstream identity is preserved verbatim (underscores) in provenance.
      expect(o.provenance!.sourceRef).toContain('_');
    }
    expect(new Set(sntoObservations.map((o) => o.id))).toEqual(EXPECTED);
  });

  it('admits no Polygon or LineString asset', () => {
    for (const o of sntoObservations) {
      const assetId = o.provenance!.sourceRef!.split('@')[0];
      expect(pointIds).toContain(assetId);
    }
  });

  it('fixes variable/status/validation/source/territory for the whole slice', () => {
    for (const o of sntoObservations) {
      expect(o.variable).toBe('ndvi');
      expect(o.evidenceStatus).toBe('derived');
      expect(o.validated).toBe(false);
      expect(o.sourceId).toBe('sentinel-2');
      expect(o.territoryId).toBe('sierra-de-guadarrama');
      expect(o.observedAt).toBe('2026-06-01T00:00:00Z');
      expect(o.provenance!.sourceRef!.endsWith('@2026-06-01')).toBe(true);
    }
  });
});

describe('SNTO slice — losslessness', () => {
  it('every value equals the exact upstream CSV ndvi (no rounding)', () => {
    for (const o of sntoObservations) {
      const row = csvByRef.get(o.provenance!.sourceRef!);
      expect(row, o.id).toBeTruthy();
      expect(o.value).toBe(Number(row!.ndvi)); // exact IEEE equality
    }
  });

  it('every coordinate equals the exact upstream GeoJSON Point (no transform)', () => {
    for (const o of sntoObservations) {
      const assetId = o.provenance!.sourceRef!.split('@')[0];
      const coords = coordByAsset.get(assetId)!;
      expect(o.at).toEqual(coords); // exact [lon, lat]
      expect(o.at).toHaveLength(2);
    }
  });
});

describe('SNTO slice — provenance honesty', () => {
  it('carries complete provenance with consistent sourceId', () => {
    for (const o of sntoObservations) {
      const p = o.provenance!;
      expect(p.sourceId).toBe(o.sourceId);
      expect(p.sourceRepo).toBe('snto-smart-tourism-observatory');
      expect(p.sourceFile).toContain('pnsg_gee_timeseries.csv');
      expect(p.temporalContext).toContain('2026-06');
      expect(p.fetchedAt).toBeTruthy();
    }
  });

  it('states the upstream 50 m Point-buffer support and the anchor caveat', () => {
    for (const o of sntoObservations) {
      const note = o.provenance!.note ?? '';
      expect(note).toMatch(/50 m/);
      expect(note).toMatch(/buffer/i);
      expect(note).toMatch(/anchor/i);
      expect(note).toMatch(/not a pixel/i);
      expect(note).toMatch(/GEE:S2_SR_HARMONIZED/);
    }
  });
});

describe('SNTO slice — scanner behaviour (generic, honest)', () => {
  it('discloses evidence/support without a pixel claim or pejorative status', () => {
    render(
      <FieldProvider>
        <TerritoryMap data={atlas} />
        <FieldScanner />
      </FieldProvider>,
    );
    // Focus one SNTO anchor (aria: "Observation ndvi, Derived evidence, not field-validated, source Sentinel-2")
    const marks = screen.getAllByRole('button', { name: /ndvi, Derived evidence, not field-validated/i });
    expect(marks.length).toBeGreaterThanOrEqual(3);
    fireEvent.mouseEnter(marks[0]);

    // Separate axes present; no pejorative language.
    expect(screen.getByText('FIELD VAL')).toBeInTheDocument();
    expect(screen.getByText('Not field-validated')).toBeInTheDocument();
    expect(screen.queryByText(/flag|invalid|unreliable|suspect/i)).toBeNull();

    // The disclosure carries the honest zonal-support statement.
    fireEvent.click(screen.getByRole('button', { name: /Evidence & provenance/i }));
    expect(screen.getAllByText(/zonal aggregate over a 50 m buffer/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/not a pixel measurement/i).length).toBeGreaterThanOrEqual(1);
  });
});

describe('SNTO slice — no collateral change', () => {
  it('does not fabricate a raster: EARTH stays mock-deterministic', () => {
    expect(earthProvenance.source).toBe('mock-deterministic');
  });

  it('adds no Signal edges', () => {
    // SIGNALS is derived from PROJECTS facts plus any authored feeds/validates
    // edges (Phase 4D — docs/PHASE_4D_SIGNALS.md); SNTO's Observation
    // ingestion must not add to or otherwise change it.
    expect(atlas.signals).toEqual([...deriveStructuralSignals({ projects }), ...authoredSignals]);
    expect(atlas.signals.some((s) => s.from.startsWith('snto-pnsg') || s.to.startsWith('snto-pnsg'))).toBe(
      false,
    );
  });

  it('leaves HATI evidence collections untouched', () => {
    expect(atlas.assets).toBe(hatiAssets);
    expect(atlas.scenarios).toBe(hatiScenarios);
    expect(atlas.decisions).toBe(hatiDecisions);
  });

  it('appends SNTO to existing observations without replacing them', () => {
    // 8 original + 3 SNTO = 11; originals still present.
    expect(atlas.observations).toHaveLength(11);
    expect(atlas.observations.filter((o) => o.id.startsWith('snto-pnsg'))).toHaveLength(3);
    expect(atlas.observations.some((o) => o.id === 'obs-guad-ndvi-01')).toBe(true);
  });
});
