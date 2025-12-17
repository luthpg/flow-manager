import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { serverScripts } from '@/lib/server';
import type { FlowListResponse } from '~/types/appsscript/server';
import type {
  AdvancedSearchQuery,
  DashboardFlowItem,
  FolderMeta,
} from '~/types/flow';

interface DashboardState {
  loading: boolean;
  flows: DashboardFlowItem[];
  folders: FolderMeta[];

  // Quick Search State (Frontend only)
  searchTerm: string;
  statusFilter: string;
  selectedFolderId: string | 'ALL';

  // Advanced Search State
  isAdvancedSearching: boolean;

  userEmail: string;

  // Actions
  fetchDashboardData: () => Promise<void>;
  searchDetailed: (query: AdvancedSearchQuery) => Promise<void>;

  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setSelectedFolderId: (id: string | 'ALL') => void;

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
    isAdvancedSearching: false,
    userEmail: '',

    fetchDashboardData: async () => {
      set((state) => {
        state.loading = true;
        state.isAdvancedSearching = false;
      });
      try {
        const json = await serverScripts.getFlows();
        const res = JSON.parse(json) as FlowListResponse;

        if (res.success && res.data) {
          set((state) => {
            state.flows = res.data?.flows || [];
            state.folders = res.data?.folders || [];
            state.loading = false;
            state.userEmail = 'user@example.com'; // Mock or inject
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        set((state) => {
          state.loading = false;
        });
      }
    },

    searchDetailed: async (query) => {
      set((state) => {
        state.loading = true;
        state.isAdvancedSearching = true;
      });
      try {
        const json = await serverScripts.searchFlows(query);
        const res = JSON.parse(json) as FlowListResponse;

        if (res.success && res.data) {
          set((state) => {
            // 検索結果でリストを置換する
            state.flows = res.data?.flows || [];
            // フォルダ構造は維持しても良いが、一貫性のためレスポンスのものを使う
            if (res.data?.folders) state.folders = res.data.folders;

            // 簡易フィルタはリセットしておく
            state.searchTerm = '';
            state.statusFilter = 'ALL';
            state.selectedFolderId = 'ALL';

            state.loading = false;
          });
        }
      } catch (error) {
        console.error('Search failed', error);
        set((state) => {
          state.loading = false;
          state.isAdvancedSearching = false;
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
      const { flows, folders, searchTerm, statusFilter, selectedFolderId } =
        get();

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
    },

    getSelectedFolderName: () => {
      const { selectedFolderId, folders, isAdvancedSearching } = get();
      if (isAdvancedSearching) return 'Search Results';
      if (selectedFolderId === 'ALL') return 'All Flows';
      return (
        folders.find((f) => f.id === selectedFolderId)?.name || 'Unknown Folder'
      );
    },
  })),
);
