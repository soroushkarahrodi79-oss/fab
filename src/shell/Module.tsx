import type { ReactNode } from 'react';

interface ModuleProps {
  code: string; // e.g. "01"
  title: string;
  state?: 'idle' | 'active' | 'loading' | 'empty';
  meta?: string;
  children: ReactNode;
}

/**
 * A module frame — a small viewport for one visual organism. Hairline framing,
 * quiet header readout. Elevation is by line and value, not shadow.
 */
export function Module({ code, title, state = 'idle', meta, children }: ModuleProps) {
  return (
    <section className={`module module--${state}`} aria-label={title}>
      <header className="module__head">
        <span className="u-micro module__code">{code}</span>
        <h2 className="module__title">{title}</h2>
        {meta && <span className="u-micro module__meta">{meta}</span>}
      </header>
      <div className="module__body">
        {state === 'empty' ? (
          <div className="module__empty u-label">no data in field</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
