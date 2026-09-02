import { atlas } from './data/index';
import { FieldProvider } from './interaction/FieldContext';
import { Shell } from './shell/Shell';

export default function App() {
  // Seed the shared scenario selection so SCENARIO and TERRITORY agree on first
  // paint, without either module owning the state.
  const initialScenarioId = atlas.scenarios?.[0]?.id ?? null;
  return (
    <FieldProvider initialScenarioId={initialScenarioId}>
      <Shell data={atlas} />
    </FieldProvider>
  );
}
