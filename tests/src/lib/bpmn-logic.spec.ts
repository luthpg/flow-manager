import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import {
  assignLaneToNodes,
  autoFormatGraph,
  validateBPMN,
} from '@/lib/bpmn-logic';
import { OFFSET_Y, SLOT_HEIGHT, SLOT_WIDTH } from '@/lib/constants';

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

describe('bpmn-logic', () => {
  describe('validateBPMN', () => {
    it('should report error if no Start Event exists', () => {
      const nodes: Node[] = [createNode('1', 'bpmnTask')];
      const edges: Edge[] = [];

      const result = validateBPMN(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.messages).toContain(
        'Flow must have at least one Start Event.',
      );
    });

    it('should report error if Start Event has incoming edges', () => {
      const nodes: Node[] = [
        createNode('start', 'bpmnEvent', 0, 0, { eventType: 'start' }),
        createNode('task', 'bpmnTask', 100, 0),
      ];
      const edges: Edge[] = [createEdge('e1', 'task', 'start')];

      const result = validateBPMN(nodes, edges);

      expect(result.isValid).toBe(false);
      expect(result.messages.some((m) => m.includes('Start Event'))).toBe(true);
      expect(
        result.messages.some((m) => m.includes('should not have incoming')),
      ).toBe(true);
    });

    it('should report error if Start Event has no outgoing edges', () => {
      const nodes: Node[] = [
        createNode('start', 'bpmnEvent', 0, 0, { eventType: 'start' }),
      ];
      const edges: Edge[] = [];

      const result = validateBPMN(nodes, edges);

      expect(
        result.messages.some((m) => m.includes('must have an outgoing')),
      ).toBe(true);
    });

    it('should report error if End Event has outgoing edges', () => {
      const nodes: Node[] = [
        createNode('start', 'bpmnEvent', 0, 0, { eventType: 'start' }),
        createNode('end', 'bpmnEvent', 100, 0, { eventType: 'end' }),
        createNode('task', 'bpmnTask', 200, 0),
      ];
      const edges: Edge[] = [
        createEdge('e1', 'start', 'end'),
        createEdge('e2', 'end', 'task'),
      ];

      const result = validateBPMN(nodes, edges);

      expect(result.messages.some((m) => m.includes('End Event'))).toBe(true);
      expect(
        result.messages.some((m) => m.includes('should not have outgoing')),
      ).toBe(true);
    });

    it('should detect isolated nodes', () => {
      const nodes: Node[] = [
        createNode('start', 'bpmnEvent', 0, 0, { eventType: 'start' }),
        createNode('isolated', 'bpmnTask', 100, 100),
      ];
      const edges: Edge[] = [];

      const result = validateBPMN(nodes, edges);

      expect(result.messages.some((m) => m.includes('isolated'))).toBe(true);
    });

    it('should pass valid simple flow', () => {
      const nodes: Node[] = [
        createNode('start', 'bpmnEvent', 0, 0, { eventType: 'start' }),
        createNode('task', 'bpmnTask', 100, 0),
        createNode('end', 'bpmnEvent', 200, 0, { eventType: 'end' }),
      ];
      const edges: Edge[] = [
        createEdge('e1', 'start', 'task'),
        createEdge('e2', 'task', 'end'),
      ];

      const result = validateBPMN(nodes, edges);

      expect(result.isValid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe('autoFormatGraph', () => {
    it('should snap node positions to slot grid', () => {
      const nodes: Node[] = [
        createNode('1', 'bpmnTask', 55, 33), // 中途半端な位置
      ];

      const result = autoFormatGraph(nodes);

      // Y座標がスロットグリッドにスナップされていること
      const node = result[0];
      const slotY = (node.position.y - OFFSET_Y) / SLOT_HEIGHT;
      expect(Number.isInteger(slotY)).toBe(true);
    });

    it('should not move swimlane nodes during snap', () => {
      const swimlane = createNode('lane', 'bpmnSwimlane', 0, 0);
      swimlane.style = { width: 500, height: 200 };

      const nodes: Node[] = [swimlane, createNode('1', 'bpmnTask', 100, 50)];

      const result = autoFormatGraph(nodes);

      // スイムレーンはフォーマット後も位置が計算される
      const lane = result.find((n) => n.type === 'bpmnSwimlane');
      expect(lane).toBeDefined();
    });

    it('should adjust horizontal swimlane width to cover all nodes', () => {
      const swimlane = createNode('lane', 'bpmnSwimlane', 0, 0, {
        orientation: 'horizontal',
      });
      swimlane.style = { width: 100, height: SLOT_HEIGHT };

      // ノードが遠くに配置されている
      const farNode = createNode('1', 'bpmnTask', SLOT_WIDTH * 5, OFFSET_Y);

      const nodes: Node[] = [swimlane, farNode];

      const result = autoFormatGraph(nodes);

      const lane = result.find((n) => n.type === 'bpmnSwimlane');
      // スイムレーンの幅が最大ノード位置を含むように拡張される
      expect(Number(lane?.style?.width)).toBeGreaterThanOrEqual(SLOT_WIDTH * 5);
    });

    it('should snap vertical swimlane to slot grid', () => {
      const swimlane = createNode('lane', 'bpmnSwimlane', 55, 0, {
        orientation: 'vertical',
      });
      swimlane.style = { width: SLOT_WIDTH, height: 500 };

      const nodes: Node[] = [swimlane];

      const result = autoFormatGraph(nodes);

      const lane = result[0];
      // X座標がスロット幅の倍数にスナップされる
      expect(lane.position.x % SLOT_WIDTH).toBe(0);
    });
  });

  describe('assignLaneToNodes', () => {
    it('should assign parentLaneId to nodes inside swimlane', () => {
      const swimlane = createNode('lane1', 'bpmnSwimlane', 0, 0, {
        label: 'Main Lane',
      });
      swimlane.style = { width: 500, height: 200 };

      // スイムレーンの中にあるノード
      const taskInLane = createNode('task1', 'bpmnTask', 100, 50);
      taskInLane.measured = { width: 140, height: 60 };

      const nodes: Node[] = [swimlane, taskInLane];

      const result = assignLaneToNodes(nodes);

      const task = result.find((n) => n.id === 'task1');
      expect(task?.data.parentLaneId).toBe('lane1');
      expect(task?.data.parentLaneLabel).toBe('Main Lane');
    });

    it('should remove parentLaneId from nodes outside swimlane', () => {
      const swimlane = createNode('lane1', 'bpmnSwimlane', 0, 0);
      swimlane.style = { width: 200, height: 100 };

      // スイムレーンの外にあるノード
      const taskOutside = createNode('task1', 'bpmnTask', 500, 500, {
        parentLaneId: 'old-lane', // 以前の値が残っている
      });
      taskOutside.measured = { width: 140, height: 60 };

      const nodes: Node[] = [swimlane, taskOutside];

      const result = assignLaneToNodes(nodes);

      const task = result.find((n) => n.id === 'task1');
      expect(task?.data.parentLaneId).toBeUndefined();
    });

    it('should not modify swimlane nodes', () => {
      const swimlane = createNode('lane1', 'bpmnSwimlane', 0, 0);
      swimlane.style = { width: 500, height: 200 };

      const nodes: Node[] = [swimlane];

      const result = assignLaneToNodes(nodes);

      const lane = result.find((n) => n.id === 'lane1');
      expect(lane?.data.parentLaneId).toBeUndefined();
    });

    it('should handle nodes without measured dimensions', () => {
      const swimlane = createNode('lane1', 'bpmnSwimlane', 0, 0);
      swimlane.style = { width: 500, height: 200 };

      // measured がないノード（デフォルトサイズを使用）
      const task = createNode('task1', 'bpmnTask', 100, 50);

      const nodes: Node[] = [swimlane, task];

      // エラーなく実行できること
      const result = assignLaneToNodes(nodes);
      expect(result).toHaveLength(2);
    });

    it('should handle multiple overlapping swimlanes (first match wins)', () => {
      const swimlane1 = createNode('lane1', 'bpmnSwimlane', 0, 0, {
        label: 'Lane 1',
      });
      swimlane1.style = { width: 500, height: 200 };

      const swimlane2 = createNode('lane2', 'bpmnSwimlane', 0, 100, {
        label: 'Lane 2',
      });
      swimlane2.style = { width: 500, height: 200 };

      // 両方のレーンに重なるノード（Y=150はlane1とlane2の両方に含まれる）
      const task = createNode('task1', 'bpmnTask', 100, 120);
      task.measured = { width: 140, height: 60 };

      const nodes: Node[] = [swimlane1, swimlane2, task];

      const result = assignLaneToNodes(nodes);

      const taskResult = result.find((n) => n.id === 'task1');
      // 最初にマッチしたスイムレーンに割り当てられる
      expect(taskResult?.data.parentLaneId).toBe('lane1');
    });
  });
});
