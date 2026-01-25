import type { Edge, Node } from '@xyflow/react';
import {
  NODE_W_SQUARE,
  NODE_W_WIDE,
  OFFSET_Y,
  SLOT_HEIGHT,
  SLOT_WIDTH,
} from '@/lib/constants';

// --- 1. BPMN Validation Logic ---
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
  let hasEnd = false;

  // Connectivity Check Helpers
  const visited = new Set<string>();
  const adjacencyList = new Map<string, string[]>();

  // Use only connecting edges (ignore Message Flows for structural integrity if strict, but Loose is okay)
  edges.forEach((edge) => {
    if (!adjacencyList.has(edge.source)) adjacencyList.set(edge.source, []);
    adjacencyList.get(edge.source)?.push(edge.target);
  });

  nodes.forEach((node) => {
    // Basic connectivity maps check (not strictly used yet, just building graph)

    const incoming = edges.filter((e) => e.target === node.id);
    const outgoing = edges.filter((e) => e.source === node.id);
    const subType = node.data.eventType as string;

    // Start Event Check
    if (node.type === 'bpmnEvent' && subType === 'start') {
      hasStart = true;
      if (incoming.length > 0)
        messages.push(
          `Start Event "${node.data.label}" should not have incoming connections.`,
        );
      if (outgoing.length === 0)
        messages.push(
          `Start Event "${node.data.label}" must have an outgoing connection.`,
        );
    }

    // End Event Check
    if (node.type === 'bpmnEvent' && subType === 'end') {
      hasEnd = true;
      if (outgoing.length > 0)
        messages.push(
          `End Event "${node.data.label}" should not have outgoing connections.`,
        );
      if (incoming.length === 0)
        messages.push(
          `End Event "${node.data.label}" must have an incoming connection.`,
        );
    }

    // Task / Gateway Check (Isolation check)
    if (['bpmnTask', 'bpmnGateway', 'bpmnDecision'].includes(node.type || '')) {
      if (incoming.length === 0 && outgoing.length === 0) {
        messages.push(
          `Node "${node.data.label}" is isolated (no connections).`,
        );
      }
    }
  });

  if (!hasStart) messages.push('Flow must have at least one Start Event.');
  if (!hasEnd) messages.push('Flow should have an End Event.');

  // Connectivity Warning: Check if all non-isolated nodes are reachable from SOME start event?
  // Simply warn if there are disjoint subgraphs is a bit complex, but we can check if there are nodes not reachable from ANY start node.
  if (hasStart) {
    const startNodeIds = nodes
      .filter((n) => n.type === 'bpmnEvent' && n.data.eventType === 'start')
      .map((n) => n.id);

    // BFS traversal from valid Start nodes
    const queue = [...startNodeIds];
    for (const id of startNodeIds) {
      visited.add(id);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = adjacencyList.get(current || '') || [];
      neighbors.forEach((next) => {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      });
    }

    // Check for unreachable nodes (excluding annotations/artifacts if desired, but BPMN nodes mostly should be reachable)
    const unreachableNodes = nodes.filter(
      (n) =>
        !visited.has(n.id) &&
        !['bpmnAnnotation', 'bpmnSwimlane', 'bpmnArrow'].includes(n.type || ''),
    );

    if (unreachableNodes.length > 0) {
      messages.push(
        `Warning: ${unreachableNodes.length} node(s) are not reachable from a Start Event.`,
      );
    }
  }

  return {
    isValid: messages.length === 0,
    messages,
  };
};

// --- 2. Auto Formatting Logic (Custom Implementation) ---

