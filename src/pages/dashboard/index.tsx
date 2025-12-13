import { Loader2, Menu } from 'lucide-react';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { FlowCard } from '@/components/dashboard/flow-card';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useDashboardStore } from '@/store/dashboard-store';

export default function Dashboard() {
  const { loading, fetchDashboardData, filteredFlows, selectedFolderName } =
    useDashboardStore(
      useShallow((state) => ({
        loading: state.loading,
        fetchDashboardData: state.fetchDashboardData,
        filteredFlows: state.getFilteredFlows(),
        selectedFolderName: state.getSelectedFolderName(),
      })),
    );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
