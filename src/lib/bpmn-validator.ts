import type { Edge, Node } from '@xyflow/react';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  nodeId?: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

/**
 * 到達可能性チェック (Reachability Check)
 * Startイベントから到達できないノード、Endイベントに到達できないノードを検出
 */
const checkReachability = (nodes: Node[], edges: Edge[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const adjacencyList = new Map<string, string[]>();
  const reverseAdjacencyList = new Map<string, string[]>();

  // グラフ構築
  nodes.forEach((n) => {
    adjacencyList.set(n.id, []);
    reverseAdjacencyList.set(n.id, []);
  });
  edges.forEach((e) => {
    adjacencyList.get(e.source)?.push(e.target);
    reverseAdjacencyList.get(e.target)?.push(e.source);
  });

  // StartイベントとEndイベントを特定
  const startNodes = nodes.filter(
    (n) => n.type === 'bpmnEvent' && n.data.eventType === 'start',
  );
  const endNodes = nodes.filter(
    (n) => n.type === 'bpmnEvent' && n.data.eventType === 'end',
  );

  // 1. Forward Reachability (Start -> All)
  const visitedFromStart = new Set<string>();
  const queueForward = [...startNodes.map((n) => n.id)];

  while (queueForward.length > 0) {
    const current = queueForward.shift();
    if (!current || visitedFromStart.has(current)) continue;
    visitedFromStart.add(current);

    const neighbors = adjacencyList.get(current) || [];
    for (const next of neighbors) {
      queueForward.push(next);
    }
  }

  // 到達不能ノードの検出 (Startがない場合はスキップ)
  if (startNodes.length > 0) {
    nodes.forEach((n) => {
      if (n.type === 'bpmnSwimlane' || n.type === 'bpmnAnnotation') return; // 除外
      if (!visitedFromStart.has(n.id)) {
        issues.push({
          id: `unreachable-${n.id}`,
          nodeId: n.id,
          severity: 'warning',
          message: 'This node is unreachable from any Start Event.',
        });
      }
    });
  }

  // 2. Backward Reachability (All -> End)
  // Endイベントから逆方向に辿れるかチェック
  if (endNodes.length > 0) {
    const canReachEnd = new Set<string>();
    const queueBackward = [...endNodes.map((n) => n.id)];

    while (queueBackward.length > 0) {
      const current = queueBackward.shift();
      if (!current || canReachEnd.has(current)) continue;
      canReachEnd.add(current);

      const parents = reverseAdjacencyList.get(current) || [];
      for (const prev of parents) {
        queueBackward.push(prev);
      }
    }

    nodes.forEach((n) => {
      if (n.type === 'bpmnSwimlane' || n.type === 'bpmnAnnotation') return;
      if (!canReachEnd.has(n.id)) {
        // Endイベント自体は到達可能とみなす(自分自身なので)
        // ここでは「Endに行けないフローの途中」を検知したい
        issues.push({
          id: `deadend-${n.id}`,
          nodeId: n.id,
          severity: 'warning',
          message: 'This path does not reach any End Event.',
        });
      }
    });
  }

  return issues;
};

/**
 * BPMNルールに基づく静的解析
 */
export const validateFlow = (
  nodes: Node[],
  edges: Edge[],
): ValidationResult => {
  const issues: ValidationIssue[] = [];

  // 基本チェック
  nodes.forEach((node) => {
    const incoming = edges.filter((e) => e.target === node.id);
    const outgoing = edges.filter((e) => e.source === node.id);
    const eventType = node.data.eventType as string | undefined;
    const label = (node.data.label as string) || 'Unnamed Node';

    // 1. Start Event Rules
    if (node.type === 'bpmnEvent' && eventType === 'start') {
      if (incoming.length > 0) {
        issues.push({
          id: `start-in-${node.id}`,
          nodeId: node.id,
          severity: 'error',
          message: `Start Event "${label}" must not have incoming flows.`,
        });
      }
      if (outgoing.length === 0) {
        issues.push({
          id: `start-out-${node.id}`,
          nodeId: node.id,
          severity: 'error',
          message: `Start Event "${label}" must have an outgoing flow.`,
        });
      }
    }

    // 2. End Event Rules
    if (node.type === 'bpmnEvent' && eventType === 'end') {
      if (outgoing.length > 0) {
        issues.push({
          id: `end-out-${node.id}`,
          nodeId: node.id,
          severity: 'error',
          message: `End Event "${label}" must not have outgoing flows.`,
        });
      }
      if (incoming.length === 0) {
        issues.push({
          id: `end-in-${node.id}`,
          nodeId: node.id,
          severity: 'warning',
          message: `End Event "${label}" should have an incoming flow.`,
        });
      }
    }

    // 3. Task / Gateway Isolation
    if (['bpmnTask', 'bpmnGateway'].includes(node.type || '')) {
      if (incoming.length === 0 && outgoing.length === 0) {
        issues.push({
          id: `isolated-${node.id}`,
          nodeId: node.id,
          severity: 'warning',
          message: `Node "${label}" is isolated.`,
        });
      }
    }

    // 4. Gateway Rules (簡易チェック)
    if (node.type === 'bpmnGateway') {
      // 分岐も合流もしていないゲートウェイは無意味
      if (incoming.length <= 1 && outgoing.length <= 1) {
        issues.push({
          id: `gateway-useless-${node.id}`,
          nodeId: node.id,
          severity: 'info',
          message: `Gateway "${label}" does not split or merge flows.`,
        });
      }
    }
  });

  // グローバルチェック
  const startNodes = nodes.filter(
    (n) => n.type === 'bpmnEvent' && n.data.eventType === 'start',
  );
  if (startNodes.length === 0) {
    issues.push({
      id: 'no-start',
      severity: 'error',
      message: 'The flow must have at least one Start Event.',
    });
  }

  // 到達可能性チェックの統合
  const reachabilityIssues = checkReachability(nodes, edges);
  issues.push(...reachabilityIssues);

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
};
