import { useNavigate } from '@ciderjs/city-gas/react';
import { FileSpreadsheet, Menu, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuditLogViewer } from '@/components/dashboard/AuditLogViewer'; // NEW
import { FlowCard } from '@/components/dashboard/FlowCard';
import { ShareDialog } from '@/components/dashboard/ShareDialog'; // NEW
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ModeToggle } from '@/components/mode-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // NEW
import { serverScripts } from '@/lib/server';
import type { FlowMeta, Folder } from '~/types/flow';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [flows, setFlows] = useState<FlowMeta[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Share Dialog State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);

  // Initial Data Fetch
  // biome-ignore lint/correctness/useExhaustiveDependencies: initial loading
  useEffect(() => {
    (async () => {
      // Fetch Folders
      const foldersRes = await serverScripts.getFolders();
      if (foldersRes != null) setFolders(foldersRes);

      // Fetch Flows (Initial All)
      loadFlows();
    })();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    const res = await serverScripts.getFlows();
    if (res != null) {
      setFlows(res);
    }
    setLoading(false);
  };

  // Server-side Search
  // biome-ignore lint/correctness/useExhaustiveDependencies: search term change
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim()) {
        setLoading(true);
        const res = await serverScripts.searchFlows(searchTerm);
        if (res != null) setFlows(res);
        setLoading(false);
      } else {
        // Reset to all flows (or filtered by folder if we combine logics)
        // For now, simple reset to all flows, then applying client-side folder filter
        loadFlows();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleShareFolder = (folderId: string) => {
    setShareFolderId(folderId);
    setShareDialogOpen(true);
  };

  const handleNewFlow = async () => {
    setLoading(true);
    try {
      const res = await serverScripts.createFlow({
        title: 'New Flow',
        folderId: selectedFolderId || 'root',
      });
      if (res != null) {
        navigate('/flow/[id]/[version]/edit', {
          id: res.flowId,
          version: res.versionId,
        });
      }
    } catch (e) {
      console.error('Failed to create new flow', e);
    } finally {
      setLoading(false);
    }
  };

  const getFolderName = (id: string | null) => {
    if (!id) return '';
    return folders.find((f) => f.folderId === id)?.name || '';
  };

  // Client-side Folder Filtering
  // (Note: ideally server would handle this, but for now we filter the displayed flows)
  const displayedFlows = flows.filter((flow) => {
    if (selectedFolderId) return flow.folderId === selectedFolderId;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-300">
      {/* --- Top App Bar (Header) --- */}
      <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-4 bg-background/95 backdrop-blur border-b border-border shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 md:hidden"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              FM
            </div>
            <h1 className="text-xl font-medium text-foreground hidden sm:block">
              Flowchart Manager
            </h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9 bg-muted/50 border-input focus:bg-background transition-colors"
            placeholder="Search flows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ModeToggle />
        <Button
          onClick={() => handleShareFolder(selectedFolderId || 'root')}
          variant="outline"
          size="sm"
          className="hidden sm:flex"
        >
          Folder Permissions
        </Button>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2"
          onClick={handleNewFlow}
          disabled={loading}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Flow</span>
        </Button>
        <Avatar className="w-8 h-8 border border-border">
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            U
          </AvatarFallback>
        </Avatar>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onShareFolder={handleShareFolder}
        />

        {/* --- Main Content --- */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <Tabs defaultValue="flows" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="flows" className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                My Flows
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />{' '}
                {/* Use distinctive icon if possible */}
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="flows" className="outline-none">
              {/* Grid Layout for Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
                {displayedFlows.map((flow) => (
                  <FlowCard key={flow.flowId} flow={flow} />
                ))}
              </div>

              {/* Empty State */}
              {!loading && displayedFlows.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileSpreadsheet className="w-12 h-12 mb-2 opacity-20" />
                  <p>No flows found</p>
                  {searchTerm && (
                    <p className="text-sm">Matching "{searchTerm}"</p>
                  )}
                  {selectedFolderId && (
                    <p className="text-sm">
                      In folder "
                      {
                        folders.find((f) => f.folderId === selectedFolderId)
                          ?.name
                      }
                      "
                    </p>
                  )}
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="outline-none">
              <AuditLogViewer />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* --- Floating Action Button (FAB) --- */}
      <div className="fixed bottom-8 right-8 z-40">
        <Button
          size="lg"
          className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl transition-transform hover:scale-105 active:scale-95 p-0 grid place-items-center"
          onClick={handleNewFlow}
          disabled={loading}
        >
          <Plus className="w-8 h-8 text-white" />
        </Button>
      </div>

      {/* Share Dialog */}
      {shareFolderId && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          folderId={shareFolderId}
          folderName={getFolderName(shareFolderId)}
        />
      )}
    </div>
  );
}
