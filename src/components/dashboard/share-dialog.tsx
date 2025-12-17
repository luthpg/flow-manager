import { Loader2, Trash2, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { serverScripts } from '@/lib/server';
import type {
  PermissionListResponse,
  PermissionUpdateResponse,
} from '~/types/appsscript/server';
import type { PermissionRow, Role } from '~/types/flow';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
}: ShareDialogProps) {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER');
  const [processing, setProcessing] = useState(false);

  // Fetch Permissions
  useEffect(() => {
    if (open && folderId) {
      setLoading(true);
      serverScripts
        .getFolderPermissions(folderId)
        .then((json) => {
          const res = JSON.parse(json) as PermissionListResponse;
          if (res.success && res.data) {
            setPermissions(res.data.permissions);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, folderId]);

  // Add Permission
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setProcessing(true);
    try {
      const json = await serverScripts.addFolderPermission({
        folderId,
        email: inviteEmail,
        role: inviteRole,
      });
      const res = JSON.parse(json) as PermissionUpdateResponse;
      if (res.success && res.data) {
        setPermissions([...permissions, res.data.permission]);
        setInviteEmail('');
        toast.success('User invited');
      } else {
        toast.error('Failed to invite', { description: res.error });
      }
    } finally {
      setProcessing(false);
    }
  };

  // Update Role
  const handleRoleChange = async (permId: string, newRole: Role) => {
    try {
      const json = await serverScripts.updateFolderPermission({
        permissionId: permId,
        role: newRole,
      });
      const res = JSON.parse(json);
      if (res.success) {
        setPermissions(
          permissions.map((p) =>
            p.permissionId === permId ? { ...p, role: newRole } : p,
          ),
        );
        toast.success('Role updated');
      }
    } catch {
      toast.error('Update failed');
    }
  };

  // Remove Permission
  const handleRemove = async (permId: string) => {
    try {
      const json = await serverScripts.removeFolderPermission({
        permissionId: permId,
      });
      const res = JSON.parse(json);
      if (res.success) {
        setPermissions(permissions.filter((p) => p.permissionId !== permId));
        toast.success('User removed');
      }
    } catch {
      toast.error('Remove failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Share "{folderName}"
          </DialogTitle>
          <DialogDescription>
            Manage who has access to this folder and its flows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invite Form */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add people (email)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as Role)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="APPROVER">Approver</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={processing || !inviteEmail}
            >
              Invite
            </Button>
          </div>

          <Separator />

          {/* Permission List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              People with access
            </h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin w-5 h-5" />
              </div>
            ) : (
              <div className="max-h-[200px] overflow-y-auto space-y-3 pr-1">
                {permissions?.map((perm) => (
                  <div
                    key={perm.permissionId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">
                          {perm.subjectEmail}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={perm.role}
                        onValueChange={(v) =>
                          handleRoleChange(perm.permissionId, v as Role)
                        }
                      >
                        <SelectTrigger className="h-8 w-[90px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                          <SelectItem value="APPROVER">Approver</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(perm.permissionId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
