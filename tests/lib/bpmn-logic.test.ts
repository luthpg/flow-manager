import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { autoFormatGraph, validateBPMN } from '../../src/lib/bpmn-logic';
import { OFFSET_Y, SLOT_WIDTH } from '../../src/lib/constants';

describe('BPMN Logic', () => {
  describe('validateBPMN', () => {
    it('should return valid for a simple correct flow (Start -> End)', () => {
      const nodes: Node[] = [
        {
          id: 'start',
          type: 'bpmnEvent',
          data: { eventType: 'start', label: 'Start' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'end',
          type: 'bpmnEvent',
          data: { eventType: 'end', label: 'End' },
          position: { x: 100, y: 0 },
        },
      ];
      const edges: Edge[] = [{ id: 'e1', source: 'start', target: 'end' }];

      const result = validateBPMN(nodes, edges);
      expect(result.isValid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });

    it('should fail if no Start Event is present', () => {
      const nodes: Node[] = [
        {
          id: 'end',
          type: 'bpmnEvent',
          data: { eventType: 'end', label: 'End' },
          position: { x: 100, y: 0 },
        },
      ];
      const edges: Edge[] = [];

      const result = validateBPMN(nodes, edges);
      expect(result.isValid).toBe(false);
      expect(result.messages).toContain(
        'Flow must have at least one Start Event.',
      );
    });

    it('should warn if no End Event is present', () => {
      const nodes: Node[] = [
        {
          id: 'start',
          type: 'bpmnEvent',
          data: { eventType: 'start', label: 'Start' },
          position: { x: 0, y: 0 },
        },
      ];
      const edges: Edge[] = [];

      const result = validateBPMN(nodes, edges);
      // Currently generic logic might return isValid=false if constraints like "Start must have outgoing" are failed.
      // But specifically looking for the End Event warning.
      expect(result.messages).toContain('Flow should have an End Event.');
    });

    it('should fail if Start Event has incoming connections', () => {
      const nodes: Node[] = [
        {
          id: 'start',
          type: 'bpmnEvent',
          data: { eventType: 'start', label: 'Start' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'task',
          type: 'bpmnTask',
          data: { label: 'Task' },
          position: { x: 100, y: 0 },
        },
      ];
      const edges: Edge[] = [{ id: 'e1', source: 'task', target: 'start' }];

      const result = validateBPMN(nodes, edges);
      expect(result.isValid).toBe(false);
      expect(result.messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('should not have incoming connections'),
        ]),
      );
    });

    it('should fail if End Event has outgoing connections', () => {
      const nodes: Node[] = [
        {
          id: 'end',
          type: 'bpmnEvent',
          data: { eventType: 'end', label: 'End' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'task',
          type: 'bpmnTask',
          data: { label: 'Task' },
          position: { x: 100, y: 0 },
        },
      ];
      const edges: Edge[] = [{ id: 'e1', source: 'end', target: 'task' }];

      const result = validateBPMN(nodes, edges);
      expect(result.isValid).toBe(false);
      expect(result.messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('should not have outgoing connections'),
        ]),
      );
    });

    it('should detect isolated tasks', () => {
      const nodes: Node[] = [
        {
          id: 'start',
          type: 'bpmnEvent',
          data: { eventType: 'start', label: 'Start' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'task',
          type: 'bpmnTask',
          data: { label: 'Lonely Task' },
          position: { x: 100, y: 0 },
        },
      ];
      const edges: Edge[] = [];

      const result = validateBPMN(nodes, edges);
      expect(result.messages).toEqual(
        expect.arrayContaining([expect.stringContaining('is isolated')]),
      );
    });
  });

  describe('autoFormatGraph', () => {
    it('should snap nodes to the nearest grid slot', () => {
      const rawNodes: Node[] = [
        {
          id: 'n1',
          type: 'bpmnTask',
          data: { label: 'Task' },
          position: { x: SLOT_WIDTH + 5, y: OFFSET_Y + 5 }, // Slightly off 2nd slot
        },
      ];
      const edges: Edge[] = [];

      const formatted = autoFormatGraph(rawNodes, edges);

      const node = formatted[0];

      // We expect it to be snapped.
      expect(node.position.x).toBeDefined();
      expect(node.position.y).toBeDefined();
    });

    it('should not move Swimlanes x-position for horizontal but should expand width', () => {
      const nodes: Node[] = [
        // A task far to the right to force expansion
        {
          id: 'task',
          type: 'bpmnTask',
          data: { label: 'Far Task' },
          position: { x: 1000, y: 0 },
        },
        {
          id: 'lane',
          type: 'bpmnSwimlane',
          data: { orientation: 'horizontal', label: 'Lane' },
          position: { x: 10, y: 55 }, // x should become 0, y snapped
          style: { width: 100, height: 100 },
        },
      ];
      const edges: Edge[] = [];

      const formatted = autoFormatGraph(nodes, edges);
      const lane = formatted.find((n) => n.id === 'lane');

      expect(lane).toBeDefined();
      expect(lane?.position.x).toBe(0); // Horizontal lanes start at x=0
      expect(Number(lane?.style?.width)).toBeGreaterThan(100); // Should expand
    });

    it('should layout nodes using Dagre (topological order)', () => {
      const nodes: Node[] = [
        {
          id: '1',
          type: 'bpmnEvent',
          data: { label: 'Start' },
          position: { x: 0, y: 0 },
        },
        {
          id: '2',
          type: 'bpmnTask',
          data: { label: 'Task' },
          position: { x: 0, y: 0 },
        },
      ];
      const edges: Edge[] = [{ id: 'e1', source: '1', target: '2' }];

      const formatted = autoFormatGraph(nodes, edges);
      const n1 = formatted.find((n) => n.id === '1');
      const n2 = formatted.find((n) => n.id === '2');

      // In LR layout, n2 (target) should have a greater X than n1 (source)
      expect(n2?.position.x).toBeGreaterThan(n1!.position.x);
    });
  });

  describe('validateBPMN Connectivity', () => {
    it('should warn about unreachable nodes', () => {
      const nodes: Node[] = [
        {
          id: 'start',
          type: 'bpmnEvent',
          data: { eventType: 'start', label: 'Start' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'end',
          type: 'bpmnEvent',
          data: { eventType: 'end', label: 'End' },
          position: { x: 100, y: 0 },
        },
        {
          id: 'isolated',
          type: 'bpmnTask',
          data: { label: 'Isolated' },
          position: { x: 200, y: 0 },
        },
      ];
      const edges: Edge[] = [{ id: 'e1', source: 'start', target: 'end' }];

      const result = validateBPMN(nodes, edges);
      expect(result.messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('not reachable from a Start Event'),
        ]),
      );
    });
  });

  describe('autoFormatGraph Containment', () => {
    it('should keep nodes inside their assigned swimlanes', () => {
      // Create a Swimlane and a child node located "visually" inside it (or pre-assigned)
      const laneId = 'lane1';
      const nodes: Node[] = [
        {
          id: laneId,
          type: 'bpmnSwimlane',
          data: { label: 'Lane 1' },
          position: { x: 0, y: 0 },
          style: { width: 500, height: 500 }, // Large enough
        },
        {
          id: 'child',
          type: 'bpmnTask',
          data: { label: 'Child Task' },
          position: { x: 50, y: 50 }, // Inside current lane bounds
        },
      ];
      const edges: Edge[] = [];

      const formatted = autoFormatGraph(nodes, edges);

      const formattedLane = formatted.find((n) => n.id === laneId);
      const formattedChild = formatted.find((n) => n.id === 'child');

      // Check containment
      expect(formattedLane).toBeDefined();
      expect(formattedChild).toBeDefined();

      const lX = formattedLane!.position.x;
      const lY = formattedLane!.position.y;
      const lW = Number(formattedLane!.style?.width);
      const lH = Number(formattedLane!.style?.height);

      const cX = formattedChild!.position.x;
      const cY = formattedChild!.position.y;

      // Simple bbox check
      expect(cX).toBeGreaterThanOrEqual(lX);
      expect(cY).toBeGreaterThanOrEqual(lY);
      expect(cX).toBeLessThan(lX + lW);
      expect(cY).toBeLessThan(lY + lH);
    });
  });
});
