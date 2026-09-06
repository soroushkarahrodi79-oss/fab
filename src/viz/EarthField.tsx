import { useEffect, useMemo, useRef } from 'react';
import { buildEarthField } from '../adapters/earth';
import { useField } from '../interaction/FieldContext';

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * EARTH — a deterministic Earth-observation NDVI field on Canvas 2D. Phase 5A:
 * a provenance-bearing NDVI raster and nothing more — no land-cover class, no
 * heat-anomaly overlay, no orbital arcs (those were illustrative and would
 * become false claims over real data). Reads only the committed grid, never the
 * atlas, so EARTH is decoupled from mock observations. No external API, no
 * randomness, no idle render loop: paints once per resize with an optional
 * one-shot entry sweep (skipped under reduced motion). Cells with no valid EO
 * support render as neutral missing-data, never as NDVI 0. A <figcaption>
 * carries the meaning when the canvas is unsupported or motion is off.
 */
export function EarthField() {
  const field = useMemo(() => buildEarthField(), []);
  const { reducedMotion, setScan, clearScan } = useField();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // canvas unsupported → figure twin remains the readout

    const low = hexToRgb(cssVar('--signal-warm', '#d9a441'));
    const high = hexToRgb(cssVar('--signal', '#7fe3c4'));
    const missing = cssVar('--panel-line', '#232c34');

    let raf = 0;

    const draw = (sweep = 1) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cw = w / field.cols;
      const ch = h / field.rows;
      const revealCols = Math.floor(field.cols * sweep);

      for (const cell of field.cells) {
        if (cell.col > revealCols) continue;
        if (cell.ndvi === null) {
          // No valid EO support: a neutral, clearly non-vegetation cell. It is
          // never passed through the NDVI colour scale.
          ctx.fillStyle = missing;
          ctx.globalAlpha = 0.18;
        } else {
          // Restrained: the field is a readout, not a wallpaper. Keep it dim so
          // labels stay legible over it.
          ctx.fillStyle = mix(low, high, cell.ndvi);
          ctx.globalAlpha = 0.28 + 0.34 * cell.ndvi;
        }
        ctx.fillRect(cell.col * cw, cell.row * ch, cw + 0.5, ch + 0.5);
      }
      ctx.globalAlpha = 1;
    };

    // one-shot entry sweep, self-terminating; skipped under reduced motion
    if (reducedMotion) {
      draw(1);
    } else {
      const start = performance.now();
      const DUR = 560;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DUR);
        draw(t);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(() => draw(1));
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [field, reducedMotion]);

  const s = field.summary;
  // Provenance travels with the numbers: source + evidence status + the real
  // composite window (never a single fake acquisition date). `field.source` is
  // "mock-deterministic" now, "sentinel-2" when real.
  const provenance = `${field.source} · ${field.evidenceStatus}`;
  const compositeWindow = `${field.compositeStart} → ${field.compositeEnd}`;
  const coverage = `${Math.round(s.validCoverage * 100)}%`;
  const summaryText = `NDVI ${s.ndviMin.toFixed(2)}–${s.ndviMax.toFixed(2)} (mean ${s.ndviMean.toFixed(2)}) · coverage ${coverage}`;
  const attribution = field.provenance.attribution;

  return (
    <figure
      className="earth"
      ref={wrapRef}
      onMouseEnter={() =>
        setScan({
          elementId: 'earth-field',
          module: 'earth',
          source: field.source,
          evidence: `NDVI field · ${field.evidenceStatus} · ${compositeWindow}`,
        })
      }
      onMouseLeave={() => clearScan('earth-field')}
    >
      <canvas ref={canvasRef} className="earth__canvas" aria-hidden="true" />
      <figcaption className="earth__caption u-micro">
        <span className="earth__caption-title">EO FIELD</span>{' '}
        <span className="earth__caption-src">{provenance}</span> · {compositeWindow} · {summaryText}
        {attribution ? ` · ${attribution}` : ''}
      </figcaption>
    </figure>
  );
}

export default EarthField;
