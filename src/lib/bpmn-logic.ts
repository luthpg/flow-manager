import type { Edge, Node } from '@xyflow/react';
import {
  NODE_W_SQUARE,
  NODE_W_WIDE,
  OFFSET_Y,
  SLOT_HEIGHT,
  SLOT_WIDTH,
} from '@/lib/constants';

export interface ValidationResult {
  isValid: boolean;
  messages: string[];
}

export const validateBPMN = (
  nodes: Node[],
  edges: Edge[],
): ValidationResult => {
  const messages: string[] = [];
  let hasStart = false;
  // Endは必須ではないが警告対象にする場合がある

  nodes.forEach((node) => {
    const incoming = edges.filter((e) => e.target === node.id);
    const outgoing = edges.filter((e) => e.source === node.id);
    const eventType = node.data.eventType as string | undefined;

    // Start Event
    if (node.type === 'bpmnEvent' && eventType === 'start') {
      hasStart = true;
      if (incoming.length > 0)
        messages.push(
          `Start Event "${node.data.label || 'Start'}" should not have incoming connections.`,
        );
      if (outgoing.length === 0)
        messages.push(
          `Start Event "${node.data.label || 'Start'}" must have an outgoing connection.`,
        );
    }

    // End Event
    if (node.type === 'bpmnEvent' && eventType === 'end') {
      if (outgoing.length > 0)
        messages.push(
          `End Event "${node.data.label || 'End'}" should not have outgoing connections.`,
        );
      if (incoming.length === 0)
        messages.push(
          `End Event "${node.data.label || 'End'}" must have an incoming connection.`,
        );
    }

    // Task / Gateway / Decision Isolation
    if (['bpmnTask', 'bpmnGateway', 'bpmnDecision'].includes(node.type || '')) {
      if (incoming.length === 0 && outgoing.length === 0) {
        messages.push(`Node "${node.data.label || node.id}" is isolated.`);
      }
    }
  });

  if (!hasStart) messages.push('Flow must have at least one Start Event.');

  return {
    isValid: messages.length === 0,
    messages,
  };
};

export const autoFormatGraph = (nodes: Node[]): Node[] => {
  let maxNodeX = 0;

  const formattedNodes = nodes.map((node) => {
    if (node.type === 'bpmnSwimlane') return node;

    const isWide = ['bpmnTask', 'bpmnMessaging', 'bpmnDecision'].includes(
      node.type || '',
    );
    const nodeWidth = isWide ? NODE_W_WIDE : NODE_W_SQUARE;
    const offsetX = (SLOT_WIDTH - nodeWidth) / 2;

    const slotX = Math.round((node.position.x - offsetX) / SLOT_WIDTH);
    const slotY = Math.round((node.position.y - OFFSET_Y) / SLOT_HEIGHT);

    const newX = slotX * SLOT_WIDTH + offsetX;
    const newY = slotY * SLOT_HEIGHT + OFFSET_Y;

    if (newX > maxNodeX) maxNodeX = newX;

    return {
      ...node,
      position: { x: newX, y: newY },
    };
  });

  const targetLaneWidth = Math.max(maxNodeX + SLOT_WIDTH * 2, SLOT_WIDTH * 5);

  return formattedNodes.map((node) => {
    if (node.type !== 'bpmnSwimlane') return node;

    const isHorizontal =
      (node.data.orientation || 'horizontal') === 'horizontal';

    if (isHorizontal) {
      const snapY = Math.round(node.position.y / SLOT_HEIGHT) * SLOT_HEIGHT;
      return {
        ...node,
        position: { x: 0, y: snapY },
        style: {
          ...node.style,
          width: targetLaneWidth,
          height:
            Math.round(
              (Number(node.style?.height) || SLOT_HEIGHT) / SLOT_HEIGHT,
            ) * SLOT_HEIGHT,
        },
      };
    } else {
      const snapX = Math.round(node.position.x / SLOT_WIDTH) * SLOT_WIDTH;
      return {
        ...node,
        position: { x: snapX, y: 0 },
        style: {
          ...node.style,
          width:
            Math.round((Number(node.style?.width) || SLOT_WIDTH) / SLOT_WIDTH) *
            SLOT_WIDTH,
        },
      };
    }
  });
};

// スイムレーンへの所属判定
export const assignLaneToNodes = (nodes: Node[]): Node[] => {
  const lanes = nodes.filter((n) => n.type === 'bpmnSwimlane');

  return nodes.map((node) => {
    if (node.type === 'bpmnSwimlane') return node;

    const nodeW = node.measured?.width ?? (node.style?.width as number) ?? 60;
    const nodeH = node.measured?.height ?? (node.style?.height as number) ?? 60;
    const centerX = node.position.x + nodeW / 2;
    const centerY = node.position.y + nodeH / 2;

    const targetLane = lanes.find((lane) => {
      const laneX = lane.position.x;
      const laneY = lane.position.y;
      const laneW = Number(lane.style?.width) || 0;
      const laneH = Number(lane.style?.height) || 0;

      return (
        centerX >= laneX &&
        centerX <= laneX + laneW &&
        centerY >= laneY &&
        centerY <= laneY + laneH
      );
    });

    if (targetLane) {
      return {
        ...node,
        data: {
          ...node.data,
          parentLaneId: targetLane.id,
          parentLaneLabel: targetLane.data.label,
        },
      };
    } else {
      const newData = { ...node.data };
      delete newData.parentLaneId;
      delete newData.parentLaneLabel;
      return { ...node, data: newData };
    }
  });
};
