import { useNavigate } from '@ciderjs/city-gas/react';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical } from 'lucide-react';
import { useState } from 'react';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { serverScripts } from '@/lib/server';
import type { FlowMeta, FlowStatus, FlowVersion } from '~/types/flow';

const getStatusBadge = (status: FlowStatus) => {
  switch (status) {
    case 'PUBLISHED':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
          公開中
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
          申請中
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge
          variant="outline"
          className="border-border text-muted-foreground"
        >
          下書き
        </Badge>
      );
    case 'REJECTED':
      return <Badge variant="destructive">否認</Badge>;
    case 'MERGED':
      return (
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200"
        >
          マージ済
        </Badge>
      );
    default:
      return <Badge variant="outline">不明</Badge>;
  }
};

export function FlowCard({ flow }: { flow: FlowMeta }) {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const fetchVersions = async (open: boolean) => {
    if (!open || versions.length > 0) return;
    setLoadingVersions(true);
    try {
      const res = await serverScripts.getFlowVersions(flow.flowId);
      // const res = JSON.parse(json) as ApiResponse<FlowVersion[]>; // Removed
      if (res && Array.isArray(res)) {
        // Note: getFlowVersions returns FlowVersionDetail[] directly based on updated types
        setVersions(res);
      }
    } catch (e) {
      console.error('Failed to load versions', e);
    } finally {
      setLoadingVersions(false);
    }
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-border bg-card shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 rounded-xl flex flex-col h-[280px]"
      onClick={() =>
        navigate('/flow/[id]/[version]/preview', {
          id: flow.flowId,
          version: flow.versionId,
        })
      }
    >
      {/* Thumbnail Area (Mock) */}
      <div className="h-36 bg-muted/40 relative border-b border-border flex items-center justify-center overflow-hidden shrink-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        />
        <div className="w-24 h-16 border-2 border-border/50 rounded-md flex items-center justify-center bg-card shadow-sm group-hover:scale-105 transition-transform">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/20 mr-2" />
          <div className="w-8 h-0.5 bg-muted-foreground/20" />
          <div className="w-2 h-2 rounded-sm bg-muted-foreground/20 ml-2" />
        </div>
      </div>

      {/* Card Content */}
      <CardHeader className="p-4 pb-2 space-y-0">
        <div className="flex justify-between items-start">
          <h3
            className="font-medium text-card-foreground truncate pr-2 flex-1"
            title={flow.title}
          >
            {flow.title}
          </h3>
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu onOpenChange={fetchVersions}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-2 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Version History</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {loadingVersions ? (
                  <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                ) : (
                  versions.map((v) => (
                    <DropdownMenuItem
                      key={v.versionId}
                      onClick={() =>
                        navigate('/flow/[id]/[version]/preview', {
                          id: flow.flowId,
                          version: v.versionId,
                        })
                      }
                      className="flex justify-between"
                    >
                      <span>v{v.versionNum}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {v.status.toLowerCase()}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
                {versions.length === 0 && !loadingVersions && (
                  <DropdownMenuItem disabled>No history</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-1">
        {getStatusBadge(flow.currentStatus)}
      </CardContent>

      <CardFooter className="p-4 mt-auto flex justify-between items-center text-xs text-muted-foreground">
        <span>
          Updated:{' '}
          {formatDistanceToNow(new Date(flow.updatedAt), { addSuffix: true })}
        </span>
      </CardFooter>
    </Card>
  );
}
