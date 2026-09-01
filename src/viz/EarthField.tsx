import { useEffect, useMemo, useRef } from 'react';
import type { AtlasData } from '../data/types';
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
 * EARTH — deterministic Earth-observation field on Canvas 2D. A raster NDVI
 * field + land-cover, heat anomalies, and labelled orbital arcs. No external
 * satellite API, no randomness, and NO idle render loop: the canvas paints once
 * per data/resize, with an optional one-shot entry sweep that stops itself and
 * is skipped under reduced motion. A <figcaption> carries the meaning when the
 * canvas is unsupported or motion is off (the semantic twin).
 */
export function EarthField({ data }: { data: AtlasData }) {
  const field = useMemo(() => buildEarthField(data), [data]);
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
    const alert = cssVar('--alert', '#d9694f');
    const line = cssVar('--panel-line-bright', '#2c3742');
    const ink = cssVar('--ink-dim', '#6b7a78');

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
        ctx.fillStyle = mix(low, high, cell.ndvi);
        // Restrained: the field is a readout, not a wallpaper. Keep it dim so
        // labels, arcs and anomalies stay legible over it.
        ctx.globalAlpha = 0.28 + 0.34 * cell.ndvi;
        ctx.fillRect(cell.col * cw, cell.row * ch, cw + 0.5, ch + 0.5);
        if (cell.anomaly) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = alert;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(cell.col * cw + 1, cell.row * ch + 1, cw - 2, ch - 2);
        }
      }
      ctx.globalAlpha = 1;

      // orbital arcs — labelled EO sources crossing the field
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = ink;
      for (const arc of field.arcs) {
        ctx.beginPath();
        ctx.moveTo(0, arc.y0 * h);
        ctx.quadraticCurveTo(w * 0.5, (arc.y0 - arc.bow) * h, w, arc.y1 * h);
        ctx.stroke();
        ctx.fillText(arc.label.toUpperCase(), 8, arc.y0 * h - 4);
      }
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
  // Provenance travels with the numbers: the field is never a bare readout.
  // `field.source` is "mock-deterministic" now, "sentinel-2" when real.
  const provenance = `${field.source} · ${field.capturedAt}`;
  const summaryText = `NDVI ${s.ndviMin.toFixed(2)}–${s.ndviMax.toFixed(2)} (mean ${s.ndviMean.toFixed(2)}) · dominant cover ${s.dominantCover} · ${s.anomalies} anomal${s.anomalies === 1 ? 'y' : 'ies'} flagged`;

  return (
    <figure
      className="earth"
      ref={wrapRef}
      onMouseEnter={() =>
        setScan({
          elementId: 'earth-field',
          module: 'earth',
          source: field.arcs.map((a) => a.label).join(' · ') || undefined,
          evidence: `NDVI field · ${s.anomalies} anomalies`,
        })
      }
      onMouseLeave={() => clearScan('earth-field')}
    >
      <canvas ref={canvasRef} className="earth__canvas" aria-hidden="true" />
      <figcaption className="earth__caption u-micro">
        <span className="earth__caption-title">EO FIELD</span>{' '}
        <span className="earth__caption-src">{provenance}</span> · {summaryText}
      </figcaption>
    </figure>
  );
}

export default EarthField;
