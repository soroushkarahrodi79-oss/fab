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
}

type Action =
  | { type: 'set'; scan: ScanTarget }
  | { type: 'clear'; elementId?: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set':
      return { scan: action.scan };
    case 'clear':
      // Only clear if the leaving element still owns the readout, so a fast
      // pointer moving between elements does not flicker the scanner off.
      if (action.elementId && state.scan?.elementId !== action.elementId) {
        return state;
      }
      return { scan: null };
  }
}

interface FieldContextValue {
  scan: ScanTarget | null;
  reducedMotion: boolean;
  setScan: (t: ScanTarget) => void;
  clearScan: (elementId?: string) => void;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function FieldProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { scan: null });
  const reducedMotion = useReducedMotion();

  const setScan = useCallback((scan: ScanTarget) => dispatch({ type: 'set', scan }), []);
  const clearScan = useCallback(
    (elementId?: string) => dispatch({ type: 'clear', elementId }),
    [],
  );

  const value = useMemo<FieldContextValue>(
    () => ({ scan: state.scan, reducedMotion, setScan, clearScan }),
    [state.scan, reducedMotion, setScan, clearScan],
  );

  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>;
}

export function useField(): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error('useField must be used within a FieldProvider');
  return ctx;
}
