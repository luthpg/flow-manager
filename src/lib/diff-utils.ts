import type { Edge, Node } from '@xyflow/react';
import type { FlowSheet } from '~/types/flow';

export type DiffStatus = 'added' | 'deleted' | 'modified' | 'unchanged';

export interface SheetDiffResult {
  sheetId: string;
  status: DiffStatus;
  nodes: Node[];
  edges: Edge[];
  baseNodes: Node[];
  baseEdges: Edge[];
}

export interface DiffResult {
  sheets: Record<string, SheetDiffResult>;
}

// 判定ステータス
export type DiffDecision = 'accepted' | 'rejected';

/**
 * 差分と判定結果をマージして、最終的なグラフデータを生成する
 */
export const resolveDiff = (
  diffResult: DiffResult,
  decisions: Record<string, DiffDecision>, // Key: node/edge ID (globally unique ideally, or we need sheetId prefix)
): FlowSheet[] => {
  const resolvedSheets: FlowSheet[] = [];

  Object.values(diffResult.sheets).forEach((sheetDiff) => {
    const { sheetId, status, nodes, edges, baseNodes, baseEdges } = sheetDiff;
    const sheetDecision = decisions[sheetId] || 'accepted';

    // シート自体のDiff解決
    if (status === 'added') {
      if (sheetDecision === 'rejected') return; // Do not include
    } else if (status === 'deleted') {
      if (sheetDecision === 'accepted') return; // Confirm deletion
      // If rejected, allow processing to restore content (handled by recreating sheet from base)
    }

    // ノード・エッジの解決 (Modified or valid Added/Restored sheet)
    // Deleted sheet restored -> Treat as if "modified" (unchanged content + restore)
    // Actually if sheet is deleted and decision is 'rejected' (restore), we need to output the base content.
    if (status === 'deleted' && sheetDecision === 'rejected') {
      resolvedSheets.push({
        id: sheetId,
        name: 'Restored Sheet', // Name might be lost if not in baseNodes? baseNodes are nodes. We need sheet metadata.
        // Wait, DiffResult structure needs sheet metadata.
        // Simplify: Just use resolved nodes/edges.
        nodes: baseNodes.map((n) => ({
          ...n,
          data: { ...n.data, _diff: undefined },
        })),
        edges: baseEdges.map((e) => ({
          ...e,
          data: { ...e.data, _diff: undefined },
        })),
      });
      return;
    }

    const finalNodes: Node[] = [];
    const finalEdges: Edge[] = [];
    const baseNodeMap = new Map(baseNodes.map((n) => [n.id, n]));
    const baseEdgeMap = new Map(baseEdges.map((e) => [e.id, e]));

    // --- Nodesの解決 ---
    nodes.forEach((node) => {
      const diffStatus = node.data._diff as string;
      const decision = decisions[node.id] || 'accepted';

      if (diffStatus === 'added') {
        if (decision === 'accepted') {
          finalNodes.push({
            ...node,
            data: { ...node.data, _diff: undefined },
          });
        }
      } else if (diffStatus === 'deleted') {
        if (decision === 'rejected') {
          const original = baseNodeMap.get(node.id) || node;
          finalNodes.push({
            ...original,
            data: { ...original.data, _diff: undefined },
          });
        }
      } else if (diffStatus === 'modified') {
        if (decision === 'accepted') {
          finalNodes.push({
            ...node,
            data: { ...node.data, _diff: undefined },
          });
        } else {
          const original = baseNodeMap.get(node.id);
          if (original) {
            finalNodes.push({
              ...original,
              data: { ...original.data, _diff: undefined },
            });
          }
        }
      } else {
        finalNodes.push({ ...node, data: { ...node.data, _diff: undefined } });
      }
    });

    // --- Edgesの解決 ---
    edges.forEach((edge) => {
      const diffStatus = edge.data?._diff as string;
      const decision = decisions[edge.id] || 'accepted';

      if (diffStatus === 'added') {
        if (decision === 'accepted')
          finalEdges.push({
            ...edge,
            data: { ...edge.data, _diff: undefined },
          });
      } else if (diffStatus === 'deleted') {
        if (decision === 'rejected') {
          const original = baseEdgeMap.get(edge.id) || edge;
          finalEdges.push({
            ...original,
            data: { ...original.data, _diff: undefined },
          });
        }
      } else if (diffStatus === 'unchanged') {
        finalEdges.push({ ...edge, data: { ...edge.data, _diff: undefined } });
      }
    });

    // 整合性チェック
    const nodeIds = new Set(finalNodes.map((n) => n.id));
    const validEdges = finalEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    resolvedSheets.push({
      id: sheetId,
      name: 'Sheet', // TODO: Preserve sheet name
      nodes: finalNodes,
      edges: validEdges,
    });
  });

  return resolvedSheets;
};

