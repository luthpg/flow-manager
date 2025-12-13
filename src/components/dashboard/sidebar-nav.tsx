import { Folder, FolderOpen, Layers } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
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

      {folders.length === 0 ? (
        <div className="text-sm text-muted-foreground px-4 py-2 italic">
          No folders found
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            return (
              <Button
                key={folder.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                className={cn(
                  'justify-start gap-2 truncate',
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
            );
          })}
        </div>
      )}
    </nav>
  );
}
