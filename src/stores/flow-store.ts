import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Edge, Node } from '@xyflow/react';
import type { FlowGraphData, FlowSheet } from '~/types/flow';
import type { RouteNames, RouteParams } from '@/generated/router';

type NavigateFunction = any;

interface FlowStoreState {
  sheets: FlowSheet[];
  activeSheetId: string;
  isInitialized: boolean;
  nodes: Node[];
  edges: Edge[];
}

interface FlowStoreActions {
  init: (
    initialData: FlowGraphData,
    routeName: RouteNames,
    routeParams: RouteParams[RouteNames],
    navigate: NavigateFunction,
  ) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  switchSheet: (
    targetId: string,
    routeName: RouteNames,
    routeParams: RouteParams[RouteNames],
    navigate: NavigateFunction,
  ) => void;
  addSheet: (
    routeName: RouteNames,
    routeParams: RouteParams[RouteNames],
    navigate: NavigateFunction,
  ) => void;
  removeSheet: (
    targetId: string,
    routeName: RouteNames,
    routeParams: RouteParams[RouteNames],
    navigate: NavigateFunction,
  ) => void;
  renameSheet: (targetId: string, newName: string) => void;
  reorderSheets: (newSheets: FlowSheet[]) => void;
  getSnapshot: () => FlowGraphData;
  _saveCurrentSheet: () => void; // Helper action
}

export const useFlowStore = create<FlowStoreState & FlowStoreActions>()(
  immer((set, get) => ({
    // --- State ---
    sheets: [],
    activeSheetId: '',
    isInitialized: false,
    nodes: [],
    edges: [],

    // --- Actions ---

    _saveCurrentSheet: () => {
      const { activeSheetId, nodes, edges } = get();
      if (!activeSheetId) return;

      set((state) => {
        const sheetIndex = state.sheets.findIndex((s) => s.id === activeSheetId);
        if (sheetIndex !== -1) {
          state.sheets[sheetIndex].nodes = nodes;
          state.sheets[sheetIndex].edges = edges;
        }
      });
    },

    init: (initialData, routeName, routeParams, navigate) => {
      if (!initialData || get().isInitialized) return;

      let loadedSheets: FlowSheet[] = [];
      let initialActiveId = '';

      if (initialData.sheets && initialData.sheets.length > 0) {
        loadedSheets = initialData.sheets;
        initialActiveId = initialData.activeSheetId || loadedSheets[0].id;
      } else {
        const legacyNodes = (initialData as any).nodes || [];
        const legacyEdges = (initialData as any).edges || [];
        const sheet1Id = '0';
        loadedSheets = [
          { id: sheet1Id, name: 'Page 1', nodes: legacyNodes, edges: legacyEdges },
        ];
        initialActiveId = sheet1Id;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const urlSheetId = searchParams.get('sheetId');
      const targetId =
        urlSheetId && loadedSheets.find((s) => s.id === urlSheetId)
          ? urlSheetId
          : initialActiveId;

      const activeSheet = loadedSheets.find((s) => s.id === targetId);

      set({
        sheets: loadedSheets,
        activeSheetId: targetId,
        isInitialized: true,
        nodes: activeSheet?.nodes || [],
        edges: activeSheet?.edges || [],
      });

      if (urlSheetId !== targetId) {
        navigate(routeName, { ...routeParams, sheetId: targetId }, { replace: true });
      }
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    switchSheet: (targetId, routeName, routeParams, navigate) => {
      if (targetId === get().activeSheetId) return;

      get()._saveCurrentSheet();

      const nextSheet = get().sheets.find((s) => s.id === targetId);
      set({
        activeSheetId: targetId,
        nodes: nextSheet?.nodes || [],
        edges: nextSheet?.edges || [],
      });

      navigate(routeName, { ...routeParams, sheetId: targetId });
    },

    addSheet: (routeName, routeParams, navigate) => {
      get()._saveCurrentSheet();

      const newId = `${crypto.randomUUID().slice(0, 8)}`;
      const newSheet: FlowSheet = {
        id: newId,
        name: `Page ${get().sheets.length + 1}`,
        nodes: [],
        edges: [],
      };

      set((state) => {
        state.sheets.push(newSheet);
        state.activeSheetId = newId;
        state.nodes = [];
        state.edges = [];
      });

      navigate(routeName, { ...routeParams, sheetId: newId });
    },

    removeSheet: (targetId, routeName, routeParams, navigate) => {
      if (get().sheets.length <= 1) return;

      const targetIndex = get().sheets.findIndex((s) => s.id === targetId);
      const newSheets = get().sheets.filter((s) => s.id !== targetId);

      if (targetId === get().activeSheetId) {
        const nextIndex = Math.min(targetIndex, newSheets.length - 1);
        const nextSheet = newSheets[nextIndex];
        set({
          sheets: newSheets,
          activeSheetId: nextSheet.id,
          nodes: nextSheet.nodes,
          edges: nextSheet.edges,
        });
        navigate(routeName, { ...routeParams, sheetId: nextSheet.id });
      } else {
        set({ sheets: newSheets });
      }
    },

    renameSheet: (targetId, newName) => {
      set((state) => {
        const sheet = state.sheets.find((s) => s.id === targetId);
        if (sheet) {
          sheet.name = newName;
        }
      });
    },

    reorderSheets: (newSheets) => {
      set({ sheets: newSheets });
    },
    
    getSnapshot: () => {
      get()._saveCurrentSheet();
      const { sheets, activeSheetId } = get();
      return {
        sheets,
        activeSheetId,
      };
    },
  })),
);
