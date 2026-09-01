interface MastheadProps {
  updatedAt: string;
}

/** Masthead — a small instrument label, not a marketing hero. */
export function Masthead({ updatedAt }: MastheadProps) {
  const stamp = updatedAt.slice(0, 10);
  return (
    <header className="masthead">
      <div className="masthead__id">
        <span className="masthead__name">SOROUSH</span>
        <span className="masthead__sep">//</span>
        <span className="masthead__title">FIELD ATLAS</span>
      </div>
      <div className="masthead__strap u-micro">
        a living map of research, territory, signals &amp; experiments
      </div>
      <div className="masthead__stamp u-micro" aria-label="last field update">
        FIELD · {stamp}
      </div>
    </header>
  );
}
