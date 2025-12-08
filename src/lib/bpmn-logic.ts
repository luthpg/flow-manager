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

  nodes.forEach((node) => {
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
  // Endは必須ではない場合もあるが、警告として出す
  if (!hasEnd) messages.push('Flow should have an End Event.');

  return {
    isValid: messages.length === 0,
    messages,
  };
};

// --- 2. Auto Formatting Logic ---
export const autoFormatGraph = (nodes: Node[]): Node[] => {
  // 1. ノード座標の正規化 (Grid Snap)
  // まず、全ての通常ノードの最大X座標を計算する（スイムレーンの幅決定用）
  let maxNodeX = 0;

  const formattedNodes = nodes.map((node) => {
    // スイムレーンは後で計算するので一旦スルー（ただし位置はずらさない）
    if (node.type === 'bpmnSwimlane') return node;

    // 以前作成した snapToSlot ロジックの再利用 (関数化してimport推奨だが、ここでは展開)
    // ノード幅の判定
    const isWide = ['bpmnTask', 'bpmnMessaging', 'bpmnDecision'].includes(
      node.type || '',
    );
    const nodeWidth = isWide ? NODE_W_WIDE : NODE_W_SQUARE;
    const offsetX = (SLOT_WIDTH - nodeWidth) / 2;

    // スロット位置の計算
    const slotX = Math.round((node.position.x - offsetX) / SLOT_WIDTH);
    const slotY = Math.round((node.position.y - OFFSET_Y) / SLOT_HEIGHT);

    // 補正後の座標
    const newX = slotX * SLOT_WIDTH + offsetX;
    const newY = slotY * SLOT_HEIGHT + OFFSET_Y;

    // 右端の計算 (パディングとして1スロット分余裕を持たせる)
    if (newX > maxNodeX) maxNodeX = newX;

    return {
      ...node,
      position: { x: newX, y: newY },
    };
  });

  // 全体の右端 (ノードの右端 + 1スロット分の余白)
  const targetLaneWidth = Math.max(maxNodeX + SLOT_WIDTH * 2, SLOT_WIDTH * 5); // 最低でも5スロット

  // 2. スイムレーンの調整
  // 横向きレーンを取得し、Y座標順にソートして隙間を詰める処理などを入れることも可能
  // ここでは「幅の統一」と「座標のグリッド吸着」を行う
  return formattedNodes.map((node) => {
    if (node.type !== 'bpmnSwimlane') return node;

    const isHorizontal =
      (node.data.orientation || 'horizontal') === 'horizontal';

    if (isHorizontal) {
      // 横向き: X=0固定, Yはスロット単位, 幅はコンテンツに合わせて拡張
      const snapY = Math.round(node.position.y / SLOT_HEIGHT) * SLOT_HEIGHT;

      return {
        ...node,
        position: { x: 0, y: snapY },
        style: {
          ...node.style,
          width: targetLaneWidth, // 全レーンの幅を統一拡張
          // 高さはユーザーが調整したものを尊重するか、内部ノードに合わせて計算するかだが、
          // 意図しないリサイズを防ぐため、ここでは「スロット単位への丸め」のみ行う
          height:
            Math.round(
              (Number(node.style?.height) || SLOT_HEIGHT) / SLOT_HEIGHT,
            ) * SLOT_HEIGHT,
        },
      };
    } else {
      // 縦向き: Y=0固定, Xはスロット単位
      const snapX = Math.round(node.position.x / SLOT_WIDTH) * SLOT_WIDTH;
      return {
        ...node,
        position: { x: snapX, y: 0 },
        style: {
          ...node.style,
          // 縦向きの場合は高さを統一拡張するのが自然だが、今回は横優先の実装のため既存維持
          width:
            Math.round((Number(node.style?.width) || SLOT_WIDTH) / SLOT_WIDTH) *
            SLOT_WIDTH,
        },
      };
    }
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
