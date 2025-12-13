import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { serverScripts } from '@/lib/server';
import type { FlowListResponse } from '~/types/appsscript/server';
import type { DashboardFlowItem, FolderMeta } from '~/types/flow';

interface DashboardState {
  // State
  loading: boolean;
  flows: DashboardFlowItem[];
  folders: FolderMeta[];
  searchTerm: string;
  statusFilter: string; // 'ALL' | FlowStatus
  selectedFolderId: string | 'ALL';
  userEmail: string;

  // Actions
  fetchDashboardData: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedFolderId: (id: string | 'ALL') => void;

  // Computed (Helper for selecting filtered data)
  getFilteredFlows: () => DashboardFlowItem[];
  getSelectedFolderName: () => string;
}

export const useDashboardStore = create<DashboardState>()(
  immer((set, get) => ({
    loading: true,
    flows: [],
    folders: [],
    searchTerm: '',
    statusFilter: 'ALL',
    selectedFolderId: 'ALL',
    userEmail: '',

    fetchDashboardData: async () => {
      set((state) => {
        state.loading = true;
      });
      try {
        const json = await serverScripts.getFlows();
        const res = JSON.parse(json) as {
          success: boolean;
          data: FlowListResponse;
        };

        if (res.success && res.data) {
          set((state) => {
            state.flows = res.data.flows;
            state.folders = res.data.folders;
            state.loading = false;
            // ユーザーEmailは本来サーバーから渡されるコンテキスト等で管理するが、ここでは簡易的に保持
            state.userEmail = 'user@example.com';
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        set((state) => {
          state.loading = false;
        });
      }
    },

    setSearchTerm: (term) =>
      set((state) => {
        state.searchTerm = term;
      }),
    setStatusFilter: (status) =>
      set((state) => {
        state.statusFilter = status;
      }),
    setSelectedFolderId: (id) =>
      set((state) => {
        state.selectedFolderId = id;
      }),

    getFilteredFlows: () => {
      const { flows, searchTerm, statusFilter, selectedFolderId } = get();
      return flows.filter((flow) => {
        // 1. Folder Filter
        if (selectedFolderId !== 'ALL' && flow.folderId !== selectedFolderId) {
          return false;
        }
        // 2. Search Term
        if (
          searchTerm &&
          !flow.title.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        // 3. Status Filter
        if (statusFilter !== 'ALL' && flow.currentStatus !== statusFilter) {
          return false;
        }
        return true;
      });
    },

    getSelectedFolderName: () => {
      const { selectedFolderId, folders } = get();
      if (selectedFolderId === 'ALL') return 'All Flows';
      return (
        folders.find((f) => f.id === selectedFolderId)?.name || 'Unknown Folder'
      );
    },
  })),
);
