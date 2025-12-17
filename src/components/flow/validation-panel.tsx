import { useReactFlow } from '@xyflow/react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ValidationIssue } from '@/lib/bpmn-validator';
import { cn } from '@/lib/utils';

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onClose?: () => void;
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
};

export function ValidationPanel({ issues, onClose }: ValidationPanelProps) {
  const { setCenter, getNodes } = useReactFlow();

  const handleJumpToNode = (nodeId?: string) => {
    if (!nodeId) return;
    const node = getNodes().find((n) => n.id === nodeId);
    if (node) {
      const x = node.position.x + (node.measured?.width || 0) / 2;
      const y = node.position.y + (node.measured?.height || 0) / 2;
      setCenter(x, y, { zoom: 1.2, duration: 800 });
    }
  };

  if (issues.length === 0) {
    return (
      <div className="absolute bottom-4 left-4 z-20 bg-background border border-border rounded-lg shadow-lg p-4 flex items-center gap-2 animate-in slide-in-from-bottom-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-medium">No issues found. Perfect!</span>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 w-80 bg-background/95 backdrop-blur border border-border rounded-lg shadow-xl flex flex-col max-h-[300px] animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold">
            Problems ({issues.length})
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 p-0">
        <div className="flex flex-col">
          {issues.map((issue) => (
            <button
              type="button"
              key={issue.id}
              onClick={() => handleJumpToNode(issue.nodeId)}
              className={cn(
                'flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0',
                'group focus:outline-none focus:bg-muted',
              )}
            >
              <div className="mt-0.5 shrink-0">
                <SeverityIcon severity={issue.severity} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span
                  className={cn(
                    'text-xs font-medium',
                    issue.severity === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-foreground',
                  )}
                >
                  {issue.message}
                </span>
                {issue.nodeId && (
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                    Click to reveal node
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