const getChangedProps = (before: any, after: any) => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: any = {};
  let hasDiff = false;

  keys.forEach((key) => {
    if (
      key === 'position' ||
      key === 'selected' ||
      key === 'width' ||
      key === 'height' ||
      key === '_diff'
    )
      return;

    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diffs[key] = { from: before[key], to: after[key] };
      hasDiff = true;
    }
  });
  return hasDiff ? diffs : null;
};

// 単一シートのDiff計算 (内部利用)
const computeSingleSheetDiff = (
  baseNodes: Node[],
  baseEdges: Edge[],
  currentNodes: Node[],
  currentEdges: Edge[],
) => {
  const mergedNodes: Node[] = [];
  const mergedEdges: Edge[] = [];
  const baseNodeMap = new Map(baseNodes.map((n) => [n.id, n]));
  const baseEdgeMap = new Map(baseEdges.map((e) => [e.id, e]));

  // Nodes
  currentNodes.forEach((curr) => {
    const base = baseNodeMap.get(curr.id);
    if (!base) {
      mergedNodes.push({ ...curr, data: { ...curr.data, _diff: 'added' } });
    } else {
      const propDiff = getChangedProps(base.data, curr.data);
      if (propDiff) {
        mergedNodes.push({
          ...curr,
          data: { ...curr.data, _diff: 'modified' },
        });
      } else {
        mergedNodes.push({
          ...curr,
          data: { ...curr.data, _diff: 'unchanged' },
        });
      }
      baseNodeMap.delete(curr.id);
    }
  });

  baseNodeMap.forEach((deleted) => {
    mergedNodes.push({
      ...deleted,
      data: { ...deleted.data, _diff: 'deleted' },
      draggable: false,
      connectable: false,
    });
  });

  // Edges
  currentEdges.forEach((curr) => {
    if (!baseEdgeMap.has(curr.id)) {
      mergedEdges.push({
        ...curr,
        data: { ...curr.data, _diff: 'added' },
        animated: true,
      });
    } else {
      mergedEdges.push({ ...curr, data: { ...curr.data, _diff: 'unchanged' } });
      baseEdgeMap.delete(curr.id);
    }
  });

  baseEdgeMap.forEach((deleted) => {
    mergedEdges.push({
      ...deleted,
      data: { ...deleted.data, _diff: 'deleted' },
      animated: true,
    });
  });

  return { nodes: mergedNodes, edges: mergedEdges };
};

export const computeMultiSheetDiff = (
  baseSheets: FlowSheet[],
  targetSheets: FlowSheet[],
): DiffResult => {
  const result: DiffResult = { sheets: {} };

  const baseSheetMap = new Map(baseSheets.map((s) => [s.id, s]));

  // 1. Target Sheets (Modified / Added)
  targetSheets.forEach((target) => {
    const base = baseSheetMap.get(target.id);
    if (!base) {
      // Added Sheet
      const { nodes, edges } = computeSingleSheetDiff(
        [],
        [],
        target.nodes,
        target.edges,
      );
      // Mark all as 'added' implicitly by sending empty base
      result.sheets[target.id] = {
        sheetId: target.id,
        status: 'added',
        nodes,
        edges,
        baseNodes: [],
        baseEdges: [],
      };
    } else {
      // Modified Sheet (calculate node diffs)
      const { nodes, edges } = computeSingleSheetDiff(
        base.nodes,
        base.edges,
        target.nodes,
        target.edges,
      );
      // Determine if sheet itself is 'modified' or 'unchanged' based on content?
      // For now, assume 'modified' if present in both
      result.sheets[target.id] = {
        sheetId: target.id,
        status: 'modified',
        nodes,
        edges,
        baseNodes: base.nodes,
        baseEdges: base.edges,
      };
      baseSheetMap.delete(target.id);
    }
  });

  // 2. Base Sheets (Deleted)
  baseSheetMap.forEach((base) => {
    // Deleted Sheet -> Show all its nodes as deleted
    // To do this, we compare base nodes vs empty current
    const { nodes, edges } = computeSingleSheetDiff(
      base.nodes,
      base.edges,
      [],
      [],
    );
    result.sheets[base.id] = {
      sheetId: base.id,
      status: 'deleted',
      nodes, // Will contain all deleted nodes
      edges,
      baseNodes: base.nodes,
      baseEdges: base.edges,
    };
  });

  return result;
};
