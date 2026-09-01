// Type surface for the deterministic HATI transform (implemented in
// hati-transform.mjs). Kept as a declaration so the build scripts stay plain
// Node ESM while tests and the app get types without an @types/node dependency.
export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[];

export interface HatiRaw {
  assetCatalog: CsvRow[];
  scenariosSummary: CsvRow[];
  scenarios: CsvRow[];
}

export interface HatiDataset {
  assets: Array<Record<string, unknown> & { id: string; provenance: Record<string, unknown> }>;
  scenarios: Array<Record<string, unknown> & { id: string; provenance: Record<string, unknown> }>;
  decisions: Array<Record<string, unknown> & { id: string; provenance: Record<string, unknown> }>;
}

export function buildHati(raw: HatiRaw): HatiDataset;
