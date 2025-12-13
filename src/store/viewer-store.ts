import type { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  computeDiff,
  type DiffDecision,
  type DiffStatus,
  resolveDiff,
} from '@/lib/diff-utils';
import { serverScripts } from '@/lib/server';
import type { ApiResponse } from '~/types/appsscript/server';
import type { FlowData, FlowMeta, FlowSheet, Role } from '~/types/flow';

// History Item Type (Internal)
export interface HistoryItem {
  id: string;
  date: string;
  user: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMMENT';
  comment: string;
}

interface ViewerState {
  // --- Basic Flow Data ---
  loading: boolean;
  flowId: string;
  versionId: string;
  meta: FlowMeta | null;
  sheets: FlowSheet[];
  activeSheetId: string;
  userRole: Role;
  historyList: HistoryItem[];

  // --- Canvas State (Active Sheet) ---
  nodes: Node[];
  edges: Edge[];

  // --- Diff Mode State ---
  isDiffMode: boolean;
  diffDecisions: Record<string, DiffDecision>;
  // Diff計算のための元データ保持
  originalGraph: { nodes: Node[]; edges: Edge[] } | null;
  rawDiffResult: {
    nodes: Node[];
    edges: Edge[];
    baseNodes: Node[];
    baseEdges: Edge[];
  } | null;

  // --- Actions ---
  initialize: (id: string, version: string, sheetId?: string) => Promise<void>;
  switchSheet: (sheetId: string) => void;

  // Diff Actions
  toggleDiffMode: (enabled: boolean, isDark: boolean) => void;
  setDiffDecision: (nodeId: string, accepted: boolean) => void;

