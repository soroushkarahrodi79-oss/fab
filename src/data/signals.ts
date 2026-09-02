import type { Signal } from './types';

/**
 * Authored signals — project↔project `feeds`/`validates` relationships that
 * cannot be derived structurally from `Project.sourceIds`/`territoryIds` (see
 * `deriveStructuralSignals` in `./signals-derive.ts`, merged with this list in
 * `./index.ts`). An edge belongs here only when a specific fact independently
 * proves it, carried in `note`.
 *
 * Empty as of Phase 4D: the honesty audit found zero committed facts backing
 * any `feeds`/`validates` edge among current projects — the prior six
 * hand-authored signals (this collection, before the audit) were unbacked or
 * directly contradicted by committed data. See docs/PHASE_4D_SIGNALS.md.
 */
export const signals: Signal[] = [];
