import { useState } from 'react';
import { useField } from './FieldContext';

const MODULE_LABEL: Record<string, string> = {
  territory: 'TERRITORY',
  earth: 'EARTH',
  signals: 'SIGNALS',
  scenario: 'SCENARIO',
};

interface Row {
  k: string;
  v: string;
}

/**
 * FIELD SCANNER readout. A fixed instrument panel (not pointer-following, to
 * avoid the gimmick and to stay keyboard-usable): it reports the element the
 * pointer OR keyboard focus currently targets. Renders only the fields that
 * exist — no invented data. Empty when nothing is targeted.
 *
 * An always-present disclosure ("Evidence & provenance") reveals the traceable
 * evidence chain — claim → evidence → source → limitation — for whatever
 * decision is currently active. The toggle is deliberately independent of the
 * transient hover/focus so it is never a moving target: expand it once, then
 * focus marks to read each decision's provenance (keyboard-safe, no focus trap,
 * no change to Phase 3B clear-on-blur). The detail is always exactly the active
 * decision's, keyed by its stable identity — the scanner invents nothing.
 */
export function FieldScanner() {
  const { scan } = useField();
  const [showDetail, setShowDetail] = useState(false);

  const rows: Row[] = [];
  if (scan) {
    if (scan.coord) rows.push({ k: 'COORD', v: scan.coord });
    if (scan.asset) rows.push({ k: 'ASSET', v: scan.asset });
    if (scan.territory) rows.push({ k: 'TERRITORY', v: scan.territory });
    if (scan.scenario) rows.push({ k: 'SCENARIO', v: scan.scenario });
    if (scan.decision) rows.push({ k: 'DECISION', v: scan.decision });
    if (scan.status) rows.push({ k: 'STATUS', v: scan.status });
    if (scan.source) rows.push({ k: 'SOURCE', v: scan.source });
    if (scan.project) rows.push({ k: 'PROJECT', v: scan.project });
    if (scan.signal) rows.push({ k: 'SIGNAL', v: scan.signal });
    if (scan.evidence) rows.push({ k: 'EVIDENCE', v: scan.evidence });
  }

  const detail = scan?.detail;

  return (
    <aside
      className="scanner"
      aria-live="polite"
      aria-label="Field scanner readout"
    >
      <div className="scanner__head u-micro">
        FIELD SCANNER
        <span className="scanner__src">
          {scan ? MODULE_LABEL[scan.module] : '—'}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="scanner__empty u-micro">
          point at or focus an element
        </div>
      ) : (
        <dl className="scanner__grid">
          {rows.map((r) => (
            <div className="scanner__row" key={r.k}>
              <dt className="u-micro">{r.k}</dt>
              <dd>{r.v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="scanner__disclosure">
        <button
          type="button"
          className="scanner__toggle u-micro"
          aria-expanded={showDetail}
          aria-controls="scanner-detail"
          onClick={() => setShowDetail((v) => !v)}
        >
          <span className="scanner__toggle-mark" aria-hidden="true">
            {showDetail ? '▾' : '▸'}
          </span>
          Evidence &amp; provenance
        </button>
        {showDetail && (
          <div
            id="scanner-detail"
            className="scanner__detail"
            role="region"
            aria-label="Evidence and provenance detail"
          >
            {detail && detail.length > 0 ? (
              detail.map((group) => (
                <section className="scanner__evgroup" key={group.label}>
                  <h3 className="scanner__evgroup-label u-micro">{group.label}</h3>
                  <dl className="scanner__evgrid">
                    {group.rows.map((r, i) => (
                      <div className="scanner__evrow" key={`${r.k}-${i}`}>
                        <dt className="u-micro">{r.k}</dt>
                        <dd>
                          {r.v}
                          {r.status && (
                            <span className="scanner__evtag u-micro" data-status={r.status}>
                              {r.status}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))
            ) : (
              <p className="scanner__evempty u-micro">
                Focus or point at a HATI decision to trace its evidence.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
