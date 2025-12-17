import { useNavigate } from '@ciderjs/city-gas/react';
import {
  ArrowLeft,
  CheckCircle2,
  Diff,
  Loader2,
  Pencil,
  Share2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { ShareDialog } from '@/components/dashboard/share-dialog';
import { ModeToggle } from '@/components/mode-toggle';
import { useTheme } from '@/components/theme-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import useIsMobile from '@/hooks/is-mobile';
import { useViewerStore } from '@/store/viewer-store';

export function ViewerHeader() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { isMobile } = useIsMobile();
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const {
    meta,
    versionId,
    userRole,
    isDiffMode,
    toggleDiffMode,
    approveFlow,
    rejectFlow,
    flowId,
    activeSheetId,
  } = useViewerStore(
    useShallow((state) => ({
      meta: state.meta,
      versionId: state.versionId,
      userRole: state.userRole,
      isDiffMode: state.isDiffMode,
      toggleDiffMode: state.toggleDiffMode,
      approveFlow: state.approveFlow,
      rejectFlow: state.rejectFlow,
      flowId: state.flowId,
      activeSheetId: state.activeSheetId,
    })),
  );

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const canEdit = ['EDITOR', 'APPROVER', 'ADMIN'].includes(userRole);
  const canApprove =
    ['APPROVER', 'ADMIN'].includes(userRole) &&
    meta?.currentStatus === 'PENDING';

  const handleAction = async (action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const result =
        action === 'approve'
          ? await approveFlow(comment)
          : await rejectFlow(comment);
      if (result.success) {
        toast.success(`Flow ${action}d successfully`);
        if (action === 'approve' && result.newVersionId) {
          navigate('/flow/[id]/[version]/preview', {
            id: flowId,
            version: result.newVersionId,
          });
        } else {
          window.location.reload();
        }
      } else {
        toast.error('Action failed', { description: result.error });
      }
    } catch {
      toast.error('Error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-3 md:px-4 bg-background z-20 shrink-0">
      <div className="flex items-center gap-2 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-medium truncate">
              {meta?.title}
            </h1>
            <Badge variant="outline" className="font-mono">
              {versionId}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Share Button */}
        {meta?.folderId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsShareOpen(true)}
            title="Share Folder"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        )}

        <ModeToggle />

        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate('/flow/[id]/[version]/edit', {
                id: flowId,
                version: versionId,
                sheetId: activeSheetId,
              })
            }
          >
            <Pencil className="w-4 h-4 mr-2" /> Edit
          </Button>
        )}
        {!isMobile && canApprove && (
          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <Toggle
              pressed={isDiffMode}
              onPressedChange={(p) => toggleDiffMode(p, isDark)}
            >
              <Diff className="w-4 h-4 mr-2" /> Diff
            </Toggle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Flow?</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Reason..."
                />
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction('reject')}
                    disabled={isProcessing}
                  >
                    {isProcessing && <Loader2 className="animate-spin mr-2" />}{' '}
                    Reject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Flow?</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comment (Optional)"
                />
                <DialogFooter>
                  <Button
                    onClick={() => handleAction('approve')}
                    disabled={isProcessing}
                  >
                    {isProcessing && <Loader2 className="animate-spin mr-2" />}{' '}
                    Approve
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {meta?.folderId && (
        <ShareDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          folderId={meta.folderId}
          folderName="Parent Folder" // 簡易表示（必要ならAPIからフォルダ名を取得して渡す）
        />
      )}
    </header>
  );
}
