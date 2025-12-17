import { useNavigate } from '@ciderjs/city-gas/react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  FileText,
  GitBranch,
  MoreVertical,
  Share2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ShareDialog } from '@/components/dashboard/share-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DashboardFlowItem, FlowStatus } from '~/types/flow';

// ... (StatusBadge は同じ) ...
const StatusBadge = ({ status }: { status: FlowStatus }) => {
  const styles = {
    PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <Badge
      variant="outline"
      className={cn('font-normal text-[10px] h-5', styles[status])}
    >
      {status}
    </Badge>
  );
};

export function FlowCard({ flow }: { flow: DashboardFlowItem }) {
  const navigate = useNavigate();
  const [isShareOpen, setIsShareOpen] = useState(false); // State for ShareDialog

  const defaultVersionId = useMemo(() => {
    if (flow.currentStatus === 'PUBLISHED' && flow.activeVersionId) {
      return flow.activeVersionId;
    }
    return flow.versions[0]?.versionId || '';
  }, [flow]);

  const [selectedVersionId, setSelectedVersionId] = useState(defaultVersionId);
  const currentVersion = flow.versions.find(
    (v) => v.versionId === selectedVersionId,
  );

  const handleOpen = () => {
    if (selectedVersionId) {
      navigate('/flow/[id]/[version]/preview', {
        id: flow.flowId,
        version: selectedVersionId,
      });
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedVersionId) {
      navigate('/flow/[id]/[version]/edit', {
        id: flow.flowId,
        version: selectedVersionId,
      });
    }
  };

  if (!currentVersion) return null;

  return (
    <>
      <Card className="group flex flex-col h-[280px] overflow-hidden border-border/60 hover:border-primary/50 hover:shadow-md transition-all">
        <div
          className="h-36 bg-muted/30 relative border-b border-border flex items-center justify-center overflow-hidden cursor-pointer"
          onClick={handleOpen}
          onKeyUp={handleOpen}
        >
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(currentColor 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
          <div className="relative flex items-center gap-2 opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all">
            <div className="w-10 h-8 rounded border-2 border-slate-300 bg-background shadow-sm" />
            <div className="w-4 h-0.5 bg-slate-300" />
            <div className="w-8 h-8 rounded-full border-2 border-slate-300 bg-background shadow-sm" />
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  Edit Flow
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsShareOpen(true);
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <CardHeader className="p-3 pb-0 space-y-1">
          <h3
            className="font-semibold text-sm text-foreground truncate leading-tight cursor-pointer hover:underline"
            onClick={handleOpen}
            onKeyUp={handleOpen}
            title={flow.title}
          >
            {flow.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Select
              value={selectedVersionId}
              onValueChange={setSelectedVersionId}
            >
              <SelectTrigger
                className="h-6 text-[10px] w-auto min-w-[80px] bg-muted/50 border-transparent hover:bg-muted focus:ring-0 gap-1 px-2"
                onClick={(e) => e.stopPropagation()}
              >
                <GitBranch className="w-3 h-3 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {flow.versions.map((v) => (
                  <SelectItem
                    key={v.versionId}
                    value={v.versionId}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{v.versionId}</span>
                      {v.status === 'PUBLISHED' && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      )}
                      {v.status === 'DRAFT' && (
                        <span className="text-[10px] text-slate-400">
                          (Draft)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <StatusBadge status={currentVersion.status as FlowStatus} />
          </div>
        </CardHeader>

        <CardContent className="px-3 py-2 flex-1">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {currentVersion.comment || 'No description provided.'}
          </p>
        </CardContent>

        <CardFooter className="p-3 pt-2 mt-auto border-t bg-muted/5 flex justify-between items-center text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(currentVersion.createdAt), {
              addSuffix: true,
            })}
          </div>
          <div
            className="flex items-center gap-1"
            title={currentVersion.createdBy}
          >
            <FileText className="w-3 h-3" />
            <span className="max-w-[80px] truncate">
              {currentVersion.createdBy.split('@')[0]}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        folderId={flow.folderId}
        folderName="Parent Folder" // 理想はフォルダ名も渡すが、現状FlowMetaにフォルダ名は含まれていないため仮置き
      />
    </>
  );
}