  // Approval Actions
  approveFlow: (
    comment: string,
  ) => Promise<{ success: boolean; newVersionId?: string; error?: string }>;
  rejectFlow: (
    comment: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

// Helper: Parse History
const parseHistory = (
  raw: string,
  user: string,
  date: string,
): HistoryItem[] => {
  const items: HistoryItem[] = [
    {
      id: 'init',
      date: new Date(date).toLocaleDateString(),
      user: user.split('@')[0],
      action: 'SUBMITTED',
      comment: '',
    },
  ];
  if (!raw) return items;

  const entries = raw.split(/\n\n/g);
  entries.forEach((entry, idx) => {
    const match = entry.match(/^\[(Approved|Rejected) by (.+?)\]:\s*(.*)/s);
    if (match) {
      items.push({
        id: `hist-${idx}`,
        date: '---',
        user: match[2].split('@')[0],
        action: match[1].toUpperCase() as any,
        comment: match[3],
      });
    } else if (entry.trim()) {
      if (items[0]) items[0].comment = entry;
    }
  });
  return items.reverse();
};

// Helper: Diff Styles
const getDiffStyle = (
  status: DiffStatus,
  isDark: boolean,
): React.CSSProperties => {
  switch (status) {
    case 'added':
      return {
        backgroundColor: isDark ? 'rgba(30, 64, 175, 0.3)' : '#dbeafe',
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
      };
    case 'deleted':
      return {
        backgroundColor: isDark ? 'rgba(153, 27, 27, 0.3)' : '#fee2e2',
        borderColor: '#ef4444',
        opacity: 0.7,
        borderStyle: 'dotted',
      };
    case 'modified':
      return {
        backgroundColor: isDark ? 'rgba(6, 78, 59, 0.3)' : '#dcfce7',
        borderColor: '#22c55e',
        borderWidth: '3px',
      };
    default:
      return { opacity: 0.5 };
  }
};

export const useViewerStore = create<ViewerState>()(
  immer((set, get) => ({
    loading: true,
    flowId: '',
    versionId: '',
    meta: null,
    sheets: [],
    activeSheetId: '',
    userRole: 'VIEWER',
    historyList: [],
    nodes: [],
    edges: [],
    isDiffMode: false,
    diffDecisions: {},
    originalGraph: null,
    rawDiffResult: null,

    initialize: async (id, version, sheetId) => {
      set((state) => {
        state.loading = true;
        state.flowId = id;
        state.versionId = version;
      });
      try {
        const json = await serverScripts.getFlowData(id, version);
        const res = JSON.parse(json) as ApiResponse<FlowData>;

        if (res.success && res.data) {
          const { meta, graphData, userRole, versionDetail } = res.data as any; // Type assertion for extended response

          const sheets = graphData.sheets || [];
          const initialId =
            sheetId || graphData.activeSheetId || sheets[0]?.id || '';
          const activeSheet = sheets.find((s: FlowSheet) => s.id === initialId);

          set((state) => {
            state.meta = meta;
            state.sheets = sheets;
            state.activeSheetId = initialId;
            state.nodes = activeSheet?.nodes || [];
            state.edges = activeSheet?.edges || [];
            state.userRole = userRole || 'VIEWER';
            state.historyList = parseHistory(
              versionDetail.comment,
              versionDetail.createdBy,
              versionDetail.createdAt,
            );

            // Diff計算用のオリジナルデータ保持
            state.originalGraph = {
              nodes: activeSheet?.nodes || [],
              edges: activeSheet?.edges || [],
            };

            state.loading = false;
          });

          // Diff準備 (PENDINGの場合のみ、バックグラウンドで比較対象を取得)
          if (meta.currentStatus === 'PENDING') {
            // 簡易実装: activeVersionId (公開版) と比較すると仮定
            // 本来はサーバーから比較対象データも取得するAPIがあると良いが、ここでは既存APIを再利用
            try {
              // 公開版のIDがあれば取得
              if (meta.activeVersionId) {
                const baseJson = await serverScripts.getFlowData(
                  id,
                  meta.activeVersionId,
                );
                const baseRes = JSON.parse(baseJson);
                if (baseRes.success) {
                  const baseSheets = baseRes.data.graphData.sheets;
                  const baseSheet =
                    baseSheets.find((s: any) => s.id === initialId) ||
                    baseSheets[0];

                  const { nodes: diffNodes, edges: diffEdges } = computeDiff(
                    baseSheet.nodes || [],
                    baseSheet.edges || [],
                    activeSheet?.nodes || [],
                    activeSheet?.edges || [],
                  );

                  set((state) => {
                    state.rawDiffResult = {
                      nodes: diffNodes,
                      edges: diffEdges,
                      baseNodes: baseSheet.nodes || [],
                      baseEdges: baseSheet.edges || [],
                    };
                  });
                }
              }
            } catch (e) {
              console.warn('Diff fetch failed', e);
            }
          }
        }
      } catch (_e) {
        set((state) => {
          state.loading = false;
        });
      }
    },

    switchSheet: (targetId) => {
      set((state) => {
        if (state.activeSheetId === targetId) return;

        // 前のシートの状態を保存する必要はない(ViewerはReadonly)ため、
        // 単純に次のシートのデータをロードする
        const nextSheet = state.sheets.find((s) => s.id === targetId);
        if (nextSheet) {
          state.activeSheetId = targetId;
          state.nodes = nextSheet.nodes;
          state.edges = nextSheet.edges;
          state.originalGraph = {
            nodes: nextSheet.nodes,
            edges: nextSheet.edges,
          };

          // シート切り替え時、Diffモードは一旦解除が安全
          state.isDiffMode = false;
          state.rawDiffResult = null; // 必要なら再取得ロジックを入れる
        }
      });
    },

    toggleDiffMode: (enabled, isDark) => {
      set((state) => {
        state.isDiffMode = enabled;
        const diff = state.rawDiffResult;

        if (enabled && diff) {
          // Diffスタイルを適用して表示
          state.nodes = diff.nodes.map((n) => {
            const status = n.data._diff as DiffStatus;
            if (!status || status === 'unchanged') return n;
            return {
              ...n,
              style: { ...n.style, ...getDiffStyle(status, isDark) },
            };
          });
          // エッジの色分け
          state.edges = diff.edges.map((e) => {
            const status = e.data?._diff as DiffStatus;
            let stroke = '';
            if (status === 'added') stroke = '#3b82f6';
            if (status === 'deleted') stroke = '#ef4444';
            return stroke
              ? { ...e, style: { ...e.style, stroke, strokeWidth: 2 } }
              : e;
          });
        } else if (state.originalGraph) {
          // 元に戻す
          state.nodes = state.originalGraph.nodes;
          state.edges = state.originalGraph.edges;
        }
      });
    },

    setDiffDecision: (nodeId, accepted) => {
      set((state) => {
        state.diffDecisions[nodeId] = accepted ? 'accepted' : 'rejected';

        // プレビューの即時反映 (Rejectedなら表示を変えるなど)
        if (state.isDiffMode && state.rawDiffResult) {
          const _decision = accepted ? 'accepted' : 'rejected';
          // ノードの再計算ロジック...（ここでは省略。簡易的に決定のみ保存）
        }
      });
    },

    approveFlow: async (comment) => {
      const {
        flowId,
        versionId,
        rawDiffResult,
        diffDecisions,
        sheets,
        activeSheetId,
      } = get();

      let graphDataPayload;
      // Diffがある場合、Resolveしてデータを確定させる
      if (rawDiffResult) {
        const { nodes, edges } = resolveDiff(
          rawDiffResult.nodes,
          rawDiffResult.edges,
          rawDiffResult.baseNodes,
          rawDiffResult.baseEdges,
          diffDecisions,
        );
        // 現在のシートのみ更新したデータを作成
        const updatedSheets = sheets.map((s) =>
          s.id === activeSheetId ? { ...s, nodes, edges } : s,
        );
        graphDataPayload = { sheets: updatedSheets, activeSheetId };
      }

      const json = await serverScripts.approveFlow({
        flowId,
        versionId,
        comment,
        graphData: graphDataPayload,
      });
      const res = JSON.parse(json);
      return {
        success: res.success,
        newVersionId: res.data?.versionId,
        error: res.error,
      };
    },

    rejectFlow: async (comment) => {
      const { flowId, versionId } = get();
      const json = await serverScripts.rejectFlow({
        flowId,
        versionId,
        comment,
      });
      const res = JSON.parse(json);
      return { success: res.success, error: res.error };
    },
  })),
);
