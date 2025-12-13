import type { Edge, Node } from '@xyflow/react';

export type DiffStatus = 'added' | 'deleted' | 'modified' | 'unchanged';
export type DiffDecision = 'accepted' | 'rejected';

export interface DiffResult {
  nodes: Node[];
  edges: Edge[];
  changes: Record<string, any>;
}

// プロパティ変更検知
const getChangedProps = (before: any, after: any) => {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  const diffs: any = {};
  let hasDiff = false;

  keys.forEach((key) => {
    if (['position', 'selected', 'width', 'height', '_diff'].includes(key))
      return;

    // JSON文字列化して比較 (簡易)
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diffs[key] = { from: before[key], to: after[key] };
      hasDiff = true;
    }
  });
  return hasDiff ? diffs : null;
};

export const computeDiff = (
  baseNodes: Node[],
  baseEdges: Edge[],
  currentNodes: Node[],
  currentEdges: Edge[],
): DiffResult => {
  const mergedNodes: Node[] = [];
  const mergedEdges: Edge[] = [];
  const changes: Record<string, any> = {};

  const baseNodeMap = new Map(baseNodes.map((n) => [n.id, n]));
  const baseEdgeMap = new Map(baseEdges.map((e) => [e.id, e]));

  // 1. Current Nodes (Added or Modified or Unchanged)
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
        changes[curr.id] = propDiff;
      } else {
        mergedNodes.push({
          ...curr,
          data: { ...curr.data, _diff: 'unchanged' },
        });
      }
      baseNodeMap.delete(curr.id);
    }
  });

  // 2. Remaining Base Nodes (Deleted)
  baseNodeMap.forEach((deleted) => {
    mergedNodes.push({
      ...deleted,
      data: { ...deleted.data, _diff: 'deleted' },
      draggable: false,
      connectable: false,
    });
  });

  // 3. Edges (簡易比較: IDベース)
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

  return { nodes: mergedNodes, edges: mergedEdges, changes };
};

export const resolveDiff = (
  diffNodes: Node[],
  diffEdges: Edge[],
  baseNodes: Node[],
  baseEdges: Edge[],
  decisions: Record<string, DiffDecision>,
) => {
  const finalNodes: Node[] = [];
  const finalEdges: Edge[] = [];
  const baseNodeMap = new Map(baseNodes.map((n) => [n.id, n]));
  const baseEdgeMap = new Map(baseEdges.map((e) => [e.id, e]));

  // Nodes Resolution
  diffNodes.forEach((node) => {
    const status = node.data._diff as string;
    const decision = decisions[node.id] || 'accepted';

    // _diffプロパティを削除したクリーンなデータを作る関数
    const clean = (n: Node) => {
      const d = { ...n.data };
      delete d._diff;
      return { ...n, data: d };
    };

    if (status === 'added') {
      if (decision === 'accepted') finalNodes.push(clean(node));
    } else if (status === 'deleted') {
      if (decision === 'rejected') {
        const original = baseNodeMap.get(node.id) || node;
        finalNodes.push(clean(original));
      }
    } else if (status === 'modified') {
      if (decision === 'accepted') {
        finalNodes.push(clean(node));
      } else {
        const original = baseNodeMap.get(node.id);
        if (original) finalNodes.push(clean(original));
      }
    } else {
      finalNodes.push(clean(node));
    }
  });

  // Edges Resolution
  diffEdges.forEach((edge) => {
    const status = edge.data?._diff as string;
    const decision = decisions[edge.id] || 'accepted';

    const clean = (e: Edge) => {
      const d = { ...e.data };
      if (d) delete d._diff;
      return { ...e, data: d, animated: false };
    };

    if (status === 'added') {
      if (decision === 'accepted') finalEdges.push(clean(edge));
    } else if (status === 'deleted') {
      if (decision === 'rejected') {
        const original = baseEdgeMap.get(edge.id) || edge;
        finalEdges.push(clean(original));
      }
    } else {
      finalEdges.push(clean(edge));
    }
  });

  // Cleanup dangling edges
  const nodeIds = new Set(finalNodes.map((n) => n.id));
  const validEdges = finalEdges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  return { nodes: finalNodes, edges: validEdges };
};
