import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { atlas } from '../data/index';
import { buildDecisionEvidence } from '../adapters/hati';
import { FieldProvider } from '../interaction/FieldContext';
import { ScenarioField } from '../viz/ScenarioField';
import { TerritoryScenario } from '../viz/TerritoryScenario';
import { FieldScanner } from '../interaction/FieldScanner';

/**
 * Phase 3C — trace a HATI decision to its evidence and provenance.
 * The disclosure surfaces ONLY existing Decision/Asset/Scenario fields, keyed by
 * the stable `${scenarioId}:${assetId}` identity, and states missing evidence
 * honestly. No ranking / scoring / recompute is introduced.
 */

const assetById = new Map((atlas.assets ?? []).map((a) => [a.id, a]));
const scenarioById = new Map((atlas.scenarios ?? []).map((s) => [s.id, s]));
const decisionById = new Map((atlas.decisions ?? []).map((d) => [d.id, d]));

function evidenceFor(id: string) {
  const d = decisionById.get(id)!;
  return buildDecisionEvidence(d, assetById.get(d.assetId), scenarioById.get(d.scenarioId));
}
/** flatten groups → "GROUP/key" → value, for direct assertions. */
function flat(id: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of evidenceFor(id)) for (const r of g.rows) out[`${g.label}/${r.k}`] = r.v;
  return out;
}
const groupLabels = (id: string) => evidenceFor(id).map((g) => g.label);

/** Mount the scanner with a single scenario view; expand the disclosure. */
function mountAndOpen(scenarioId: string) {
  const utils = render(
    <FieldProvider initialScenarioId={scenarioId}>
      <ScenarioField data={atlas} scenarioId={scenarioId} />
      <FieldScanner />
    </FieldProvider>,
  );
  const toggle = screen.getByRole('button', { name: /evidence & provenance/i });
  fireEvent.click(toggle);
  return { ...utils, toggle };
}
const detailRegion = () => screen.getByRole('region', { name: /evidence and provenance detail/i });

describe('Phase 3C A — correct identity', () => {
  it('opening provenance shows the evidence for exactly the active decision', () => {
    mountAndOpen('S1');
    // activate the S1 subject (S1:A16 — Fuente de Neptuno)
    fireEvent.focus(screen.getByRole('img', { name: /source asset: Fuente de Neptuno/i }));
    const region = detailRegion();
    // its own record ref is S1 (the subject decision provenance)
    expect(within(region).getByText('S1')).toBeInTheDocument();
    // a DIFFERENT decision's UTCI (Cibeles 44.4) must NOT appear
    expect(within(region).queryByText(/44\.4/)).toBeNull();
    // the subject's own modelled UTCI (45) does
    expect(within(region).getByText(/^45 °C$/)).toBeInTheDocument();
  });
});

describe('Phase 3C B — source fidelity (verbatim identifiers)', () => {
  it('renders the asset OSM ref and Wikidata id exactly as stored', () => {
    const asset = assetById.get('A16')!;
    const f = flat('S1:A16');
    expect(f['SOURCE/OSM']).toBe(asset.provenance.sourceRef); // verbatim, not reconstructed
    // Wikidata id is extracted verbatim from the existing evidence string
    const wd = asset.attributes!.tourism_relevance_evidence.match(/Wikidata:(Q\d+)/)![1];
    expect(f['SOURCE/Wikidata']).toBe(wd);
    expect(f['SOURCE/File']).toBe(decisionById.get('S1:A16')!.provenance.sourceFile);
  });
});

describe('Phase 3C C — scientific distinctions preserved', () => {
  it('modelled outdoor: UTCI present, tagged modelled, limitation = not field-measured', () => {
    const rows = evidenceFor('S1:A16').find((g) => g.label === 'THERMAL')!.rows;
    const utci = rows.find((r) => r.k === 'UTCI')!;
    expect(utci.v).toBe('45 °C');
    expect(utci.status).toBe('modelled');
    expect(rows.find((r) => r.k === 'Limitation')!.v).toMatch(/not field-measured/i);
  });
  it('indoor: no fabricated UTCI — explicitly "Not modelled (indoor)"', () => {
    const rows = evidenceFor('S1:A01').find((g) => g.label === 'THERMAL')!.rows;
    const utci = rows.find((r) => r.k === 'UTCI')!;
    expect(utci.v).toMatch(/not modelled/i);
    expect(utci.status).toBe('not modelled');
    expect(utci.v).not.toMatch(/\d+\s*°C/); // never an invented number
  });
  it('simulated/unstable source stays simulated (S7:A24), not softened to modelled', () => {
    const rows = evidenceFor('S7:A24').find((g) => g.label === 'THERMAL')!.rows;
    expect(rows.find((r) => r.k === 'UTCI')!.status).toBe('simulated');
    const decision = evidenceFor('S7:A24').find((g) => g.label === 'DECISION')!.rows;
    expect(decision.find((r) => r.k === 'Confidence')!.v).toMatch(/unstable/i);
  });
  it('excluded decision surfaces its exclusion reason verbatim in meaning', () => {
    const rows = evidenceFor('S1:A02').find((g) => g.label === 'DECISION')!.rows;
    // S1:A02 constraint is ACCESSIBILITY_CONSTRAINT → its human label
    expect(rows.find((r) => r.k === 'Excluded because')!.v).toMatch(/search radius/i);
  });
});

