import { createFileRoute } from '@tanstack/react-router';
import { AssuranceProvider } from '../context/AssuranceContext';
import { ConsoleShell } from '../components/console/ConsoleShell';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <AssuranceProvider>
      <ConsoleShell />
    </AssuranceProvider>
  );
}