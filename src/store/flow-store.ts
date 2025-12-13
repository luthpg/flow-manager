import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FlowGraphData, FlowSheet } from '~/types/flow';

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface SheetHistory {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

interface FlowState {
  sheets: FlowSheet[];
  activeSheetId: string;
  histories: Record<string, SheetHistory>;

  // Actions
  initializeFlow: (data: FlowGraphData | null) => void;
  setActiveSheetId: (sheetId: string) => void;
  addSheet: () => void;
  removeSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, name: string) => void;
  reorderSheets: (sheets: FlowSheet[]) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;

  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

export const useFlowStore = create<FlowState>()(
  immer((set, get) => ({
    sheets: [],
    activeSheetId: '',
    histories: {},

    initializeFlow: (data) => {
      // データがない場合のデフォルト
      const defaultSheets: FlowSheet[] = [
        { id: 'sheet-1', name: 'Page 1', nodes: [], edges: [] },
      ];

      const sheets =
        data && data.sheets.length > 0 ? data.sheets : defaultSheets;
      const activeId = data?.activeSheetId ? data.activeSheetId : sheets[0].id;

      set((state) => {
        state.sheets = sheets;
        state.activeSheetId = activeId;
        state.histories = {};
        sheets.forEach((s) => {
          state.histories[s.id] = { past: [], future: [] };
        });
      });
    },

    setActiveSheetId: (id) =>
      set((state) => {
        state.activeSheetId = id;
      }),

    addSheet: () => {
      const newId = crypto.randomUUID();
      const newSheet: FlowSheet = {
        id: newId,
        name: `Page ${get().sheets.length + 1}`,
        nodes: [],
        edges: [],
      };
      set((state) => {
        state.sheets.push(newSheet);
        state.activeSheetId = newId;
        state.histories[newId] = { past: [], future: [] };
      });
    },

    removeSheet: (targetId) => {
      set((state) => {
        if (state.sheets.length <= 1) return;
        const index = state.sheets.findIndex((s) => s.id === targetId);
        state.sheets = state.sheets.filter((s) => s.id !== targetId);
        delete state.histories[targetId];

        if (state.activeSheetId === targetId) {
          const nextIndex = Math.min(index, state.sheets.length - 1);
          state.activeSheetId = state.sheets[nextIndex].id;
        }
      });
    },

    renameSheet: (id, name) => {
      set((state) => {
        const s = state.sheets.find((s) => s.id === id);
        if (s) s.name = name;
      });
    },

    reorderSheets: (sheets) =>
      set((state) => {
        state.sheets = sheets;
      }),

    onNodesChange: (changes) => {
      set((state) => {
        const s = state.sheets.find((sh) => sh.id === state.activeSheetId);
        if (s) s.nodes = applyNodeChanges(changes, s.nodes);
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const s = state.sheets.find((sh) => sh.id === state.activeSheetId);
        if (s) s.edges = applyEdgeChanges(changes, s.edges);
      });
    },

    onConnect: (conn) => {
      set((state) => {
        const s = state.sheets.find((sh) => sh.id === state.activeSheetId);
        if (s) s.edges = addEdge(conn, s.edges);
      });
    },

    setNodes: (nodes) => {
      set((state) => {
        const s = state.sheets.find((sh) => sh.id === state.activeSheetId);
        if (s) s.nodes = nodes;
      });
    },

    setEdges: (edges) => {
      set((state) => {
        const s = state.sheets.find((sh) => sh.id === state.activeSheetId);
        if (s) s.edges = edges;
      });
    },

    addNode: (node) => {
      set((state) => {
        const s = state.sheets.find((sh) => sh.id === state.activeSheetId);
        if (s) s.nodes.push(node);
      });
    },

    takeSnapshot: () => {
      set((state) => {
        const id = state.activeSheetId;
        const s = state.sheets.find((sh) => sh.id === id);
        const h = state.histories[id];
        if (s && h) {
          h.past.push({
            nodes: JSON.parse(JSON.stringify(s.nodes)),
            edges: JSON.parse(JSON.stringify(s.edges)),
          });
          h.future = [];
          if (h.past.length > 50) h.past.shift();
        }
      });
    },

    undo: () => {
      set((state) => {
        const id = state.activeSheetId;
        const s = state.sheets.find((sh) => sh.id === id);
        const h = state.histories[id];
        if (s && h && h.past.length > 0) {
          h.future.unshift({
            nodes: JSON.parse(JSON.stringify(s.nodes)),
            edges: JSON.parse(JSON.stringify(s.edges)),
          });
          const prev = h.past.pop();
          if (prev) {
            s.nodes = prev.nodes;
            s.edges = prev.edges;
          }
        }
      });
    },

    redo: () => {
      set((state) => {
        const id = state.activeSheetId;
        const s = state.sheets.find((sh) => sh.id === id);
        const h = state.histories[id];
        if (s && h && h.future.length > 0) {
          h.past.push({
            nodes: JSON.parse(JSON.stringify(s.nodes)),
            edges: JSON.parse(JSON.stringify(s.edges)),
          });
          const next = h.future.shift();
          if (next) {
            s.nodes = next.nodes;
            s.edges = next.edges;
          }
        }
      });
    },
  })),
);
