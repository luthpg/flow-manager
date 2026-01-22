import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import {
  NODE_H,
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

// --- Dagre Layout Helper ---
const layoutGraphWithDagre = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({
    rankdir: 'LR',
    align: 'UL',
    nodesep: SLOT_HEIGHT / 2, // Vertical separation
    ranksep: SLOT_WIDTH / 2, // Horizontal separation
    marginx: 50,
    marginy: 50,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Helper map to track which nodes are inside which lanes
  const laneMap = new Map<string, string>(); // nodeId -> laneId

  // Add Nodes (including Swimlanes as clusters)
  for (const node of nodes) {
    if (node.type === 'bpmnSwimlane') {
      g.setNode(node.id, {
        label: node.data.label as string,
        clusterLabelPos: 'top',
      });
    } else if (node.type === 'bpmnArrow') {
    } else {
      // Normal Nodes
      // Determine dimensions (Dagre needs W/H)
      const isWide = ['bpmnTask', 'bpmnMessaging', 'bpmnDecision'].includes(
        node.type || '',
      );
      const width = isWide ? NODE_W_WIDE : NODE_W_SQUARE;
      const height = NODE_H;

      g.setNode(node.id, {
        width,
        height,
        label: node.data.label as string | undefined,
      });

      // If node has a parent lane assigned (pre-calculated), ensure Dagre knows
      const parentLaneId = node.data.parentLaneId as string | undefined;
      if (parentLaneId) {
        g.setParent(node.id, parentLaneId);
        laneMap.set(node.id, parentLaneId);
      }
    }
  }

  // Add Edges
  for (const edge of edges) {
    // Only add edges between nodes that exist in the graph
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  // Compute Layout
  dagre.layout(g);

  // Apply positions back to nodes
  return nodes.map((node) => {
    if (g.hasNode(node.id)) {
      const { x, y, width, height } = g.node(node.id);

      if (node.type === 'bpmnSwimlane') {
        // Dagre calculates bounding box for cluster (center x,y + width/height)
        // We need to convert to Top-Left for React Flow
        return {
          ...node,
          position: {
            x: x - width / 2,
            y: y - height / 2,
          },
          style: {
            ...node.style,
            width: width,
            height: height,
          },
        };
      } else {
        // Normal Node
        return {
          ...node,
          position: {
            x: x - width / 2,
            y: y - height / 2,
          },
        };
      }
    }
    return node;
  });
};

// --- 2. Auto Formatting Logic ---
export const autoFormatGraph = (nodes: Node[], edges: Edge[]): Node[] => {
  // 0. Pre-process: Detect logical lane assignment based on current position
  // This ensures that if a node is visually inside a lane, we lock it to that lane for Dagre layout.
  const nodesWithLanes = assignLaneToNodes(nodes);

  // 1. Run Dagre Layout (Compound)
  const layoutedNodes = layoutGraphWithDagre(nodesWithLanes, edges);

  // 2. Apply Strict Grid Snap (180x100 Slots)
  // Determine max extent for Swimlanes
  let maxNodeX = 0;

  const formattedNodes = layoutedNodes.map((node) => {
    // Ignore resizing/snapping Swimlanes here, we trust Dagre's relative layout BUT we might want to snap the header?
    // Actually, Dagre gives the tight bounding box. We should snap the *Top-Left* of the Swimlane to the grid,
    // and expand the W/H to nearest slot multiple + padding.

    // Snapping Logic
    if (node.type === 'bpmnSwimlane') {
      const slotX = Math.round(node.position.x / SLOT_WIDTH);
      const slotY = Math.round(node.position.y / SLOT_HEIGHT);

      const newX = slotX * SLOT_WIDTH;
      const newY = slotY * SLOT_HEIGHT;

      // Snap Dimensions (Rounding UP to nearest slot to ensure coverage)
      const rawW = Number(node.style?.width) || 0;
      const rawH = Number(node.style?.height) || 0;

      const snappedW = Math.ceil(rawW / SLOT_WIDTH) * SLOT_WIDTH; // Or round? Ceil ensures we don't clip content
      const snappedH = Math.ceil(rawH / SLOT_HEIGHT) * SLOT_HEIGHT;

      return {
        ...node,
        position: { x: newX, y: newY },
        style: { ...node.style, width: snappedW, height: snappedH },
      };
    }

    // Normal Nodes
    if (node.type === 'bpmnArrow') return node;

    // Use existing constants
    const isWide = ['bpmnTask', 'bpmnMessaging', 'bpmnDecision'].includes(
      node.type || '',
    );
    const nodeWidth = isWide ? NODE_W_WIDE : NODE_W_SQUARE;

    // Note: layoutedNodes has positions from Dagre (Cluster-relative? No, Dagre usually gives absolute coords in compound too).
    // Let's assume absolute.

    const slotX = Math.round(node.position.x / SLOT_WIDTH);
    const slotY = Math.round(node.position.y / SLOT_HEIGHT);

    // Calculate Centered Position within the Slot
    const centeringOffsetX = (SLOT_WIDTH - nodeWidth) / 2;
    const newX = slotX * SLOT_WIDTH + centeringOffsetX;
    const newY = slotY * SLOT_HEIGHT + OFFSET_Y;

    if (newX > maxNodeX) maxNodeX = newX;

    return {
      ...node,
      position: { x: newX, y: newY },
    };
  });

  // 3. Post-Process Swimlanes (Uniform Width, cleanup)
  // If we want all horizontal lanes to share the same width (Max X), we apply it here.
  // Dagre might yield jagged widths for clusters.

  const targetLaneWidth = Math.max(maxNodeX + SLOT_WIDTH * 2, SLOT_WIDTH * 5);

  return formattedNodes.map((node) => {
    if (node.type !== 'bpmnSwimlane') return node;

    const isHorizontal =
      (node.data.orientation || 'horizontal') === 'horizontal';

    if (isHorizontal) {
      // Force X=0 for aesthetics? Or trust Dagre?
      // If Dagre put a lane at X=500 because it only has late nodes, that's valid but maybe ugly for a "Pool".
      // Typically Swimlanes start at X=0.
      // Let's force X=0 and extend Width.

      return {
        ...node,
        position: { ...node.position, x: 0 },
        style: {
          ...node.style,
          width: targetLaneWidth,
        },
      };
    }

    return node;
  });
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