export const autoFormatGraph = (nodes: Node[], edges: Edge[]): Node[] => {
  // 1. Assign Lanes based on current geometry
  const nodesWithLanes = assignLaneToNodes(nodes);

  // 2. Group Nodes by Lane
  const laneGroups = new Map<string, Node[]>();
  const unassignedNodes: Node[] = [];
  const swimlanes: Node[] = [];
  const artifacts: Node[] = []; // Arrows, etc.

  nodesWithLanes.forEach((node) => {
    if (node.type === 'bpmnSwimlane') {
      swimlanes.push(node);
      if (!laneGroups.has(node.id)) {
        laneGroups.set(node.id, []);
      }
    } else if (node.type === 'bpmnArrow') {
      artifacts.push(node);
    } else {
      const laneId = node.data.parentLaneId as string;
      if (laneId && laneGroups.has(laneId)) {
        laneGroups.get(laneId)?.push(node);
      } else {
        unassignedNodes.push(node);
      }
    }
  });

  // 3. Layout Each Group
  const resultNodes: Node[] = [...artifacts]; // Start with artifacts (or add later)

  // Sort Swimlanes by Y to preserve vertical order
  swimlanes.sort((a, b) => a.position.y - b.position.y);

  let currentOffsetY = 0;

  // Process Swimlanes
  swimlanes.forEach((lane) => {
    const groupNodes = laneGroups.get(lane.id) || [];

    // Layout the group (Local coordinates)
    const {
      width: contentW,
      height: contentH,
      nodes: laidOutNodes,
    } = layoutGroup(groupNodes, edges);

    // Determine Lane Dimensions (Grid Snapped)
    // Minimum 2 slots wide, 1 slot high
    const minW = SLOT_WIDTH * 2;
    const minH = SLOT_HEIGHT;

    // Padding
    const paddingRight = SLOT_WIDTH * 0.5;
    const paddingBottom = SLOT_HEIGHT * 0.5;

    // Lane Width should cover content
    const laneW = Math.max(minW, contentW + paddingRight);
    // Lane Height
    const laneH = Math.max(minH, contentH + paddingBottom);

    // Snap Lane Dimensions
    const snappedLaneW = Math.ceil(laneW / SLOT_WIDTH) * SLOT_WIDTH;
    const snappedLaneH = Math.ceil(laneH / SLOT_HEIGHT) * SLOT_HEIGHT;

    // Update Lane Position & Size
    const updatedLane = {
      ...lane,
      position: { x: 0, y: currentOffsetY },
      style: { ...lane.style, width: snappedLaneW, height: snappedLaneH },
    };
    resultNodes.push(updatedLane);

    // Update Children Positions (Global coordinates)
    laidOutNodes.forEach((n) => {
      resultNodes.push({
        ...n,
        position: {
          x: n.position.x, // Lane is at X=0
          y: n.position.y + currentOffsetY,
        },
      });
    });

    currentOffsetY += snappedLaneH; // Stack next lane immediately below
  });

  // Process Unassigned Nodes
  // Place them below all lanes?
  if (unassignedNodes.length > 0) {
    if (swimlanes.length > 0) currentOffsetY += SLOT_HEIGHT; // Gap
    const { nodes: laidOutNodes } = layoutGroup(unassignedNodes, edges);
    laidOutNodes.forEach((n) => {
      resultNodes.push({
        ...n,
        position: {
          x: n.position.x,
          y: n.position.y + currentOffsetY,
        },
      });
    });
  }

  return resultNodes;
};

