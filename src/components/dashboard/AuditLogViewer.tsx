import { RefreshCcw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { serverScripts } from '@/lib/server';
import type { LogAction } from '~/types/appsscript/client';

type LogEntry = {
  logId: string;
  timestamp: string | Date;
  action: LogAction;
  actor: string;
  targetId: string;
  details: string;
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await serverScripts.getSystemLogs(100);
      if (res) {
        setLogs(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.actor.toLowerCase().includes(searchLower) ||
      log.targetId.toLowerCase().includes(searchLower) ||
      log.details.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Audit Logs</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCcw
            className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Action</TableHead>
              <TableHead className="w-[200px]">Actor</TableHead>
              <TableHead className="w-[150px]">Target ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.logId}>
                  <TableCell className="font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell className="text-sm">{log.actor}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.targetId}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: LogAction }) {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  const label = action;

  switch (action) {
    case 'APPROVE_FLOW':
      variant = 'default'; // primary color (usually blueish/black)
      // If we want specific colors we need custom classes or configured variants.
      // default badge is black in shadcn usually.
      break;
    case 'REJECT_FLOW':
      variant = 'destructive';
      break;
    case 'SUBMIT_FLOW':
      variant = 'secondary';
      break;
    case 'ADD_PERMISSION':
    case 'REMOVE_PERMISSION':
    case 'UPDATE_PERMISSION':
      variant = 'outline';
      break;
  }

  // shadcn Badge variants: default, secondary, destructive, outline.
  // We can add custom classes for colors if needed.
  return <Badge variant={variant}>{label}</Badge>;
}
