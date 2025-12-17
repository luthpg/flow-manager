import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { getLayoutedElements } from '@/lib/auto-layout';
import {
  NODE_W_SQUARE,
  NODE_W_WIDE,
  OFFSET_Y,
  SLOT_HEIGHT,
  SLOT_WIDTH,
} from '@/lib/constants';

// ヘルパー: ノード生成
const createNode = (
  id: string,
  type: string,
  x = 0,
  y = 0,
  data: Record<string, unknown> = {},
): Node => ({
  id,
  type,
  position: { x, y },
  data: { label: id, ...data },
});

const createEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
});

describe('auto-layout', () => {
  describe('getLayoutedElements', () => {
    it('should snap nodes to slot grid', () => {
      const nodes: Node[] = [
        createNode('1', 'bpmnEvent', 50, 50),
        createNode('2', 'bpmnTask', 200, 50),
      ];
      const edges: Edge[] = [createEdge('e1', '1', '2')];

      const result = getLayoutedElements(nodes, edges);

      // 位置がスロットグリッドにスナップされていること
      for (const node of result) {
        // X座標のチェック: スロット幅の倍数 + オフセット
        const isWide = ['bpmnTask', 'bpmnMessaging', 'bpmnDecision'].includes(
          node.type || '',
        );
        const nodeWidth = isWide ? NODE_W_WIDE : NODE_W_SQUARE;
        const offsetX = (SLOT_WIDTH - nodeWidth) / 2;

        // スロット位置を逆算
        const slotX = (node.position.x - offsetX) / SLOT_WIDTH;
        expect(Number.isInteger(slotX)).toBe(true);

        // Y座標のチェック: スロット高さの倍数 + OFFSET_Y
        const slotY = (node.position.y - OFFSET_Y) / SLOT_HEIGHT;
        expect(Number.isInteger(slotY)).toBe(true);
      }
    });

    it('should set correct handle positions for horizontal layout (LR)', () => {
      const nodes: Node[] = [
        createNode('1', 'bpmnEvent', 0, 0, { eventType: 'start' }),
        createNode('2', 'bpmnTask', 100, 0),
      ];
      const edges: Edge[] = [createEdge('e1', '1', '2')];

      const result = getLayoutedElements(nodes, edges, { direction: 'LR' });

      for (const node of result) {
        expect(node.targetPosition).toBe('left');
        expect(node.sourcePosition).toBe('right');
      }
    });

    it('should set correct handle positions for vertical layout (TB)', () => {
      const nodes: Node[] = [
        createNode('1', 'bpmnEvent', 0, 0, { eventType: 'start' }),
        createNode('2', 'bpmnTask', 0, 100),
      ];
      const edges: Edge[] = [createEdge('e1', '1', '2')];

      const result = getLayoutedElements(nodes, edges, { direction: 'TB' });

      for (const node of result) {
        expect(node.targetPosition).toBe('top');
        expect(node.sourcePosition).toBe('bottom');
      }
    });

    it('should exclude swimlanes from layout calculation', () => {
      const swimlane = createNode('lane1', 'bpmnSwimlane', 0, 0);
      swimlane.style = { width: 500, height: 200 };

      const nodes: Node[] = [
        swimlane,
        createNode('1', 'bpmnEvent', 50, 50, { eventType: 'start' }),
      ];
      const edges: Edge[] = [];

      const result = getLayoutedElements(nodes, edges);

      // スイムレーンは元の位置を維持
      const resultLane = result.find((n) => n.id === 'lane1');
      expect(resultLane?.position.x).toBe(0);
      expect(resultLane?.position.y).toBe(0);
    });

    it('should exclude annotations from layout calculation', () => {
      const annotation = createNode('ann1', 'bpmnAnnotation', 100, 100);

      const nodes: Node[] = [
        annotation,
        createNode('1', 'bpmnEvent', 50, 50, { eventType: 'start' }),
      ];
      const edges: Edge[] = [];

      const result = getLayoutedElements(nodes, edges);

      // アノテーションは元の位置を維持
      const resultAnn = result.find((n) => n.id === 'ann1');
      expect(resultAnn?.position.x).toBe(100);
      expect(resultAnn?.position.y).toBe(100);
    });

    it('should handle disconnected nodes', () => {
      const nodes: Node[] = [
        createNode('1', 'bpmnEvent', 0, 0, { eventType: 'start' }),
        createNode('2', 'bpmnTask', 100, 0),
        createNode('3', 'bpmnTask', 200, 0), // エッジなし
      ];
      const edges: Edge[] = [createEdge('e1', '1', '2')];

      // エラーなく実行できること
      const result = getLayoutedElements(nodes, edges);
      expect(result).toHaveLength(3);
    });

    it('should use default LR direction when not specified', () => {
      const nodes: Node[] = [createNode('1', 'bpmnTask', 0, 0)];
      const edges: Edge[] = [];

      const result = getLayoutedElements(nodes, edges);

      expect(result[0].sourcePosition).toBe('right');
      expect(result[0].targetPosition).toBe('left');
    });
  });
});
