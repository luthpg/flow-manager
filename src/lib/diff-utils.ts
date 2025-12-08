import type { Edge, Node } from '@xyflow/react';

export type DiffStatus = 'added' | 'deleted' | 'modified' | 'unchanged';

export interface DiffResult {
  nodes: Node[];
  edges: Edge[];
  // 変更詳細をIDキーで保持 (変更前/変更後)
  changes: Record<string, { before: any; after: any }>;
}

// 判定ステータス
export type DiffDecision = 'accepted' | 'rejected';

/**
 * 差分と判定結果をマージして、最終的なグラフデータを生成する
 * @param diffNodes Diff計算済みのノードリスト (curr)
 * @param diffEdges Diff計算済みのエッジリスト (curr)
 * @param baseNodes 比較元のノードリスト (old)
 * @param decisions ユーザーの判定マップ { [id]: 'accepted' | 'rejected' }
 */
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

  // --- Nodesの解決 ---
  diffNodes.forEach((node) => {
    const status = node.data._diff as string;
    const decision = decisions[node.id] || 'accepted'; // デフォルトは採用

    if (status === 'added') {
      // 追加 & 採用 -> 追加する
      // 追加 & 不採用 -> 追加しない (何もしない)
      if (decision === 'accepted') {
        finalNodes.push({ ...node, data: { ...node.data, _diff: undefined } }); // _diffは消す
      }
    } else if (status === 'deleted') {
      // 削除 & 採用 -> 削除する (何もしない)
      // 削除 & 不採用 -> 削除を取り消す (元に戻す = 追加する)
      if (decision === 'rejected') {
        // 元のデータを復元
        // (diffNodesに入っているdeletedノードはbase由来なのでそのまま使えるが、念のためbaseMapから取る)
        const original = baseNodeMap.get(node.id) || node;
        finalNodes.push({
          ...original,
          data: { ...original.data, _diff: undefined },
        });
      }
    } else if (status === 'modified') {
      // 変更 & 採用 -> 新しいデータを使う
      // 変更 & 不採用 -> 古いデータを使う
      if (decision === 'accepted') {
        finalNodes.push({ ...node, data: { ...node.data, _diff: undefined } });
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
      // 変更なし -> そのまま
      finalNodes.push({ ...node, data: { ...node.data, _diff: undefined } });
    }
  });

  // --- Edgesの解決 (Nodesと同様) ---
  diffEdges.forEach((edge) => {
    const status = edge.data?._diff as string;
    const decision = decisions[edge.id] || 'accepted';

    if (status === 'added') {
      if (decision === 'accepted')
        finalEdges.push({ ...edge, data: { ...edge.data, _diff: undefined } });
    } else if (status === 'deleted') {
      if (decision === 'rejected') {
        const original = baseEdgeMap.get(edge.id) || edge;
        finalEdges.push({
          ...original,
          data: { ...original.data, _diff: undefined },
        });
      }
    } else if (status === 'unchanged') {
      finalEdges.push({ ...edge, data: { ...edge.data, _diff: undefined } });
    }
  });

  // 整合性チェック: 存在しないノードに繋がるエッジを除去
  const nodeIds = new Set(finalNodes.map((n) => n.id));
  const validEdges = finalEdges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  return { nodes: finalNodes, edges: validEdges };
};

// プロパティの差分検知用ヘルパー
const getChangedProps = (before: any, after: any) => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: any = {};
  let hasDiff = false;

  keys.forEach((key) => {
    // 位置情報(position)や特定プロパティの変更を無視したい場合はここで除外
    if (
      key === 'position' ||
      key === 'selected' ||
      key === 'width' ||
      key === 'height'
    )
      return;

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

  // 1. Current (Draft) Nodes の走査
  currentNodes.forEach((curr) => {
    const base = baseNodeMap.get(curr.id);
    if (!base) {
      // Baseにないので「追加」
      mergedNodes.push({ ...curr, data: { ...curr.data, _diff: 'added' } });
    } else {
      // Baseにあるので比較
      // dataプロパティの比較
      const propDiff = getChangedProps(base.data, curr.data);

      if (propDiff) {
        // 「変更」
        mergedNodes.push({
          ...curr,
          data: { ...curr.data, _diff: 'modified' },
        });
        changes[curr.id] = propDiff;
      } else {
        // 「変更なし」
        mergedNodes.push({
          ...curr,
          data: { ...curr.data, _diff: 'unchanged' },
        });
      }
      baseNodeMap.delete(curr.id); // 処理済みとして削除
    }
  });

  // 2. Base (Active) Nodes の残り = 「削除」
  baseNodeMap.forEach((deleted) => {
    mergedNodes.push({
      ...deleted,
      data: { ...deleted.data, _diff: 'deleted' },
      // 削除ノードはドラッグ不可・選択のみ可にする等の制御
      draggable: false,
      connectable: false,
    });
  });

  // 3. Edges の比較 (簡易実装: IDベース)
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
