import type { Signal } from './types';

/**
 * Authored signals — relationships that structural derivation cannot produce
 * (see `deriveStructuralSignals` in `./signals-derive.ts`, merged with this
 * list in `./index.ts`) because the canonical contract doesn't prove them at
 * the exact semantic level claimed. An edge belongs here only when a
 * specific fact independently proves it, carried in `note`; it must not be
 * `active: true` unless that backing fact currently exists (see the `active`
 * doc comment on `Signal` in `./types.ts`) — an unproven, speculative
 * relationship stays `active: false` at most, and normally isn't added here
 * at all.
 *
 * Empty as of Phase 4D1: the honesty audit found zero committed facts
 * backing any edge among current projects beyond the exact shared-territory
 * relationship structural derivation already covers. The prior six
 * hand-authored signals (this collection, before the audit) were unbacked or
 * directly contradicted by committed data. See docs/PHASE_4D_SIGNALS.md.
 */
export const signals: Signal[] = [];
