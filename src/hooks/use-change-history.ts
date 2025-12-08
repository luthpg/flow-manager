import type { Edge, Node } from '@xyflow/react';
import { useCallback, useState } from 'react';

// 履歴データの型
interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface SheetHistory {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

export const useChangeHistory = (activeSheetId: string) => {
  // シートごとの履歴を保持するマップ: { [sheetId]: { past: [], future: [] } }
  const [histories, setHistories] = useState<Record<string, SheetHistory>>({});

  // 現在のシートの履歴
  const currentHistory = histories[activeSheetId] || { past: [], future: [] };

  // --- Actions ---

  /**
   * スナップショット保存
   * 現在の activeSheetId の履歴スタックに追記する
   */
  const takeSnapshot = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      setHistories((prev) => {
        const current = prev[activeSheetId] || { past: [], future: [] };

        const snapshot: HistorySnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        };

        const newPast = [...current.past, snapshot];
        if (newPast.length > 50) newPast.shift(); // 履歴数制限

        return {
          ...prev,
          [activeSheetId]: {
            past: newPast,
            future: [], // 新しい操作をしたらRedoスタックはクリア
          },
        };
      });
    },
    [activeSheetId],
  );

  /**
   * Undo実行
   */
  const undo = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      const current = histories[activeSheetId];
      if (!current || current.past.length === 0) return null;

      const newPast = [...current.past];
      const previousState = newPast.pop()!; // 直前の状態

      // 現在の状態をFutureに積む
      const newFuture = [
        {
          nodes: JSON.parse(JSON.stringify(currentNodes)),
          edges: JSON.parse(JSON.stringify(currentEdges)),
        },
        ...current.future,
      ];

      setHistories((prev) => ({
        ...prev,
        [activeSheetId]: { past: newPast, future: newFuture },
      }));

      return previousState;
    },
    [histories, activeSheetId],
  );

  /**
   * Redo実行
   */
  const redo = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      const current = histories[activeSheetId];
      if (!current || current.future.length === 0) return null;

      const newFuture = [...current.future];
      const nextState = newFuture.shift()!; // 次の状態

      // 現在の状態をPastに積む
      const newPast = [
        ...current.past,
        {
          nodes: JSON.parse(JSON.stringify(currentNodes)),
          edges: JSON.parse(JSON.stringify(currentEdges)),
        },
      ];

      setHistories((prev) => ({
        ...prev,
        [activeSheetId]: { past: newPast, future: newFuture },
      }));

      return nextState;
    },
    [histories, activeSheetId],
  );

  /**
   * 履歴の削除 (シート削除時用)
   */
  const clearSheetHistory = useCallback((sheetId: string) => {
    setHistories((prev) => {
      const next = { ...prev };
      delete next[sheetId];
      return next;
    });
  }, []);

  return {
    takeSnapshot,
    undo,
    redo,
    canUndo: currentHistory.past.length > 0,
    canRedo: currentHistory.future.length > 0,
    clearSheetHistory,
  };
};
