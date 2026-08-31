import { atlas } from './data/index';
import { FieldProvider } from './interaction/FieldContext';
import { Shell } from './shell/Shell';

export default function App() {
  return (
    <FieldProvider>
      <Shell data={atlas} />
    </FieldProvider>
  );
}
