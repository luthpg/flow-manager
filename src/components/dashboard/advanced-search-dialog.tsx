import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardStore } from '@/store/dashboard-store';
import type { AdvancedSearchQuery } from '~/types/flow';

export function AdvancedSearchDialog() {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [targetField, setTargetField] =
    useState<AdvancedSearchQuery['targetField']>('all');

  const searchDetailed = useDashboardStore((state) => state.searchDetailed);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async () => {
    setIsSubmitting(true);
    try {
      await searchDetailed({
        keyword,
        targetField,
      });
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Advanced Search</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
          <DialogDescription>
            Search within flow contents, including node labels, descriptions,
            and assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Keyword</Label>
            <Input
              placeholder="Search text..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Field</Label>
            <Select
              value={targetField}
              onValueChange={(v) => setTargetField(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="label">Node Labels</SelectItem>
                <SelectItem value="description">Descriptions</SelectItem>
                <SelectItem value="assignee">Assignees</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isSubmitting || !keyword.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
