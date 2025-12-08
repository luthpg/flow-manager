import { useNavigate } from '@ciderjs/city-gas/react';
import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';
import type { RouteNames, RouteParams } from '@/generated/router';
import type { FlowGraphData, FlowSheet } from '~/types/flow';

interface UseFlowSheetsProps {
  initialData?: FlowGraphData | null;
  /** ルート名 (例: '/flow/[id]/[version]/edit') */
  routeName: RouteNames;
  /** パスパラメータやクエリパラメータ (例: { id: '...', version: '...' }) */
  routeParams: RouteParams[RouteNames];
}

export const useFlowSheets = ({
  initialData,
  routeName,
  routeParams,
}: UseFlowSheetsProps) => {
  const navigate = useNavigate();

  // --- State ---
  const [sheets, setSheets] = useState<FlowSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Initialization ---
  // biome-ignore lint/correctness/useExhaustiveDependencies: checked by json stringify
  useEffect(() => {
    if (!initialData || isInitialized) return;

    let loadedSheets: FlowSheet[] = [];
    let initialActiveId = '';

    // A. データの正規化
    if (initialData.sheets && initialData.sheets.length > 0) {
      loadedSheets = initialData.sheets;
      initialActiveId = initialData.activeSheetId || loadedSheets[0].id;
    } else {
      const legacyNodes = (initialData as any).nodes || [];
      const legacyEdges = (initialData as any).edges || [];
      const sheet1Id = '0';
      loadedSheets = [
        {
          id: sheet1Id,
          name: 'Page 1',
          nodes: legacyNodes,
          edges: legacyEdges,
        },
      ];
      initialActiveId = sheet1Id;
    }

    // B. URLパラメータ (sheetId) の確認
    const searchParams = new URLSearchParams(window.location.search);
    const urlSheetId = searchParams.get('sheetId');

    const targetId =
      urlSheetId && loadedSheets.find((s) => s.id === urlSheetId)
        ? urlSheetId
        : initialActiveId;

    // C. State反映
    setSheets(loadedSheets);
    setActiveSheetId(targetId);
    setIsInitialized(true);

    // D. URL補正 (Replace)
    if (urlSheetId !== targetId) {
      navigate(
        routeName,
        { ...routeParams, sheetId: targetId },
        { replace: true },
      );
    }
  }, [
    initialData,
    isInitialized,
    routeName,
    JSON.stringify(routeParams),
    navigate,
  ]);

  // --- Actions ---

  const getActiveSheetData = useCallback(() => {
    const sheet = sheets.find((s) => s.id === activeSheetId);
    return {
      nodes: sheet?.nodes || [],
      edges: sheet?.edges || [],
    };
  }, [sheets, activeSheetId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: checked by json stringify
  const switchSheet = useCallback(
    (targetId: string, currentNodes: Node[], currentEdges: Edge[]) => {
      if (targetId === activeSheetId) return null;

      // 1. 保存
      setSheets((prevSheets) =>
        prevSheets.map((sheet) => {
          if (sheet.id === activeSheetId) {
            return { ...sheet, nodes: currentNodes, edges: currentEdges };
          }
          return sheet;
        }),
      );

      // 2. 更新
      setActiveSheetId(targetId);

      // 3. URL更新 (Push)
      // 第2引数にパスパラメータ、第3引数にクエリパラメータ(sheetId)を渡す
      navigate(routeName, { ...routeParams, sheetId: targetId });

      // 4. データ返却
      const nextSheet = sheets.find((s) => s.id === targetId);
      return {
        nodes: nextSheet?.nodes || [],
        edges: nextSheet?.edges || [],
      };
    },
    [activeSheetId, sheets, navigate, routeName, JSON.stringify(routeParams)],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: checked by json stringify
  const addSheet = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      const newId = `${crypto.randomUUID().slice(0, 8)}`;
      const newSheet: FlowSheet = {
        id: newId,
        name: `Page ${sheets.length + 1}`,
        nodes: [],
        edges: [],
      };

      setSheets((prev) =>
        prev
          .map((s) =>
            s.id === activeSheetId
              ? { ...s, nodes: currentNodes, edges: currentEdges }
              : s,
          )
          .concat(newSheet),
      );
      setActiveSheetId(newId);

      // URL更新
      navigate(routeName, { ...routeParams, sheetId: newId });

      return { nodes: [], edges: [] };
    },
    [
      activeSheetId,
      sheets.length,
      navigate,
      routeName,
      JSON.stringify(routeParams),
    ],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: checked by json stringify
  const removeSheet = useCallback(
    (targetId: string) => {
      if (sheets.length <= 1) return;

      const targetIndex = sheets.findIndex((s) => s.id === targetId);
      const newSheets = sheets.filter((s) => s.id !== targetId);

      setSheets(newSheets);

      if (targetId === activeSheetId) {
        const nextIndex = Math.min(targetIndex, newSheets.length - 1);
        const nextSheet = newSheets[nextIndex];
        setActiveSheetId(nextSheet.id);

        // URL更新
        navigate(routeName, { ...routeParams, sheetId: nextSheet.id });

        return {
          nodes: nextSheet.nodes,
          edges: nextSheet.edges,
          didSwitch: true,
        };
      }

      return { didSwitch: false };
    },
    [sheets, activeSheetId, navigate, routeName, JSON.stringify(routeParams)],
  );

  const renameSheet = useCallback((targetId: string, newName: string) => {
    setSheets((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, name: newName } : s)),
    );
  }, []);

  const reorderSheets = useCallback((newSheets: FlowSheet[]) => {
    setSheets(newSheets);
  }, []);

  const getSnapshot = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      return {
        sheets: sheets.map((s) =>
          s.id === activeSheetId
            ? { ...s, nodes: currentNodes, edges: currentEdges }
            : s,
        ),
        activeSheetId,
      };
    },
    [sheets, activeSheetId],
  );

  return {
    isInitialized,
    sheets,
    activeSheetId,
    setSheets,
    setActiveSheetId,
    getActiveSheetData,
    switchSheet,
    addSheet,
    removeSheet,
    renameSheet,
    reorderSheets,
    getSnapshot,
  };
};
