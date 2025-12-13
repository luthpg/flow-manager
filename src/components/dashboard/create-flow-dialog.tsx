import { useNavigate } from '@ciderjs/city-gas/react';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { serverScripts } from '@/lib/server';
import type { ApiResponse, SaveDraftResponse } from '~/types/appsscript/server';

export function CreateFlowDialog({ trigger }: { trigger?: React.ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const newFlowId = crypto.randomUUID();
      // 初期データ (FlowGraphData型に準拠)
      const initialGraphData = {
        activeSheetId: 'sheet-1',
        sheets: [
          {
            id: 'sheet-1',
            name: 'Page 1',
            nodes: [],
            edges: [],
          },
        ],
      };

      const json = await serverScripts.saveDraft({
        flowId: newFlowId,
        title: title,
        graphData: initialGraphData,
      });

      const res = JSON.parse(json) as ApiResponse<SaveDraftResponse>;

      if (res.success && res.data) {
        toast.success('Flow created successfully');
        setOpen(false);
        setTitle('');
        // エディタへ遷移
        navigate('/flow/[id]/[version]/edit', {
          id: newFlowId,
          version: res.data.versionId,
        });
      } else {
        toast.error('Failed to create flow', { description: res.error });
      }
    } catch (_e) {
      toast.error('Communication error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 w-14 p-0 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md fixed bottom-6 right-6 sm:static z-40">
            <Plus className="w-6 h-6 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">New Flow</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Flow</DialogTitle>
          <DialogDescription>
            Enter a unique name for your new process.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flow-title">Flow Title</Label>
            <Input
              id="flow-title"
              placeholder="e.g. Expense Approval Process"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Flow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
