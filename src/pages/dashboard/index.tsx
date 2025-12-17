import { Loader2, Menu } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { FlowCard } from '@/components/dashboard/flow-card';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useDashboardStore } from '@/store/dashboard-store';

export default function Dashboard() {
  // セレクター内での関数呼び出し（getFilteredFlowsなど）は毎回新しい配列を返すため
  // 無限ループの原因となります。ここではStateを直接取得し、コンポーネント内で計算します。
  const {
    loading,
    fetchDashboardData,
    flows,
    folders,
    searchTerm,
    statusFilter,
    selectedFolderId,
    isAdvancedSearching,
  } = useDashboardStore(
    useShallow((state) => ({
      loading: state.loading,
      fetchDashboardData: state.fetchDashboardData,
      flows: state.flows,
      folders: state.folders,
      searchTerm: state.searchTerm,
      statusFilter: state.statusFilter,
      selectedFolderId: state.selectedFolderId,
      isAdvancedSearching: state.isAdvancedSearching,
    })),
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // フィルタリングロジックをコンポーネント側の useMemo に移動
  const filteredFlows = useMemo(() => {
    return flows.filter((flow) => {
      // 1. Folder Filter
      if (selectedFolderId !== 'ALL' && flow.folderId !== selectedFolderId) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && flow.currentStatus !== statusFilter) {
        return false;
      }

      // 3. Quick Search (Enhanced)
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();

        // A. フロー名
        if (flow.title.toLowerCase().includes(lowerTerm)) return true;

        // B. フォルダ名
        const folderName =
          folders.find((f) => f.id === flow.folderId)?.name || '';
        if (folderName.toLowerCase().includes(lowerTerm)) return true;

        // C. バージョン名 (ID)
        const hasVersionMatch = flow.versions.some((v) =>
          v.versionId.toLowerCase().includes(lowerTerm),
        );
        if (hasVersionMatch) return true;

        return false; // マッチしなければ除外
      }

      return true;
    });
  }, [flows, folders, searchTerm, statusFilter, selectedFolderId]);

  // フォルダ名の解決も useMemo で行う
  const selectedFolderName = useMemo(() => {
    if (isAdvancedSearching) return 'Search Results';
    if (selectedFolderId === 'ALL') return 'All Flows';
    return (
      folders.find((f) => f.id === selectedFolderId)?.name || 'Unknown Folder'
    );
  }, [selectedFolderId, folders, isAdvancedSearching]);

  return (
    <div className="flex flex-col h-screen bg-background font-sans text-foreground">
      <DashboardHeader />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block h-full">
          <SidebarNav />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/20">
          <div className="flex items-center gap-3 mb-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarNav />
              </SheetContent>
            </Sheet>

            <h2 className="text-xl font-bold tracking-tight">
              {selectedFolderName}
            </h2>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {filteredFlows.length}
            </span>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFlows.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
              {filteredFlows.map((flow) => (
                <FlowCard key={flow.flowId} flow={flow} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted rounded-xl bg-background/50">
              <p className="text-muted-foreground">No flows found.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
