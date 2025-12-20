import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams } from '@ciderjs/city-gas/react';
import z from 'zod';

export const schema = z.object({
  sheetId: z.string().optional(),
});

export default function ViewerPage() {
  const { id, version, sheetId } = useParams('/flow/[id]/[version]/preview');
  return (
    <ReactFlowProvider key={`${id}-${version}`}>
      <ViewerContent id={id} version={version} sheetId={sheetId} />
    </ReactFlowProvider>
  );
}

function ViewerContent(
  _props: {
  id: string;
  version: string;
  sheetId?: string;
}) {
  return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      Flow Preview is currently unavailable due to maintenance.
    </div>
  );
}
