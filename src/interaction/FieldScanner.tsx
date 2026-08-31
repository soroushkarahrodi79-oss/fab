import { useField } from './FieldContext';

const MODULE_LABEL: Record<string, string> = {
  territory: 'TERRITORY',
  earth: 'EARTH',
  signals: 'SIGNALS',
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
 */
export function FieldScanner() {
  const { scan } = useField();

  const rows: Row[] = [];
  if (scan) {
    if (scan.coord) rows.push({ k: 'COORD', v: scan.coord });
    if (scan.territory) rows.push({ k: 'TERRITORY', v: scan.territory });
    if (scan.source) rows.push({ k: 'SOURCE', v: scan.source });
    if (scan.project) rows.push({ k: 'PROJECT', v: scan.project });
    if (scan.signal) rows.push({ k: 'SIGNAL', v: scan.signal });
    if (scan.evidence) rows.push({ k: 'EVIDENCE', v: scan.evidence });
  }

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
    </aside>
  );
}
