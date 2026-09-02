import type { EvidenceStatus, Observation } from '../data/types';
import type { EvidenceGroup, EvidenceRow } from '../interaction/FieldContext';

/**
 * Generic Observation → evidence/provenance builder for the FIELD SCANNER's
 * disclosure. Pure and project-agnostic: it renders only what the Observation
 * DATA carries (value, the two evidence axes, and provenance) — any project
 * semantics (e.g. SNTO's "50 m buffer around the Point anchor") live in the
 * provenance NOTE, surfaced verbatim, never hard-coded here. Missing provenance
 * → only the OBSERVATION group; nothing is faked.
 */
const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  observed: 'Observed (measured in the field)',
  documented: 'Documented (authoritative record, not measured)',
  derived: 'Derived (computed, not directly measured)',
  modelled: 'Modelled (model output, not measured)',
  simulated: 'Simulated (scenario-forced model run)',
};

export function buildObservationEvidence(o: Observation, sourceLabel?: string): EvidenceGroup[] {
  const groups: EvidenceGroup[] = [];

  // 1) OBSERVATION — the two axes, kept explicitly separate (Phase 4C1).
  const obsRows: EvidenceRow[] = [
    { k: 'Variable', v: o.variable },
    { k: 'Value', v: `${o.value}${o.unit ? ` ${o.unit}` : ''}` },
    { k: 'Evidence', v: EVIDENCE_STATUS_LABEL[o.evidenceStatus], status: o.evidenceStatus },
    {
      k: 'Field validation',
      v: o.validated ? 'Field-validated' : 'Not field-validated',
      status: o.validated ? undefined : 'field-pending',
    },
  ];
  if (o.observedAt) obsRows.push({ k: 'Date', v: o.observedAt });
  groups.push({ label: 'OBSERVATION', rows: obsRows });

  // 2) SOURCE + LIMITATION — only when provenance exists (missing = missing).
  const p = o.provenance;
  if (p) {
    const provRows: EvidenceRow[] = [{ k: 'Source', v: sourceLabel ?? p.sourceId }];
    if (p.sourceRepo) provRows.push({ k: 'Dataset', v: p.sourceRepo });
    if (p.sourceFile) provRows.push({ k: 'File', v: p.sourceFile });
    if (p.sourceRef) provRows.push({ k: 'Record', v: p.sourceRef });
    if (p.temporalContext) provRows.push({ k: 'Temporal', v: p.temporalContext });
    if (p.fetchedAt) provRows.push({ k: 'Fetched', v: p.fetchedAt });
    groups.push({ label: 'SOURCE', rows: provRows });

    if (p.note)
      groups.push({
        // The provenance note carries the honest spatial-support statement
        // (e.g. "asset anchor · zonal aggregate over a 50 m buffer · not a
        // pixel measurement · field validation pending"), verbatim from data.
        label: 'LIMITATION',
        rows: [{ k: 'Support', v: p.note, status: 'zonal aggregate' }],
      });
  }

  return groups;
}
