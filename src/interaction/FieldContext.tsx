import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * One traceable evidence line in the scanner's provenance disclosure. Generic:
 * `k` is a label, `v` the value verbatim from the data. `status` is an optional
 * short scientific-status tag (e.g. "modelled", "derived", "simulated",
 * "documented", "not modelled", "unavailable") rendered as TEXT — never colour
 * alone — so a modelled or missing value can never be read as measured.
 */
export interface EvidenceRow {
  k: string;
  v: string;
  status?: string;
}

/** A labelled group of evidence rows (e.g. DECISION, THERMAL, ACCESS, SOURCE). */
export interface EvidenceGroup {
  label: string;
  rows: EvidenceRow[];
}

/**
 * The FIELD SCANNER readout. Only fields that exist for the focused element are
 * present — the scanner never invents data (see docs/VISUAL_SYSTEM.md §8).
 */
export interface ScanTarget {
  /** id of the element the readout is anchored to (for focus sync). */
  elementId: string;
  /** which module raised it — TERRITORY / EARTH / SIGNALS / SCENARIO. */
  module: 'territory' | 'earth' | 'signals' | 'scenario';
  coord?: string; // "40.80 N  3.96 W"
  territory?: string;
  source?: string;
  project?: string;
  signal?: string;
  asset?: string; // a real-world feature of interest (HATI asset)
  scenario?: string; // the analysis context that produced this state
  decision?: string; // decision state (+ confidence)
  status?: string; // included / excluded (+ reason)
  evidence?: string; // scientific status: observed / documented / derived / modelled / simulated
  /**
   * Optional traceable evidence + provenance for THIS exact element, revealed on
   * demand behind the scanner's disclosure. A module that has a full evidence
   * chain (e.g. a HATI decision) fills this via its adapter; the scanner stays
   * generic and renders whatever groups are present. Absent → no disclosure.
   */
  detail?: EvidenceGroup[];
}

interface State {
  scan: ScanTarget | null;
  /**
   * The active scenario id — a single source of truth shared across modules, so
   * SCENARIO and TERRITORY reflect the same selection without duplicating state.
   * Generic: any future module that participates in a scenario reads this.
   */
  scenarioId: string | null;
  /**
   * The one authoritative HATI decision currently being emphasised, keyed by the
   * stable decision identity `${scenarioId}:${assetId}`. Both scenario views read
   * this to cross-highlight the same decision; it is deliberately separate from
   * `scan` (the SCANNER readout) so the highlight has a single, unambiguous owner.
   */
  activeDecisionId: string | null;
}

type Action =
  | { type: 'set'; scan: ScanTarget }
  | { type: 'clear'; elementId?: string }
  | { type: 'selectScenario'; scenarioId: string }
  | { type: 'focusDecision'; decisionId: string }
  | { type: 'clearDecision'; decisionId?: string };

/** A decision id `${scenarioId}:${assetId}` belongs to a scenario iff prefixed. */
function belongsToScenario(decisionId: string, scenarioId: string): boolean {
  return decisionId.startsWith(`${scenarioId}:`);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set':
      return { ...state, scan: action.scan };
    case 'clear':
      // Only clear if the leaving element still owns the readout, so a fast
      // pointer moving between elements does not flicker the scanner off.
      if (action.elementId && state.scan?.elementId !== action.elementId) {
        return state;
      }
      return { ...state, scan: null };
    case 'focusDecision':
      if (state.activeDecisionId === action.decisionId) return state;
      return { ...state, activeDecisionId: action.decisionId };
    case 'clearDecision':
      // Owner-guarded, mirroring `clear`: a pointer/focus moving from mark A to
      // mark B fires focus(B) then leave(A); the guard stops leave(A) from
      // erasing the newer active B. Deterministic, no timers, no flicker.
      if (action.decisionId && state.activeDecisionId !== action.decisionId) {
        return state;
      }
      return { ...state, activeDecisionId: null };
    case 'selectScenario': {
      if (state.scenarioId === action.scenarioId) return state;
      // Changing scenario must not leave a stale highlight or scanner readout
      // from the previous scenario. A decision id is scenario-scoped, so drop
      // anything that does not belong to the newly selected scenario.
      const activeDecisionId =
        state.activeDecisionId && belongsToScenario(state.activeDecisionId, action.scenarioId)
          ? state.activeDecisionId
          : null;
      const scan =
        state.scan &&
        state.scan.module === 'scenario' &&
        !belongsToScenario(state.scan.elementId, action.scenarioId)
          ? null
          : state.scan;
      return { ...state, scenarioId: action.scenarioId, activeDecisionId, scan };
    }
  }
}

interface FieldContextValue {
  scan: ScanTarget | null;
  scenarioId: string | null;
  /** The one authoritative active decision identity (`${scenarioId}:${assetId}`). */
  activeDecisionId: string | null;
  reducedMotion: boolean;
  setScan: (t: ScanTarget) => void;
  clearScan: (elementId?: string) => void;
  selectScenario: (scenarioId: string) => void;
  focusDecision: (decisionId: string) => void;
  clearDecision: (decisionId?: string) => void;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function FieldProvider({
  children,
  initialScenarioId = null,
}: {
  children: ReactNode;
  initialScenarioId?: string | null;
}) {
  const [state, dispatch] = useReducer(reducer, {
    scan: null,
    scenarioId: initialScenarioId,
    activeDecisionId: null,
  });
  const reducedMotion = useReducedMotion();

  const setScan = useCallback((scan: ScanTarget) => dispatch({ type: 'set', scan }), []);
  const clearScan = useCallback(
    (elementId?: string) => dispatch({ type: 'clear', elementId }),
    [],
  );
  const selectScenario = useCallback(
    (scenarioId: string) => dispatch({ type: 'selectScenario', scenarioId }),
    [],
  );
  const focusDecision = useCallback(
    (decisionId: string) => dispatch({ type: 'focusDecision', decisionId }),
    [],
  );
  const clearDecision = useCallback(
    (decisionId?: string) => dispatch({ type: 'clearDecision', decisionId }),
    [],
  );

  const value = useMemo<FieldContextValue>(
    () => ({
      scan: state.scan,
      scenarioId: state.scenarioId,
      activeDecisionId: state.activeDecisionId,
      reducedMotion,
      setScan,
      clearScan,
      selectScenario,
      focusDecision,
      clearDecision,
    }),
    [
      state.scan,
      state.scenarioId,
      state.activeDecisionId,
      reducedMotion,
      setScan,
      clearScan,
      selectScenario,
      focusDecision,
      clearDecision,
    ],
  );

  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}

export function useField(): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error('useField must be used within a FieldProvider');
  return ctx;
}
