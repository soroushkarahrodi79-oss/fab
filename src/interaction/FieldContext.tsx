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
}

interface State {
  scan: ScanTarget | null;
  /**
   * The active scenario id — a single source of truth shared across modules, so
   * SCENARIO and TERRITORY reflect the same selection without duplicating state.
   * Generic: any future module that participates in a scenario reads this.
   */
  scenarioId: string | null;
}

type Action =
  | { type: 'set'; scan: ScanTarget }
  | { type: 'clear'; elementId?: string }
  | { type: 'selectScenario'; scenarioId: string };

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
    case 'selectScenario':
      if (state.scenarioId === action.scenarioId) return state;
      return { ...state, scenarioId: action.scenarioId };
  }
}

interface FieldContextValue {
  scan: ScanTarget | null;
  scenarioId: string | null;
  reducedMotion: boolean;
  setScan: (t: ScanTarget) => void;
  clearScan: (elementId?: string) => void;
  selectScenario: (scenarioId: string) => void;
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

  const value = useMemo<FieldContextValue>(
    () => ({
      scan: state.scan,
      scenarioId: state.scenarioId,
      reducedMotion,
      setScan,
      clearScan,
      selectScenario,
    }),
    [state.scan, state.scenarioId, reducedMotion, setScan, clearScan, selectScenario],
  );

  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}

export function useField(): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error('useField must be used within a FieldProvider');
  return ctx;
}
