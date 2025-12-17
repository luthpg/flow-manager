import { Folder, FolderOpen, Layers, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ShareDialog } from '@/components/dashboard/share-dialog';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboard-store';

export function SidebarNav() {
  const { folders, selectedFolderId, setSelectedFolderId } = useDashboardStore(
    useShallow((state) => ({
      folders: state.folders,
      selectedFolderId: state.selectedFolderId,
      setSelectedFolderId: state.setSelectedFolderId,
    })),
  );

  const [shareConfig, setShareConfig] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <nav className="w-64 flex flex-col gap-2 p-4 border-r bg-background/50 h-full overflow-y-auto">
      <div className="px-2 py-2 mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Library
        </h2>
      </div>

      <Button
        variant={selectedFolderId === 'ALL' ? 'secondary' : 'ghost'}
        className={cn(
          'justify-start gap-2',
          selectedFolderId === 'ALL' && 'font-bold',
        )}
        onClick={() => setSelectedFolderId('ALL')}
      >
        <Layers className="w-4 h-4" />
        All Flows
      </Button>

      <div className="px-2 py-2 mt-4 mb-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Folders
        </h2>
      </div>

      <div className="flex flex-col gap-1">
        {folders.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          return (
            <ContextMenu key={folder.id}>
              <ContextMenuTrigger>
                <Button
                  variant={isSelected ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-2 truncate',
                    isSelected && 'font-bold',
                  )}
                  onClick={() => setSelectedFolderId(folder.id)}
                  title={folder.name}
                >
                  {isSelected ? (
                    <FolderOpen className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Folder className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() =>
                    setShareConfig({ id: folder.id, name: folder.name })
                  }
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {/* Share Dialog Instance */}
      {shareConfig && (
        <ShareDialog
          open={!!shareConfig}
          onOpenChange={(open) => !open && setShareConfig(null)}
          folderId={shareConfig.id}
          folderName={shareConfig.name}
        />
      )}
    </nav>
  );
}
