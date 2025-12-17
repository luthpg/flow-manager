import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { validateFlow } from '@/lib/bpmn-validator';

describe('bpmn-validator', () => {
  it('should report error if no Start Event exists', () => {
    const nodes: Node[] = [
      { id: '1', type: 'bpmnTask', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [];

    const result = validateFlow(nodes, edges);

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'no-start',
          severity: 'error',
        }),
      ]),
    );
  });

  it('should report error if Start Event has incoming edges', () => {
    const nodes: Node[] = [
      {
        id: 'start',
        type: 'bpmnEvent',
        position: { x: 0, y: 0 },
        data: { eventType: 'start' },
      },
      { id: 'task', type: 'bpmnTask', position: { x: 100, y: 0 }, data: {} },
    ];
    // Task -> Start (Invalid)
    const edges: Edge[] = [{ id: 'e1', source: 'task', target: 'start' }];

    const result = validateFlow(nodes, edges);

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'start-in-start',
          severity: 'error',
        }),
      ]),
    );
  });

  it('should report warning for isolated nodes', () => {
    const nodes: Node[] = [
      {
        id: 'start',
        type: 'bpmnEvent',
        position: { x: 0, y: 0 },
        data: { eventType: 'start' },
      },
      {
        id: 'isolated',
        type: 'bpmnTask',
        position: { x: 0, y: 100 },
        data: {},
      },
    ];
    // Start -> ??? (Missing edge for start is also an error, but let's focus on isolation)
    const edges: Edge[] = [];

    const result = validateFlow(nodes, edges);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'isolated-isolated',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('should pass valid simple flow', () => {
    const nodes: Node[] = [
      {
        id: 'start',
        type: 'bpmnEvent',
        position: { x: 0, y: 0 },
        data: { eventType: 'start' },
      },
      { id: 'task', type: 'bpmnTask', position: { x: 100, y: 0 }, data: {} },
      {
        id: 'end',
        type: 'bpmnEvent',
        position: { x: 200, y: 0 },
        data: { eventType: 'end' },
      },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'task' },
      { id: 'e2', source: 'task', target: 'end' },
    ];

    const result = validateFlow(nodes, edges);

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect unreachable nodes', () => {
    const nodes: Node[] = [
      {
        id: 'start',
        type: 'bpmnEvent',
        position: { x: 0, y: 0 },
        data: { eventType: 'start' },
      },
      { id: 'task1', type: 'bpmnTask', position: { x: 100, y: 0 }, data: {} },
      {
        id: 'unreachable',
        type: 'bpmnTask',
        position: { x: 100, y: 100 },
        data: {},
      },
      {
        id: 'end',
        type: 'bpmnEvent',
        position: { x: 200, y: 0 },
        data: { eventType: 'end' },
      },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'start', target: 'task1' },
      { id: 'e2', source: 'task1', target: 'end' },
      // unreachable node has connection to end, but no connection from start
      { id: 'e3', source: 'unreachable', target: 'end' },
    ];

    const result = validateFlow(nodes, edges);

    // Unreachable from Start
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'unreachable-unreachable',
          severity: 'warning',
        }),
      ]),
    );
  });
});
