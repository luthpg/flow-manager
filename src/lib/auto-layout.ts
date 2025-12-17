import dagre from '@dagrejs/dagre';
import { type Edge, type Node, Position } from '@xyflow/react';
import {
  NODE_W_SQUARE,
  NODE_W_WIDE,
  OFFSET_Y,
  SLOT_HEIGHT,
  SLOT_WIDTH,
} from '@/lib/constants';

interface LayoutOptions {
  direction: 'TB' | 'LR';
}

// ノードタイプごとのサイズ判定
const getNodeSize = (type: string | undefined) => {
  // 正方形ノード (3x3 units = 60x60)
  const isSquare = [
    'bpmnEvent',
    'bpmnGateway',
    'bpmnJump',
    'bpmnTimer',
    'bpmnMessage', // MessageEvent
  ].includes(type || '');

  if (isSquare) {
    return { width: NODE_W_SQUARE, height: NODE_W_SQUARE };
  }

  // 横長ノード (3x7 units = 140x60)
  // bpmnTask, bpmnMessaging, bpmnDecision, bpmnDatabase
  return { width: NODE_W_WIDE, height: NODE_W_SQUARE }; // Heightは共通で60px
};

/**
 * Dagreを使用した自動レイアウト計算
 * + スロットグリッドへの強制吸着
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = { direction: 'LR' },
): Node[] => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = options.direction === 'LR';

  // グラフの設定
  // スロットサイズを意識した少し広めのマージンを設定
  dagreGraph.setGraph({
    rankdir: options.direction,
    ranker: 'network-simplex',
    nodesep: isHorizontal ? 60 : 60, // ノード間隔（スロットの余白を考慮）
    ranksep: isHorizontal ? 100 : 80, // 階層間隔
  });

  // ノードの登録
  for (const node of nodes) {
    // スイムレーンと注釈はレイアウト計算から除外
    // (これらはコンテンツに合わせて配置されるべきものなので、ここでは無視して後で手動調整か現状維持)
    if (node.type === 'bpmnSwimlane' || node.type === 'bpmnAnnotation') break;

    const { width, height } = getNodeSize(node.type);

    dagreGraph.setNode(node.id, { width, height });
  }

  // エッジの登録
  for (const edge of edges) {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  }

  // 計算実行
  dagre.layout(dagreGraph);

  // 計算結果を「スロットグリッド」に吸着させて適用
  return nodes.map((node) => {
    // 除外したノードはそのまま返す
    if (node.type === 'bpmnSwimlane' || node.type === 'bpmnAnnotation')
      return node;

    if (dagreGraph.hasNode(node.id)) {
      const nodeWithPosition = dagreGraph.node(node.id);

      // 1. Dagreの中心座標を取得
      // React Flowは左上基準なので補正が必要だが、
      // ここではスロットの中心に置きたいので、一旦Dagreの中心座標を使う
      const rawCenterX = nodeWithPosition.x;
      const rawCenterY = nodeWithPosition.y;

      // 2. スロット座標への丸め込み (Snap to Slot)
      // スロットのインデックス(0, 1, 2...)を計算
      const slotIndexX = Math.round(rawCenterX / SLOT_WIDTH);
      const slotIndexY = Math.round(rawCenterY / SLOT_HEIGHT);

      // 3. 実際の描画座標（左上）を計算
      // スロットの左上 + 中央寄せオフセット
      const { width } = getNodeSize(node.type);
      const offsetX = (SLOT_WIDTH - width) / 2;

      // スロットの開始位置
      const slotLeft = slotIndexX * SLOT_WIDTH;
      const slotTop = slotIndexY * SLOT_HEIGHT;

      // 最終座標: スロット内の中央（Y軸はOFFSET_Y考慮）
      const x = slotLeft + offsetX;
      const y = slotTop + OFFSET_Y;

      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: { x, y },
      };
    }

    return node;
  });
};
