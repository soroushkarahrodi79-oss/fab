# VISUAL SYSTEM — SOROUSH // FIELD ATLAS

The atlas should read as **experimental cartography × scientific
visualisation × digital field instrument**. Every rule below serves
information integrity first and mood second.

## 1. Principles

- **Meaning > animation. Data > decoration. Clarity > complexity.**
- The screen is an *instrument panel*, not a canvas for effects.
- Restraint is the aesthetic. Emptiness is allowed; noise is not.
- Motion is a *readout*, never ambience. If motion does not report a change
  in data or state, it does not ship.

## 2. Colour

Dark instrument ground. Colour is a data channel, not decoration — the palette
is small on purpose so that a coloured mark always *means* a category.

| Token | Value | Role |
|---|---|---|
| `--ground` | `#080a0c` | deepest background |
| `--panel` | `#0e1114` | module surface |
| `--panel-line` | `#1b2126` | hairlines, grids, borders |
| `--ink` | `#c9d4d1` | primary text |
| `--ink-dim` | `#6b7a78` | secondary / metadata text |
| `--ink-faint` | `#3a4644` | tertiary / disabled |
| `--signal` | `#7fe3c4` | primary accent — active / live |
| `--signal-warm` | `#d9a441` | environmental / heat / caution |
| `--signal-cool` | `#5fa8d3` | source / EO / water |
| `--alert` | `#d9694f` | anomaly / needs validation |

No gradients as decoration. A gradient may encode a continuous scale (e.g.
NDVI low→high) and only then. Contrast: `--ink` on `--ground` ≈ 11:1;
`--ink-dim` on `--ground` ≈ 4.7:1 (meets WCAG AA for text).

## 3. Typography

Two families only.

- **Mono** (`ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace`) —
  all instrument readouts: coordinates, codes, metrics, labels. Monospace
  reinforces the "reading" metaphor and keeps numeric columns aligned.
- **Sans** (`ui-sans-serif, "Inter", system-ui, sans-serif`) — prose in docs
  panels and longer descriptions only.

No large marketing type. The author's name is a small masthead label, not a
hero. Type scale (rem): `0.6875` (micro-label) · `0.75` (label) · `0.8125`
(body) · `1` (module title) · `1.5` (rare, field-state figure). Letter-spacing
`0.08em`–`0.14em` on uppercase mono labels.

## 4. Spacing & density

- 4px base grid. Spacing tokens: `4 · 8 · 12 · 16 · 24 · 32 · 48`.
- Deliberately **dense** but gridded — an instrument, not an airy landing page.
- Hairline borders (`1px`, `--panel-line`) separate regions instead of gaps
  and shadows. Almost no drop shadows; elevation is by line and value, not blur.

## 5. Visual hierarchy

1. **FIELD STATE core** (centre) — the summary readout, highest priority.
2. **Module viewports** (TERRITORY / EARTH / SIGNALS) — equal weight to each
   other, arranged around the core.
3. **Readouts / labels** — quiet metadata, mono, dimmed.
4. **Chrome** — masthead, grid ticks, legends — faintest.

Hierarchy is carried by *value and size*, not colour saturation. Accent colour
is reserved for data state, so it must not be spent on hierarchy.

## 6. Module states

Every module is a small visual organism with an explicit finite state:

- `loading` — skeleton hairlines, no spinner.
- `idle` — steady readout, no continuous animation.
- `active` / `focused` — the module the pointer or keyboard is on; a single
  hairline frame brightens and its readout expands.
- `reduced` — reduced-motion or canvas-unsupported fallback: static, fully
  labelled DOM/SVG representation.
- `empty` — no data: a labelled empty frame stating what would appear.

## 7. Motion principles

- Default to **no idle animation**. Modules are still until interacted with.
- Permitted motion: (a) a one-shot *entry sweep* when a module first mounts
  (≤600ms), (b) *state transitions* on focus (≤200ms), (c) the FIELD SCANNER
  readout tracking the pointer (transform only, no layout).
- Everything honours `prefers-reduced-motion: reduce` → all of the above
  collapse to instant state changes; the entry sweep is skipped.
- No `requestAnimationFrame` loop runs while a module is idle and unfocused.

## 8. Interaction principles — FIELD SCANNER

Pointer movement reveals a contextual readout *anchored to the nearest
meaningful element*, not free-floating. It shows only fields that exist for
that element:

```
39.47 N  -4.01 W
TERRITORY   PNSG
SOURCE      SENTINEL-2
PROJECT     SNTO
```

Rules: the scanner never invents data; if a field is unknown it is omitted, not
faked. It is keyboard-reachable (focus a node → same readout). It is a
discovery aid, so it disappears cleanly and never blocks a click. If it does
not improve discovery in QA, it is cut — not kept as a gimmick.

## 9. What we refuse

Generic SaaS chrome · heavy glassmorphism · neon/cyberpunk · Matrix rain ·
decorative gradients · random glowing particles · fake terminals · huge
marketing headlines · animation without a data cause · any visual noise that
does not encode information.
