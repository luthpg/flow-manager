import type { Node } from '@xyflow/react';
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  MinusCircle,
  PlusCircle,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DiffSidebarProps {
  diffNodes: Node[];
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  onApprove: () => void;
  onReject: () => void;
  isActionProcessing: boolean;
}

export function DiffSidebar({
  diffNodes,
  onSelectNode,
  selectedNodeId,
  onApprove,
  onReject,
  isActionProcessing,
}: DiffSidebarProps) {
  // Group nodes by status
  const addedNodes = diffNodes.filter((n) => n.data._diff === 'added');
  const deletedNodes = diffNodes.filter((n) => n.data._diff === 'deleted');
  const modifiedNodes = diffNodes.filter((n) => n.data._diff === 'modified');

  const renderNodeList = (
    nodes: Node[],
    title: string,
    icon: React.ReactNode,
  ) => {
    if (nodes.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 mb-2">
          {icon}
          {title}{' '}
          <Badge
            variant="secondary"
            className="text-[10px] h-4 min-w-[1.2rem] px-1"
          >
            {nodes.length}
          </Badge>
        </h4>
        <div className="space-y-1">
          {nodes.map((node) => (
            <button
              type="button"
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded text-sm transition-colors border',
                selectedNodeId === node.id
                  ? `bg-accent text-accent-foreground border-primary`
                  : 'hover:bg-muted/50 border-transparent',
              )}
            >
              <span className="truncate max-w-[180px]">
                {(node.data.label as string) || node.id}
              </span>
              <ChevronRight
                className={cn(
                  'w-3 h-3 text-muted-foreground opacity-0',
                  selectedNodeId === node.id && 'opacity-100',
                )}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-background w-72 shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Review Changes
        </h3>
        <Badge>
          {
            diffNodes.filter(
              (n) => n.data._diff && n.data._diff !== 'unchanged',
            ).length
          }{' '}
          Changes
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-4">
        {renderNodeList(
          addedNodes,
          'Added',
          <PlusCircle className="w-3 h-3 text-blue-500" />,
        )}
        {renderNodeList(
          modifiedNodes,
          'Modified',
          <CheckCircle2 className="w-3 h-3 text-green-500" />,
        )}
        {renderNodeList(
          deletedNodes,
          'Deleted',
          <MinusCircle className="w-3 h-3 text-red-500" />,
        )}

        {diffNodes.every(
          (n) => !n.data._diff || n.data._diff === 'unchanged',
        ) && (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No changes detected.
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-border space-y-3 bg-muted/10">
        <h4 className="text-xs font-semibold text-muted-foreground">
          Final Decision
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="w-full border-red-200 hover:bg-red-50 hover:text-red-700 text-red-600"
            onClick={onReject}
            disabled={isActionProcessing}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={onApprove}
            disabled={isActionProcessing}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
