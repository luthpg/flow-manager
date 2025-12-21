import { FolderOpen, Layers, MoreHorizontal, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Folder } from '~/types/flow';

interface SidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onShareFolder?: (folderId: string) => void;
}

export function Sidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onShareFolder,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col h-[calc(100vh-64px)] sticky top-16 transition-colors">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Folders
        </h2>
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectFolder(null)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              selectedFolderId === null
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Layers className="w-4 h-4" />
            All Flows
          </button>

          {folders.map((folder) => (
            <div
              key={folder.folderId}
              className={cn(
                'group flex items-center justify-between px-3 py-1 rounded-md transition-colors w-full',
                selectedFolderId === folder.folderId
                  ? 'bg-primary/10'
                  : 'hover:bg-accent',
              )}
            >
              <button
                type="button"
                className={cn(
                  'flex-1 flex items-center gap-3 py-1 text-sm font-medium text-left truncate focus:outline-none',
                  selectedFolderId === folder.folderId
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-accent-foreground',
                )}
                onClick={() => onSelectFolder(folder.folderId)}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>

              {/* Folder Actions (Dropdown) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground focus-visible:opacity-100 ml-2"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onShareFolder?.(folder.folderId)}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
