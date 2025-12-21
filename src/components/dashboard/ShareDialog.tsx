import { Loader2, Trash2, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod'; // Keep zod for validation if needed, or manual
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import type { ApiResponse } from '~/types/appsscript/server';
import type { FolderPermission } from '~/types/flow';

// Simple validation
const isValidEmail = (email: string) => /^\S+@\S+\.\S+$/.test(email);

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
  const [permissions, setPermissions] = useState<FolderPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');

  const fetchPermissions = async () => {
    if (!folderId) return;
    setLoading(true);
    try {
      const json = await serverScripts.getFolderPermissions(folderId);
      const res = JSON.parse(json) as ApiResponse<FolderPermission[]>;
      if (res.data) setPermissions(res.data);
    } catch (error) {
      console.error('Failed to load permissions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPermissions();
      setEmail('');
      setRole('VIEWER');
    }
  }, [open, folderId]);

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;

    setAdding(true);
    try {
      await serverScripts.addFolderPermission(folderId, email, role);
      setEmail(''); // Reset form
      fetchPermissions(); // Reload list
    } catch (error) {
      console.error('Failed to invite user', error);
    } finally {
      setAdding(false);
    }
  };

  const onRemoveUser = async (permissionId: string) => {
    try {
      await serverScripts.removeFolderPermission(permissionId);
      fetchPermissions();
    } catch (error) {
      console.error('Failed to remove user', error);
    }
  };

  const onUpdateRole = async (permissionId: string, newRole: string) => {
    try {
      await serverScripts.updateFolderPermission(permissionId, newRole);
      fetchPermissions();
    } catch (error) {
      console.error('Failed to update role', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{folderName}"</DialogTitle>
          <DialogDescription>
            Invite users to collaborate on flows in this folder.
          </DialogDescription>
        </DialogHeader>

        {/* Invite Form */}
        <div className="flex items-center space-x-2 py-4">
          <form
            onSubmit={onAddUser}
            className="flex w-full items-center space-x-2"
          >
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="OWNER">Owner</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit" disabled={adding || !email}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span className="sr-only">Invite</span>
            </Button>
          </form>
        </div>

        <Separator className="my-2" />

        {/* Permission List */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium leading-none flex items-center gap-2">
            <Users className="w-4 h-4" /> User Access
          </h4>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 max-h-[300px] overflow-y-auto">
              {permissions.map((perm) => (
                <div
                  key={perm.permissionId}
                  className="flex items-center justify-between space-x-4"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={perm.avatarUrl} />
                      <AvatarFallback>
                        {perm.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {perm.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {perm.role.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={perm.role}
                      onValueChange={(val) =>
                        onUpdateRole(perm.permissionId, val)
                      }
                    >
                      <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="OWNER">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    {perm.role !== 'OWNER' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => onRemoveUser(perm.permissionId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {permissions.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-4">
                  No specific permissions set.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
