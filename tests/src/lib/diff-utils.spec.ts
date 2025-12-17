import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { computeDiff, resolveDiff } from '@/lib/diff-utils';

// モックデータ生成ヘルパー
const createNode = (id: string, label: string, x = 0, y = 0): Node => ({
  id,
  type: 'bpmnTask',
  position: { x, y },
  data: { label },
});

const createEdge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
});

describe('diff-utils', () => {
  describe('computeDiff', () => {
    it('should detect added nodes', () => {
      const baseNodes: Node[] = [];
      const currentNodes = [createNode('1', 'New Node')];

      const result = computeDiff(baseNodes, [], currentNodes, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data._diff).toBe('added');
    });

    it('should detect deleted nodes', () => {
      const baseNodes = [createNode('1', 'Old Node')];
      const currentNodes: Node[] = [];

      const result = computeDiff(baseNodes, [], currentNodes, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data._diff).toBe('deleted');
    });

    it('should detect modified nodes (label change)', () => {
      const baseNodes = [createNode('1', 'Old Label')];
      const currentNodes = [createNode('1', 'New Label')];

      const result = computeDiff(baseNodes, [], currentNodes, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data._diff).toBe('modified');
      expect(result.changes['1']).toBeDefined();
      expect(result.changes['1'].label).toEqual({
        from: 'Old Label',
        to: 'New Label',
      });
    });

    it('should ignore position changes', () => {
      const baseNodes = [createNode('1', 'Label', 0, 0)];
      const currentNodes = [createNode('1', 'Label', 100, 100)];

      const result = computeDiff(baseNodes, [], currentNodes, []);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data._diff).toBe('unchanged');
    });

    it('should detect added edges', () => {
      const baseEdges: Edge[] = [];
      const currentEdges = [createEdge('e1', '1', '2')];

      const result = computeDiff([], baseEdges, [], currentEdges);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].data?._diff).toBe('added');
    });
  });

  describe('resolveDiff', () => {
    it('should accept added nodes by default', () => {
      const diffNodes = [
        { ...createNode('1', 'New'), data: { label: 'New', _diff: 'added' } },
      ];

      const result = resolveDiff(diffNodes, [], [], [], {});

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data._diff).toBeUndefined(); // クリーンアップされていること
    });

    it('should revert added nodes if rejected', () => {
      const diffNodes = [
        { ...createNode('1', 'New'), data: { label: 'New', _diff: 'added' } },
      ];

      const result = resolveDiff(diffNodes, [], [], [], { '1': 'rejected' });

      expect(result.nodes).toHaveLength(0); // 追加が取り消される＝存在しない
    });

    it('should revert deleted nodes if rejected', () => {
      const originalNode = createNode('1', 'Original');
      const diffNodes = [
        { ...originalNode, data: { ...originalNode.data, _diff: 'deleted' } },
      ];

      // 削除を却下＝元に戻す（ノードが復活する）
      const result = resolveDiff(diffNodes, [], [originalNode], [], {
        '1': 'rejected',
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('1');
    });

    it('should revert modified nodes if rejected', () => {
      const originalNode = createNode('1', 'Original Label');
      const modifiedNode = {
        ...createNode('1', 'New Label'),
        data: { label: 'New Label', _diff: 'modified' },
      };

      // 変更を却下＝元のラベルに戻る
      const result = resolveDiff([modifiedNode], [], [originalNode], [], {
        '1': 'rejected',
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].data.label).toBe('Original Label');
    });
  });
});