// --- Layout Helper Core ---
const layoutGroup = (
  nodes: Node[],
  allEdges: Edge[],
): { width: number; height: number; nodes: Node[] } => {
  if (nodes.length === 0) return { width: 0, height: 0, nodes: [] };

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  // Filter edges internal to this group
  const edges = allEdges.filter(
    (e) => nodeMap.has(e.source) && nodeMap.has(e.target),
  );

  // 1. Assign Levels (X-axis) using Longest Path in DAG
  const levels = new Map<string, number>();

  nodes.forEach((n) => {
    levels.set(n.id, 0);
  });

  // Relaxation for Longest Path in DAG
  // Since N is small (< 100 usually), we can just loop N times.
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    edges.forEach((e) => {
      const srcLvl = levels.get(e.source) || 0;
      const tgtLvl = levels.get(e.target) || 0;
      if (tgtLvl < srcLvl + 1) {
        levels.set(e.target, srcLvl + 1);
        changed = true;
      }
    });
    if (!changed) break;
  }

  // 2. Assign Grid Positions (Y-axis packing)
  const maxLevel = Math.max(...Array.from(levels.values()));
  const gridPositions = new Map<string, { x: number; y: number }>();
  const occupied = new Set<string>(); // "x,y"

  for (let x = 0; x <= maxLevel; x++) {
    // Get nodes at this level
    const levelNodes = nodes.filter((n) => (levels.get(n.id) || 0) === x);

    // Sort by "Ideal Y" (average of parents)
    const nodesWithIdealY = levelNodes.map((n) => {
      const parents = edges.filter((e) => e.target === n.id);
      const parentPositions = parents
        .map((e) => gridPositions.get(e.source))
        .filter((p) => p !== undefined) as { x: number; y: number }[];

      let idealY = 0;
      if (parentPositions.length > 0) {
        const sumY = parentPositions.reduce((sum, p) => sum + p.y, 0);
        idealY = Math.round(sumY / parentPositions.length);
      }
      return { node: n, idealY };
    });

    // Secondary sort: preserve some stability or sort by ID
    nodesWithIdealY.sort((a, b) => {
      if (a.idealY !== b.idealY) return a.idealY - b.idealY;
      return a.node.id.localeCompare(b.node.id);
    });

    // Place
    nodesWithIdealY.forEach(({ node, idealY }) => {
      let offset = 0;
      let finalY = -1;

      // Search spiral: 0, +1, -1, +2, -2...
      while (true) {
        const candidates =
          offset === 0 ? [idealY] : [idealY + offset, idealY - offset];
        for (const y of candidates) {
          if (y < 0) continue; // No negative rows
          const key = `${x},${y}`;
          if (!occupied.has(key)) {
            occupied.add(key);
            finalY = y;
            break;
          }
        }
        if (finalY !== -1) break;
        offset++;
      }
      gridPositions.set(node.id, { x, y: finalY });
    });
  }

  // 3. Convert to Coordinates
  let maxX = 0;
  let maxY = 0;

  const finalNodes = nodes.map((n) => {
    const pos = gridPositions.get(n.id) || { x: 0, y: 0 };
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);

    const isWide = ['bpmnTask', 'bpmnMessaging', 'bpmnDecision'].includes(
      n.type || '',
    );
    const nodeWidth = isWide ? NODE_W_WIDE : NODE_W_SQUARE;

    // Center X in slot
    const centeringOffsetX = (SLOT_WIDTH - nodeWidth) / 2;

    return {
      ...n,
      position: {
        x: pos.x * SLOT_WIDTH + centeringOffsetX,
        y: pos.y * SLOT_HEIGHT + OFFSET_Y,
      },
    };
  });

  return {
    width: (maxX + 1) * SLOT_WIDTH,
    height: (maxY + 1) * SLOT_HEIGHT,
    nodes: finalNodes,
  };
};

// --- 3. Swimlane Hit Testing Logic ---

/**
 * 全ノードを走査し、各ノードがどのスイムレーン上にあるかを判定して data.parentLaneId を付与する
 */
export const assignLaneToNodes = (nodes: Node[]): Node[] => {
  // スイムレーンのみを抽出
  const lanes = nodes.filter((n) => n.type === 'bpmnSwimlane');

  // スイムレーン以外のノードを走査
  return nodes.map((node) => {
    if (node.type === 'bpmnSwimlane') return node;

    // ノードの中心座標を計算 (幅/高さが未定の場合はデフォルト60pxと仮定)
    const nodeW = node.measured?.width ?? (node.style?.width as number) ?? 60;
    const nodeH = node.measured?.height ?? (node.style?.height as number) ?? 60;
    const centerX = node.position.x + nodeW / 2;
    const centerY = node.position.y + nodeH / 2;

    // 所属するレーンを探す (重なり順を考慮し、後から描画されたもの=手前のレーンを優先する場合は reverse() するなど調整)
    const targetLane = lanes.find((lane) => {
      const laneX = lane.position.x;
      const laneY = lane.position.y;
      const laneW = Number(lane.style?.width) || 0;
      const laneH = Number(lane.style?.height) || 0;

      // 矩形包含判定
      return (
        centerX >= laneX &&
        centerX <= laneX + laneW &&
        centerY >= laneY &&
        centerY <= laneY + laneH
      );
    });

    // メタデータの更新 (変更がない場合は元のオブジェクトを返すのが理想だが、ここでは簡潔に)
    if (targetLane) {
      return {
        ...node,
        data: {
          ...node.data,
          parentLaneId: targetLane.id, // レーンのID
          parentLaneLabel: targetLane.data.label, // (任意) レーン名も便利なので入れておく
        },
      };
    } else {
      // レーン外にある場合は情報を削除
      const newData = { ...node.data };
      delete newData.parentLaneId;
      delete newData.parentLaneLabel;
      return { ...node, data: newData };
    }
  });
};