describe('Phase 3C D — missing evidence is honest, never fabricated', () => {
  it('indoor asset with no modelled thermal shows explicit absence, not a zero', () => {
    const f = flat('S1:A01');
    expect(f['THERMAL/UTCI']).toBe('Not modelled (indoor)');
    // access limitation makes the straight-line nature explicit
    expect(f['ACCESS/Limitation']).toMatch(/not a routed walking path/i);
  });
});

describe('Phase 3C E — scenario outcome surfaced as pre-existing HATI output', () => {
  it('NO_DEFENSIBLE_ALTERNATIVE (S8) is shown with its existing meaning, tagged HATI', () => {
    const out = evidenceFor('S8:A20').find((g) => g.label === 'SCENARIO OUTCOME')!;
    const rec = out.rows.find((r) => r.k === 'HATI recommendation')!;
    expect(rec.v).toBe('No defensible alternative');
    expect(rec.status).toBe('HATI output'); // clearly pre-existing, not FAB advice
  });
  it('ALTERNATIVES_FOUND (S1) is likewise passed through, not rewritten', () => {
    const f = flat('S1:A16');
    expect(f['SCENARIO OUTCOME/HATI recommendation']).toBe('Alternatives found');
  });
});

describe('Phase 3C F — keyboard: open / inspect / close', () => {
  it('the disclosure is a real button, toggling aria-expanded, no hover requirement', () => {
    render(
      <FieldProvider initialScenarioId="S1">
        <ScenarioField data={atlas} scenarioId="S1" />
        <FieldScanner />
      </FieldProvider>,
    );
    const toggle = screen.getByRole('button', { name: /evidence & provenance/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: /evidence and provenance detail/i })).toBeNull();

    fireEvent.click(toggle); // keyboard activation of a <button> dispatches click
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // focus a mark by keyboard → detail fills for that decision
    fireEvent.focus(screen.getByRole('img', { name: /source asset: Fuente de Neptuno/i }));
    expect(within(detailRegion()).getByText(/^45 °C$/)).toBeInTheDocument();

    fireEvent.click(toggle); // close
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: /evidence and provenance detail/i })).toBeNull();
  });
});

describe('Phase 3C — bidirectional parity (TERRITORY carries the same detail)', () => {
  it('the geographic view yields the identical evidence identity via the same builder', () => {
    render(
      <FieldProvider initialScenarioId="S1">
        <TerritoryScenario data={atlas} scenarioId="S1" />
        <FieldScanner />
      </FieldProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /evidence & provenance/i }));
    fireEvent.focus(screen.getByRole('img', { name: /source asset: Fuente de Neptuno/i }));
    expect(within(detailRegion()).getByText(/^45 °C$/)).toBeInTheDocument();
    expect(within(detailRegion()).getByText('S1')).toBeInTheDocument();
  });
});

describe('Phase 3C — NO-RANKING INVARIANT', () => {
  it('the evidence surface introduces no score/rank/weight/best/winner vocabulary', () => {
    const forbidden = /\b(score|scored|rank|ranked|ranking|weight|weighted|best|winner|top pick|recommended (?:pick|option|choice)|better than)\b/i;
    for (const id of decisionById.keys()) {
      for (const g of evidenceFor(id)) {
        for (const r of g.rows) {
          expect(`${g.label} ${r.k}: ${r.v}`, `${id} ${g.label}/${r.k}`).not.toMatch(forbidden);
          if (r.status) expect(r.status, `${id} status`).not.toMatch(forbidden);
        }
      }
    }
  });
  it('every recommendation row is a pre-existing HATI token, never FAB-authored advice', () => {
    const allowed = new Set(['Alternatives found', 'No defensible alternative']);
    for (const id of decisionById.keys()) {
      const out = evidenceFor(id).find((g) => g.label === 'SCENARIO OUTCOME');
      const rec = out?.rows.find((r) => r.k === 'HATI recommendation');
      if (rec) {
        expect(allowed.has(rec.v), `${id}: ${rec.v}`).toBe(true);
        expect(rec.status).toBe('HATI output');
      }
    }
  });
  it('groups follow the claim → evidence → source order', () => {
    expect(groupLabels('S1:A16').slice(0, 4)).toEqual(['DECISION', 'THERMAL', 'ACCESS', 'SOURCE']);
  });
});
