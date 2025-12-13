import { GitPullRequestArrow, History } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useViewerStore } from '@/store/viewer-store';

export function ViewerSidebar({
  selectedNodeId,
}: {
  selectedNodeId: string | null;
}) {
  const {
    nodes,
    historyList,
    isDiffMode,
    diffDecisions,
    setDiffDecision,
    rawDiffResult,
  } = useViewerStore(
    useShallow((state) => ({
      nodes: state.nodes,
      historyList: state.historyList,
      isDiffMode: state.isDiffMode,
      diffDecisions: state.diffDecisions,
      setDiffDecision: state.setDiffDecision,
      rawDiffResult: state.rawDiffResult,
    })),
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const diffNodes = rawDiffResult?.nodes || [];

  return (
    <aside className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col z-10 shadow-xl h-full">
      <ScrollArea className="flex-1">
        {isDiffMode && (
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <GitPullRequestArrow className="w-4 h-4" /> Review Changes
            </h3>
            <div className="space-y-2">
              {diffNodes
                .filter((n) => n.data._diff && n.data._diff !== 'unchanged')
                .map((node) => {
                  const status = node.data._diff as string;
                  const isAccepted =
                    (diffDecisions[node.id] ?? 'accepted') === 'accepted';
                  return (
                    <div
                      key={node.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{status}</Badge>
                        <span className="truncate max-w-[100px]">
                          {(node.data.label as string) || 'Node'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={
                            isAccepted
                              ? 'text-muted-foreground'
                              : 'text-red-500 font-bold'
                          }
                        >
                          {isAccepted ? 'Apply' : 'Revert'}
                        </span>
                        <Switch
                          checked={isAccepted}
                          onCheckedChange={(c) => setDiffDecision(node.id, c)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="p-5 space-y-8">
          <section>
            <h3 className="text-sm font-semibold mb-4">Details</h3>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <div className="p-2 bg-muted/50 border rounded text-sm">
                    {(selectedNode.data.label as string) || 'No Label'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic text-center py-4 border border-dashed rounded">
                Select a node
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <History className="w-4 h-4" /> History
            </h3>
            <div className="space-y-4 pl-2 border-l ml-2">
              {historyList.map((h, _i) => (
                <div key={h.id} className="relative pl-4">
                  <div className="text-xs text-muted-foreground">{h.date}</div>
                  <div className="text-sm font-medium">
                    {h.action}{' '}
                    <span className="font-normal text-xs text-muted-foreground">
                      by {h.user}
                    </span>
                  </div>
                  {h.comment && (
                    <div className="mt-1 text-xs bg-muted/50 p-2 rounded">
                      {h.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
