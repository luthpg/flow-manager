import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  MarkerType,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
} from '@xyflow/react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';
import { useNavigate, useParams } from '@ciderjs/city-gas/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightFromLine,
  ArrowRightToLine,
  CheckCircle,
  ChevronsRight,
  Circle,
  ClipboardCopy,
  ClipboardPaste,
  Clock,
  Columns2Icon,
  Database,
  Diamond,
  DiamondPlus,
  Eye,
  GripHorizontal,
  GripVertical,
  LockIcon,
  LockOpen,
  MessageSquareText,
  MoreVertical,
  Rows2Icon,
  Save,
  Scissors,
  Send,
  Settings,
  Square,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import z from 'zod';
import { useShallow } from 'zustand/react/shallow';
import {
  BpmnAnnotationNode,
  BpmnArrowNode,
  BpmnDatabaseNode,
  BpmnDecisionNode,
  BpmnEventNode,
  BpmnGatewayNode,
  BpmnJumpNode,
  BpmnMailIcon,
  BpmnMessageEventNode,
  BpmnMessagingNode,
  BpmnSwimlaneNode,
  BpmnTaskNode,
  BpmnTimerEventNode,
} from '@/components/custom-nodes';
import { ModeToggle } from '@/components/mode-toggle';
import { SheetTabs } from '@/components/sheet-tabs';
import { useTheme } from '@/components/theme-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/codeblock';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useChangeHistory } from '@/hooks/use-change-history';
import {
  assignLaneToNodes,
  autoFormatGraph,
  validateBPMN,
} from '@/lib/bpmn-logic';
import { GRID_SIZE, OFFSET_Y, SLOT_HEIGHT, SLOT_WIDTH } from '@/lib/constants';
import { serverScripts } from '@/lib/server';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/stores/flow-store';
import type { FlowData, FlowStatus, Role } from '~/types/flow';

// 定義済みカラーパレット（BPMNツールでよくある色）
const LANE_COLORS = [
  '', // Default (Theme)
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#64748b', // Slate
];

// --- Helper: 座標をスロット中央に補正する ---
const snapToSlot = (x: number, y: number, type: string) => {
  // A. コメント系 (20px Grid)
  if (
    type === 'annotation' ||
    type === 'comment' ||
    type === 'bpmnAnnotation'
  ) {
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE,
    };
  }

  // B. スイムレーン、矢羽根 (スロットグリッドの交点にスナップ)
  if (type === 'bpmnSwimlane' || type === 'bpmnArrow') {
    return {
      x: Math.round(x / SLOT_WIDTH) * SLOT_WIDTH,
      y: Math.round(y / SLOT_HEIGHT) * SLOT_HEIGHT,
    };
  }

  // C. 通常ノード (スロット中央寄せ)
  const isWide = [
    'bpmnTask',
    'bpmnMessaging',
    'bpmnDecision',
    'bpmnDatabase',
  ].includes(type || '');
  const nodeWidth = isWide ? 140 : 60;
  const offsetX = (SLOT_WIDTH - nodeWidth) / 2;

  const slotX = Math.round((x - offsetX) / SLOT_WIDTH);
  const slotY = Math.round((y - OFFSET_Y) / SLOT_HEIGHT);

  return {
    x: slotX * SLOT_WIDTH + offsetX,
    y: slotY * SLOT_HEIGHT + OFFSET_Y,
  };
};

export const schema = z.object({
  sheetId: z.optional(z.string()),
});

// ReactFlowProviderを利用するためにコンポーネントを分割
export default function FlowEditorPage() {
  const { id, version, sheetId } = useParams('/flow/[id]/[version]/edit');
  return (
    <ReactFlowProvider key={`${id}-${version}`}>
      <FlowEditorContent id={id} version={version} sheetId={sheetId} />
    </ReactFlowProvider>
  );
}

function FlowEditorContent({
  id,
  version,
  sheetId,
}: {
  id: string;
  version: string;
  sheetId?: string;
}) {
  const navigate = useNavigate();
  const { theme } = useTheme(); // 現在のテーマを取得

  // --- Zustand Store ---
  const {
    nodes,
    edges,
    activeSheetId,
    init,
    setNodes,
    setEdges,
    switchSheet,
    getSnapshot,
  } = useFlowStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      activeSheetId: state.activeSheetId,
      init: state.init,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      switchSheet: state.switchSheet,
      getSnapshot: state.getSnapshot,
    })),
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const currentNodes = useFlowStore.getState().nodes;
      setNodes(applyNodeChanges(changes, currentNodes));
    },
    [setNodes],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const currentEdges = useFlowStore.getState().edges;
      setEdges(applyEdgeChanges(changes, currentEdges));
    },
    [setEdges],
  );

  // --- React Flow Instance ---
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, deleteElements, setCenter, getZoom } =
    useReactFlow();

  // --- Local UI State ---
  const [flowTitle, setFlowTitle] = useState('');
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('DRAFT');
  const [userRole, setUserRole] = useState<Role>('VIEWER');
  const [folderId, setFolderId] = useState('temp-folder-id');
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportedJson, setExportedJson] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [pendingJumpNodeId, setPendingJumpNodeId] = useState<string | null>(
    null,
  );
  // Clipboard state removed in favor of localStorage

  // Dialogs State
  const [isInsertDialogOpen, setIsInsertDialogOpen] = useState(false);
  const [insertConfig, setInsertConfig] = useState<{
    axis: 'x' | 'y';
    cursor: { x: number; y: number };
  } | null>(null);
  const [insertCount, setInsertCount] = useState(1);
  const [deleteAlertConfig, setDeleteAlertConfig] = useState<{
    axis: 'x' | 'y';
    count: number;
    thresholdStart: number;
    deleteSize: number;
    affectedNodes: number;
  } | null>(null);
  const [deleteCountDialogConfig, setDeleteCountDialogConfig] = useState<{
    axis: 'x' | 'y';
    cursor: { x: number; y: number };
  } | null>(null);
  const [deleteCountInput, setDeleteCountInput] = useState(1);

  // History Management Hook
  const { takeSnapshot, undo, redo } = useChangeHistory(activeSheetId);

  // --- Node Types Definition ---
  const nodeTypes = useMemo(
    () => ({
      bpmnTask: BpmnTaskNode,
      bpmnGateway: BpmnGatewayNode,
      bpmnEvent: BpmnEventNode,
      bpmnMessaging: BpmnMessagingNode,
      bpmnJump: BpmnJumpNode,
      bpmnDecision: BpmnDecisionNode,
      bpmnSwimlane: BpmnSwimlaneNode,
      bpmnMessage: BpmnMessageEventNode,
      bpmnAnnotation: BpmnAnnotationNode,
      bpmnDatabase: BpmnDatabaseNode,
      bpmnTimer: BpmnTimerEventNode,
      bpmnArrow: BpmnArrowNode,
    }),
    [],
  );

  // --- Palette Items Definition ---
  const paletteItems = useMemo<
    Array<{
      sectionTitle: string;
      items: Array<Omit<PaletteItemProps, 'onDragStart'>>;
    }>
  >(
    () => [
      {
        sectionTitle: '基本図形',
        items: [
          {
            type: 'bpmnEvent',
            subType: 'start',
            label: 'フロー開始',
            icon: <Circle className="w-5 h-5" />,
          },
          {
            type: 'bpmnTask',
            label: 'タスク',
            icon: <Square className="w-5 h-5" />,
          },
          {
            type: 'bpmnAnnotation',
            label: '吹き出し',
            icon: <MessageSquareText className="w-5 h-5" />,
          },
          {
            type: 'bpmnTimer',
            subType: 'start',
            label: '開始タイマー',
            icon: <Clock className="w-5 h-5" />,
          },
          {
            type: 'bpmnTimer',
            subType: 'intermediate',
            label: '待機タイマー',
            icon: (
              <div className="relative flex items-center justify-center w-6 h-6">
                <div className="absolute inset-0 rounded-full border-2 border-current" />
                <Clock className="w-4 h-4" />
              </div>
            ),
          },
          {
            type: 'bpmnEvent',
            subType: 'end',
            label: 'フロー終了',
            icon: <Circle className="w-5 h-5 font-black" />,
          },
        ],
      },
      {
        sectionTitle: '分岐・合流',
        items: [
          {
            type: 'bpmnDecision',
            label: '条件分岐',
            icon: <Diamond />,
          },
          {
            type: 'bpmnGateway',
            subType: 'inclusive',
            label: 'OR合流',
            icon: (
              <div className="relative w-5 h-5">
                <Diamond />
                <Circle
                  className="absolute top-1.5 left-1.5 w-3 h-3"
                  strokeWidth={3}
                />
              </div>
            ),
          },
          {
            type: 'bpmnGateway',
            subType: 'parallel',
            label: 'AND合流',
            icon: <DiamondPlus />,
          },
        ],
      },
      {
        sectionTitle: 'メッセージ',
        items: [
          {
            type: 'bpmnMessage',
            subType: 'send_data',
            label: '送信\n[情報]',
            icon: (
              <div className="relative">
                <Circle
                  className="w-9 h-9 border-2 rounded-full"
                  style={{ borderColor: 'var(--foreground-muted)' }}
                />
                <BpmnMailIcon
                  className="absolute top-2 left-2 w-5 h-5"
                  isFilled={true}
                />
              </div>
            ),
          },
          {
            type: 'bpmnMessage',
            subType: 'send',
            label: '送信\n[物品]',
            icon: (
              <div className="relative">
                <Circle
                  className="w-9 h-9 border-2 rounded-full"
                  style={{ borderColor: 'var(--foreground-muted)' }}
                />
                <BpmnMailIcon
                  className="absolute top-2 left-2 w-5 h-5"
                  isFilled={true}
                />
              </div>
            ),
          },
          {
            type: 'bpmnMessage',
            subType: 'receive',
            label: '受信',
            icon: (
              <div className="relative">
                <Circle
                  className="w-9 h-9 border-2 rounded-full"
                  style={{ borderColor: 'var(--foreground-muted)' }}
                />
                <BpmnMailIcon
                  className="absolute top-2 left-2 w-5 h-5"
                  isFilled={false}
                />
              </div>
            ),
          },
          {
            type: 'bpmnMessage',
            subType: 'end_send_data',
            label: '送信+終了\n[情報]',
            icon: (
              <div className="relative">
                <Circle className="w-9 h-9" />
                <BpmnMailIcon
                  className="absolute top-2 left-2 w-5 h-5"
                  isFilled={true}
                />
              </div>
            ),
          },
          {
            type: 'bpmnMessage',
            subType: 'end_send',
            label: '送信+終了\n[物品]',
            icon: (
              <div className="relative">
                <Circle className="w-9 h-9" />
                <BpmnMailIcon
                  className="absolute top-2 left-2 w-5 h-5"
                  isFilled={true}
                />
              </div>
            ),
          },
          {
            type: 'bpmnMessage',
            subType: 'receive_end',
            label: '受信+終了',
            icon: (
              <div className="relative">
                <Circle className="w-9 h-9" />
                <BpmnMailIcon
                  className="absolute top-2 left-2 w-5 h-5"
                  isFilled={false}
                />
              </div>
            ),
          },
        ],
      },
      {
        sectionTitle: 'その他',
        items: [
          {
            type: 'bpmnDatabase',
            label: 'DB',
            icon: <Database className="w-5 h-5" />,
          },
          {
            type: 'bpmnJump',
            subType: 'source',
            label: '送り手',
            icon: <ArrowRightFromLine className="w-4 h-4" />,
          },
          {
            type: 'bpmnJump',
            subType: 'target',
            label: '受け手',
            icon: <ArrowRightToLine className="w-4 h-4" />,
          },
          {
            type: 'bpmnArrow',
            label: '矢羽根',
            icon: <ChevronsRight className="w-5 h-5" />,
          },
          {
            type: 'bpmnSwimlane',
            subType: 'horizontal',
            label: 'スイムレーン（横）',
            icon: <GripHorizontal className="w-5 h-5" />,
          },
          {
            type: 'bpmnSwimlane',
            subType: 'vertical',
            label: 'スイムレーン（縦）',
            icon: <GripVertical className="w-5 h-5" />,
          },
        ],
      },
    ],
    [],
  );

  // --- 1. Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await serverScripts.getFlowData(id, version);
        if (res != null) {
          const role = res.userRole ?? 'VIEWER';
          if (role === 'VIEWER') {
            toast.error('You do not have permission to edit this flow.');
            navigate('/dashboard');
            return;
          }
          setUserRole(role);

          // ▼ Store's init action
          init(
            res.graphData,
            '/flow/[id]/[version]/edit',
            { id, version, sheetId },
            navigate,
          );

          setFlowTitle(res.meta.title);
          setFlowStatus(res.meta.currentStatus);
          setFolderId(res.meta.folderId);
        } else {
          toast.error('Failed to load flow');
        }
      } catch (e) {
        console.error(e);
        toast.error('Connection failed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, version, sheetId, init, navigate]);

  // --- 1.5 Lock Heartbeat ---
  useEffect(() => {
    const doHeartbeat = async () => {
      try {
        const res = await serverScripts.startEditing(id);
        if (!res.success && res.lockedBy) {
          toast.error(`Locked by ${res.lockedBy}`, {
            description: 'Someone else is editing this flow.',
            duration: Infinity,
            action: {
              label: 'Go to Dashboard',
              onClick: () => navigate('/dashboard'),
            },
          });
        }
      } catch (e) {
        console.error('Heartbeat failed', e);
      }
    };

    doHeartbeat();
    const interval = setInterval(doHeartbeat, 1000 * 60 * 4); // 4 mins
    return () => clearInterval(interval);
  }, [id, navigate]);

  // --- 2. Event Handlers ---

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      // 両方ともメッセージイベントなら点線 (Message Flow)
      // または Annotation からの接続なら点線 (Association)
      // または DBに関連する接続なら点線 (Database)
      let isDotted = false;

      if (
        sourceNode?.type === 'bpmnMessage' &&
        targetNode?.type === 'bpmnMessage'
      ) {
        isDotted = true;
      }
      if (
        sourceNode?.type === 'bpmnAnnotation' ||
        targetNode?.type === 'bpmnAnnotation'
      ) {
        isDotted = true;
      }
      if (
        sourceNode?.type === 'bpmnDatabase' ||
        targetNode?.type === 'bpmnDatabase'
      ) {
        isDotted = true;
      }

      const newEdge = {
        ...params,
        type: 'smoothstep', // 直角折れ線
        markerEnd: { type: MarkerType.ArrowClosed },
        style: isDotted ? { strokeDasharray: '5,5' } : undefined, // ▼ 点線スタイル
      };
      setEdges(addEdge(newEdge, edges));
    },
    [nodes, edges, setEdges],
  );

  const onDragStart = (
    event: React.DragEvent,
    nodeType: string,
    label: string,
    subType?: string,
  ) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    if (subType) event.dataTransfer.setData('application/subtype', subType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');
      const subType = event.dataTransfer.getData('application/subtype');

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 座標補正 (typeのみで判断)
      const { x, y } = snapToSlot(position.x, position.y, type);

      let initialStyle: React.CSSProperties = {};
      let nodeData: Record<string, unknown> = { label };

      // スイムレーンなどの初期サイズ計算
      if (type === 'bpmnSwimlane' || type === 'bpmnArrow') {
        const isHorizontal = subType === 'horizontal' || !subType;
        const heightInHorizontal =
          type === 'bpmnSwimlane' ? 3 : type === 'bpmnArrow' ? 1 : 2;
        const w = isHorizontal
          ? SLOT_WIDTH * 15
          : SLOT_WIDTH * heightInHorizontal;
        const h = isHorizontal
          ? SLOT_HEIGHT * heightInHorizontal
          : SLOT_HEIGHT * 15;
        nodeData.orientation = isHorizontal ? 'horizontal' : 'vertical';
        initialStyle = {
          zIndex: -1,
          width: w,
          height: h,
        };
      } else if (type === 'bpmnTimer') {
        // subType ('start' | 'intermediate') をそのまま渡す
        nodeData.timerType = subType;
        // ラベル初期値の設定
        if (!label) {
          nodeData.label = subType === 'start' ? '毎月1日' : '3日待機';
        }
      } else if (type === 'bpmnMessage') {
        // subTypeに応じたプロパティ設定
        switch (subType) {
          case 'receive':
            nodeData.messageType = 'receive';
            nodeData.isEnd = false;
            break;
          case 'receive_end':
            nodeData.messageType = 'receive';
            nodeData.isEnd = true;
            break;
          case 'end_send':
            nodeData.messageType = 'send';
            nodeData.isEnd = true;
            break;
          case 'send_data':
            nodeData.messageType = 'send';
            nodeData.hasData = true;
            break;
          case 'end_send_data':
            nodeData.messageType = 'send';
            nodeData.isEnd = true;
            nodeData.hasData = true;
            break;
          // includes:: case 'send':
          default:
            nodeData.messageType = 'send';
            break;
        }
      } else if (type === 'bpmnAnnotation') {
        initialStyle = { width: 160, height: 80 }; // 初期サイズ
      } else {
        nodeData = {
          gatewayType: type === 'bpmnGateway' ? subType : undefined,
          messageType: type === 'bpmnMessaging' ? subType : undefined,
          jumpType: type === 'bpmnJump' ? subType : undefined,
          eventType: type === 'bpmnEvent' ? subType : undefined,
        };
      }

      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position: { x, y },
        style: initialStyle,
        dragHandle: type === 'bpmnSwimlane' ? '.lane-drag-handle' : undefined,
        data: nodeData,
      };
      setNodes(nodes.concat(newNode));
    },
    [screenToFlowPosition, nodes, setNodes],
  );

  const onNodeDrag = useCallback(
    (_: React.MouseEvent, _draggedNode: Node) => {
      // スイムレーンの自動拡張
      const currentNodes = useFlowStore.getState().nodes;
      const selectedNodes = currentNodes.filter(
        (n) => n.selected && n.type !== 'bpmnSwimlane',
      );

      if (selectedNodes.length === 0) return;

      let changed = false;
      const newNodes = currentNodes.map((lane) => {
        if (lane.type !== 'bpmnSwimlane') return lane;

        let laneW = Number(lane.style?.width) || SLOT_WIDTH;
        let laneH = Number(lane.style?.height) || SLOT_HEIGHT;
        let laneChanged = false;

        const laneX = lane.position.x;
        const laneY = lane.position.y;

        for (const node of selectedNodes) {
          const nodeW = node.measured?.width ?? 60;
          const nodeH = node.measured?.height ?? 60;
          const nodeRight = node.position.x + nodeW;
          const nodeBottom = node.position.y + nodeH;
          const centerX = node.position.x + nodeW / 2;
          const centerY = node.position.y + nodeH / 2;

          // 判定: ノードがレーンの「内部」または「右下」にあるか
          if (centerX > laneX && centerY > laneY) {
            // 横方向の拡張
            if (centerY < laneY + laneH + SLOT_HEIGHT) {
              if (nodeRight > laneX + laneW - 20) {
                laneW = Math.max(laneW, nodeRight - laneX + SLOT_WIDTH);
                laneW = Math.ceil(laneW / SLOT_WIDTH) * SLOT_WIDTH;
                laneChanged = true;
              }
            }

            // 縦方向の拡張
            if (centerX < laneX + laneW + SLOT_WIDTH) {
              if (nodeBottom > laneY + laneH - 20) {
                laneH = Math.max(laneH, nodeBottom - laneY + SLOT_HEIGHT);
                laneH = Math.ceil(laneH / SLOT_HEIGHT) * SLOT_HEIGHT;
                laneChanged = true;
              }
            }
          }
        }

        if (laneChanged) {
          changed = true;
          return {
            ...lane,
            style: { ...lane.style, width: laneW, height: laneH },
          };
        }
        return lane;
      });

      if (changed) {
        setNodes(newNodes);
      }
    },
    [setNodes],
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, _draggedNode: Node) => {
      const currentNodes = useFlowStore.getState().nodes;

      const newNodes = currentNodes.map((node) => {
        if (node.selected) {
          const { x, y } = snapToSlot(
            node.position.x,
            node.position.y,
            node.type || 'default',
          );
          return { ...node, position: { x, y } };
        }
        return node;
      });

      setNodes(newNodes);
    },
    [setNodes],
  );

  // ▼ 削除ハンドラ
  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId) {
      // 選択中のノードを削除 (繋がっているエッジも自動削除)
      deleteElements({ nodes: [{ id: selectedNodeId }] });
      setSelectedNodeId(null);
      toast.info('Node deleted');
    }
  }, [selectedNodeId, deleteElements]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNodeId(nodes[0]?.id || null);
      setSelectedEdgeId(edges[0]?.id || null);
    },
    [],
  );

  const updateNodeData = useCallback(
    (key: string, value: string) => {
      const newNodes = nodes.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, [key]: value } };
        }
        return node;
      });
      setNodes(newNodes);
    },
    [selectedNodeId, nodes, setNodes],
  );

  // エッジラベル更新ハンドラ
  const updateEdgeLabel = useCallback(
    (label: string) => {
      const newEdges = edges.map((edge) => {
        if (edge.id === selectedEdgeId) {
          return {
            ...edge,
            label, // テキスト反映
            // ラベルのスタイル設定 (Shadcnライクな見た目に)
            labelStyle: {
              fill: 'currentColor',
              fontWeight: 500,
              fontSize: 12,
            },
            labelBgStyle: {
              fill: 'var(--background)',
              fillOpacity: 0.9,
              stroke: 'var(--border)',
              strokeWidth: 1,
            },
            labelBgPadding: [8, 4] as [number, number],
            labelBgBorderRadius: 4,
          };
        }
        return edge;
      });
      setEdges(newEdges);
    },
    [selectedEdgeId, edges, setEdges],
  );

  const handleToggleLock = useCallback(() => {
    if (!selectedNodeId) return;

    const newNodes = nodes.map((node) => {
      if (node.id === selectedNodeId) {
        const newLockedState = !node.data.locked;

        return {
          ...node,
          draggable: !newLockedState,
          deletable: !newLockedState,
          connectable: !newLockedState,
          // データとしての状態保存
          data: {
            ...node.data,
            locked: newLockedState,
          },
        };
      }
      return node;
    });
    setNodes(newNodes);

    // トースト通知
    const isLocked = !nodes.find((n) => n.id === selectedNodeId)?.data.locked;
    toast.info(isLocked ? 'Node Locked' : 'Node Unlocked');
  }, [selectedNodeId, nodes, setNodes]);

  // 選択中のノードのロック状態を取得
  const isSelectedNodeLocked = nodes.find((n) => n.id === selectedNodeId)?.data
    .locked;

  // Save Draft
  const handleSave = async () => {
    const promise = async () => {
      // ▼ 保存直前にレーン所属判定を実行してデータを更新
      const nodesWithLaneInfo = assignLaneToNodes(nodes);
      setNodes(nodesWithLaneInfo);

      const fullData = getSnapshot(); // 引数なしに変更
      const res = await serverScripts.saveDraft({
        flowId: id,
        title: flowTitle,
        graphData: fullData, // 構造化データを保存
      });

      // 保存後、バージョンIDが変わる可能性がある（初回保存時など）
      if (res.versionId !== version) {
        navigate('/flow/[id]/[version]/edit', {
          id,
          version: res.versionId,
        });
      }

      setFlowStatus('DRAFT');
      return res;
    };

    toast.promise(promise(), {
      loading: 'Saving draft...',
      success: 'Draft saved successfully',
      error: (err) => `Save failed: ${err.message}`,
    });
  };

  // Submit Flow
  const handleSubmit = async () => {
    const promise = async () => {
      const res = await serverScripts.submitFlow({
        flowId: id,
        versionId: version,
        comment: 'Submitted from Editor',
      });
      setFlowStatus('PENDING');
      return res;
    };

    toast.promise(promise(), {
      loading: 'Submitting...',
      success: 'Flow submitted for approval',
      error: (err) => `Submit failed: ${err.message}`,
    });
  };

  // --- Handlers for Sheets ---
  const handleSwitchSheet = useCallback(
    (targetId: string) => {
      switchSheet(
        targetId,
        '/flow/[id]/[version]/edit',
        { id, version },
        navigate,
      );
    },
    [switchSheet, id, version, navigate],
  );

  const handleFormat = useCallback(() => {
    // 1. ノードとスイムレーンの位置・サイズ修正
    const formattedNodes = autoFormatGraph(nodes, edges);

    // 変更があれば更新 (位置が変わっていなくてもValidationは見たいので更新処理は走らせる)
    setNodes(formattedNodes);

    // 2. BPMNルールチェック
    const validation = validateBPMN(formattedNodes, edges);

    if (validation.isValid) {
      toast.success('Formatted & Validated', {
        description: 'Flow structure is valid and layout has been cleaned up.',
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      });
    } else {
      // エラーがある場合はWarningトーストを表示
      toast.warning('Formatted with Warnings', {
        description: (
          <ul className="list-disc pl-4 text-xs mt-2 space-y-1">
            {validation.messages.map((msg, i) => (
              <li key={`${i}-${msg}`}>{msg}</li>
            ))}
          </ul>
        ),
        duration: 5000, // 長めに表示
        dismissible: true,
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      });
    }
  }, [nodes, edges, setNodes]);

  const handleExportJson = useCallback(() => {
    // 現在のノードとエッジ、メタデータをJSON化
    const exportData: Omit<FlowData, 'version'> = {
      meta: {
        folderId,
        flowId: id,
        versionId: version,
        activeVersionId: version, // 仮の設定
        title: flowTitle,
        currentStatus: flowStatus,
        updatedAt: new Date().toISOString(),
      },
      graphData: getSnapshot(), // ストアから取得
    };

    setExportedJson(JSON.stringify(exportData, null, 2));
    setIsExportDialogOpen(true);
  }, [id, version, folderId, flowTitle, flowStatus, getSnapshot]);

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importJson);
      // Validate structure roughly
      if (!parsed.graphData || !parsed.graphData.sheets) {
        throw new Error('Invalid JSON format: missing graphData.sheets');
      }

      // Restore
      init(
        parsed.graphData,
        '/flow/[id]/[version]/edit',
        { id, version, sheetId },
        navigate,
      );
      toast.success('Flow imported successfully');
      setIsImportDialogOpen(false);
      setImportJson('');
    } catch (e) {
      console.error(e);
      toast.error(`Failed to import JSON: ${(e as Error).message}`);
    }
  }, [importJson, init, id, version, sheetId, navigate]);

  // --- Helper: 指定ノードへズームイン ---
  const focusNode = useCallback(
    (node: Node) => {
      // ノードの中心座標を計算 (幅/高さはデフォルト60pxと仮定、またはmeasuredを使用)
      const width = node.measured?.width ?? 60;
      const height = node.measured?.height ?? 60;
      const x = node.position.x + width / 2;
      const y = node.position.y + height / 2;

      // 現在のズームレベルを維持するか、少し寄る (例: 1.2)
      const targetZoom = Math.max(getZoom(), 1.0);

      setCenter(x, y, { zoom: targetZoom, duration: 800 });

      // 視覚的なフィードバック (一時的に選択状態にするなど)
      const newNodes = nodes.map((n) => ({
        ...n,
        selected: n.id === node.id,
      }));
      setNodes(newNodes);

      toast.success(`Jumped to link "${node.data.label}"`);
    },
    [setCenter, getZoom, nodes, setNodes],
  );

  // --- Jump Logic ---
  const handleJump = useCallback(
    (sourceLabel: string) => {
      if (!sourceLabel) return;

      // ストアから最新のシート情報を取得
      const { sheets, activeSheetId } = useFlowStore.getState();

      // 1. 全シートからターゲットを探す
      let targetNode: Node | undefined;
      let targetSheetId: string | undefined;

      // A. 現在のシート内を検索
      targetNode = nodes.find(
        (n) =>
          n.type === 'bpmnJump' &&
          n.data.jumpType === 'target' &&
          n.data.label === sourceLabel,
      );

      if (targetNode) {
        focusNode(targetNode);
        return;
      }

      // B. 他のシートを検索
      for (const sheet of sheets) {
        if (sheet.id === activeSheetId) continue;

        const match = sheet.nodes.find(
          (n) =>
            n.type === 'bpmnJump' &&
            n.data.jumpType === 'target' &&
            n.data.label === sourceLabel,
        );

        if (match) {
          targetNode = match;
          targetSheetId = sheet.id;
          break;
        }
      }

      if (targetNode && targetSheetId) {
        handleSwitchSheet(targetSheetId);
        setPendingJumpNodeId(targetNode.id);
      } else {
        toast.warning(`Link destination "${sourceLabel}" not found.`);
      }
    },
    [nodes, handleSwitchSheet, focusNode],
  );

  // --- Event Handler: Node Click ---
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Jump Sourceノードをクリックした時だけ発火
      if (node.type === 'bpmnJump' && node.data.jumpType === 'source') {
        // ダブルクリック等ではなく、明示的な操作（例: Alt+Click や アイコンクリック）にするか、
        // ここではシンプルに「クリックでジャンプ」とする
        handleJump(node.data.label as string);
      }
    },
    [handleJump],
  );

  // --- Effect: シート切り替え後のジャンプ実行 ---
  useEffect(() => {
    if (pendingJumpNodeId) {
      // 現在のnodes（切り替え後のシートのノード群）から対象を探す
      const target = nodes.find((n) => n.id === pendingJumpNodeId);
      if (target) {
        // ノード描画・レイアウト計算を待つために少し遅延させると確実
        setTimeout(() => {
          focusNode(target);
          setPendingJumpNodeId(null); // 予約解除
        }, 100);
      }
    }
  }, [nodes, pendingJumpNodeId, focusNode]);

  // --- Logic: 行・列の挿入 (スペース作成) ---
  const handleInsertSpace = useCallback(
    (
      axis: 'x' | 'y',
      count: number,
      cursorScreen: { x: number; y: number },
    ) => {
      // スクリーン座標をフロー座標に変換
      const cursorFlow = screenToFlowPosition(cursorScreen);

      // スロット単位での移動量 (ピクセル)
      const moveAmount = count * (axis === 'x' ? SLOT_WIDTH : SLOT_HEIGHT);

      // 閾値: クリックした座標
      const threshold = axis === 'x' ? cursorFlow.x : cursorFlow.y;

      const newNodes = nodes.map((node) => {
        const nodePos = axis === 'x' ? node.position.x : node.position.y;

        // Case 1: 基準線より「後ろ（右/下）」にあるノードは、そのままズラす
        if (nodePos >= threshold) {
          return {
            ...node,
            position: {
              ...node.position,
              [axis]: nodePos + moveAmount,
            },
          };
        }

        // Case 2: 基準線を「跨いでいる」スイムレーンは、サイズを拡張する
        // (開始位置 < 閾値 < 終了位置)
        if (node.type === 'bpmnSwimlane') {
          const dimensionKey = axis === 'x' ? 'width' : 'height';
          // 現在のサイズを取得 (styleに保存されている前提)
          const currentSize =
            Number(node.style?.[dimensionKey]) ||
            (axis === 'x' ? SLOT_WIDTH : SLOT_HEIGHT);

          // レーンの終了位置
          const nodeEnd = nodePos + currentSize;

          if (nodePos < threshold && nodeEnd > threshold) {
            return {
              ...node,
              style: {
                ...node.style,
                [dimensionKey]: currentSize + moveAmount,
              },
            };
          }
        }

        // Case 3: 基準線より「手前」にあるノードは何もしない
        return node;
      });
      setNodes(newNodes);

      toast.success(`Inserted ${count} ${axis === 'x' ? 'columns' : 'rows'}`);
    },
    [screenToFlowPosition, nodes, setNodes],
  );

  // ダイアログ経由での実行
  const executeInsertFromDialog = () => {
    if (insertConfig) {
      handleInsertSpace(insertConfig.axis, insertCount, insertConfig.cursor);
      setIsInsertDialogOpen(false);
      setInsertCount(1); // リセット
    }
  };

  // 削除実行の実体 (実際にデータを操作する関数)
  const executeDelete = useCallback(
    (axis: 'x' | 'y', thresholdStart: number, deleteSize: number) => {
      // Step A: 削除範囲内に起点があるノードを除外 (完全削除)
      const remainingNodes = nodes.filter((node) => {
        const pos = axis === 'x' ? node.position.x : node.position.y;
        // 削除範囲: [thresholdStart, thresholdStart + deleteSize)
        const isInDeleteZone =
          pos >= thresholdStart && pos < thresholdStart + deleteSize;
        return !isInDeleteZone;
      });

      // Step B: 残ったノードの位置調整・リサイズ
      const finalNodes = remainingNodes.map((node) => {
        const pos = axis === 'x' ? node.position.x : node.position.y;

        // Case 1: 削除範囲より「後ろ」にあるノードは、手前にズラす
        if (pos >= thresholdStart + deleteSize) {
          return {
            ...node,
            position: {
              ...node.position,
              [axis]: pos - deleteSize,
            },
          };
        }

        // Case 2: 削除範囲を「跨いでいる」スイムレーンは、サイズを縮小する
        // (開始位置 < 削除開始 < 終了位置)
        if (node.type === 'bpmnSwimlane') {
          const dimensionKey = axis === 'x' ? 'width' : 'height';
          const currentSize =
            Number(node.style?.[dimensionKey]) ||
            (axis === 'x' ? SLOT_WIDTH : SLOT_HEIGHT);
          const nodeEnd = pos + currentSize;

          // レーンの中に削除範囲が含まれている場合
          if (pos < thresholdStart && nodeEnd > thresholdStart) {
            // 縮小後のサイズが最小サイズ(1スロット)を割らないようにガードしても良いが、
            // ここでは単純に削除分を引く
            const newSize = Math.max(
              axis === 'x' ? SLOT_WIDTH : SLOT_HEIGHT,
              currentSize - deleteSize,
            );

            return {
              ...node,
              style: {
                ...node.style,
                [dimensionKey]: newSize,
              },
            };
          }
        }

        // Case 3: 削除範囲より「手前」にあるノードは何もしない
        return node;
      });

      setNodes(finalNodes);

      toast.success('Deleted space successfully.');
      setDeleteAlertConfig(null); // ダイアログ閉じる
    },
    [nodes, setNodes],
  );

  // 削除の試行 (コンテキストメニューから呼ばれる)
  const handleAttemptDelete = useCallback(
    (
      axis: 'x' | 'y',
      count: number,
      cursorScreen: { x: number; y: number },
    ) => {
      const cursorFlow = screenToFlowPosition(cursorScreen);

      // スロット単位サイズ
      const unitSize = axis === 'x' ? SLOT_WIDTH : SLOT_HEIGHT;
      const deleteSize = count * unitSize;

      // 削除開始ラインの計算
      // クリック位置が含まれるスロットの「開始線」を基準にする
      const rawPos = axis === 'x' ? cursorFlow.x : cursorFlow.y;
      // Math.floor でスロットの区切りまで丸める
      const thresholdStart = Math.floor(rawPos / unitSize) * unitSize;
      const thresholdEnd = thresholdStart + deleteSize;

      // 衝突検知: この範囲内に「起点」があるノードを探す
      const conflictingNodes = nodes.filter((n) => {
        const pos = axis === 'x' ? n.position.x : n.position.y;
        return pos >= thresholdStart && pos < thresholdEnd;
      });

      if (conflictingNodes.length > 0) {
        // 衝突がある場合は警告ダイアログを表示
        setDeleteAlertConfig({
          axis,
          count,
          thresholdStart,
          deleteSize,
          affectedNodes: conflictingNodes.length,
        });
      } else {
        // 衝突がなければ即実行
        executeDelete(axis, thresholdStart, deleteSize);
      }
    },
    [nodes, screenToFlowPosition, executeDelete],
  );

  // ダイアログから削除フローを開始する関数
  const proceedToDeleteCheck = () => {
    if (deleteCountDialogConfig) {
      // ここで既存の削除判定ロジックを呼び出す
      // (衝突があれば警告ダイアログ、なければ即削除される)
      handleAttemptDelete(
        deleteCountDialogConfig.axis,
        deleteCountInput,
        deleteCountDialogConfig.cursor,
      );
      setDeleteCountDialogConfig(null); // 入力ダイアログを閉じる
    }
  };

  // 右クリック時の座標保持用
  const contextMenuPosRef = useRef({ x: 0, y: 0 });
  const onContextMenu = (e: React.MouseEvent) => {
    contextMenuPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // ▼ 追加: プレビュー画面への遷移
  const handleGoToPreview = useCallback(() => {
    // 現在のバージョンIDを維持して遷移
    navigate('/flow/[id]/[version]/preview', {
      id,
      version,
      sheetId: activeSheetId,
    });
  }, [navigate, id, version, activeSheetId]);

  // 1. コピー
  const handleCopy = useCallback(() => {
    // 選択されているノードとエッジを抽出
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    if (selectedNodes.length === 0) return;

    // LocalStorageへ保存
    const clipData = {
      nodes: selectedNodes,
      edges: selectedEdges,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('flow-clipboard', JSON.stringify(clipData));
      toast.info(`Copied ${selectedNodes.length} items`);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
      toast.error('Copy failed (Quota exceeded?)');
    }
  }, [nodes, edges]);

  // 2. 切り取り
  const handleCut = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    if (selectedNodes.length === 0) return;

    // コピーしてから削除
    const clipData = {
      nodes: selectedNodes,
      edges: selectedEdges,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('flow-clipboard', JSON.stringify(clipData));
      deleteElements({ nodes: selectedNodes, edges: selectedEdges });
      toast.info('Cut selection');
    } catch (e) {
      console.error('Failed to cut', e);
      toast.error('Cut failed');
    }
  }, [nodes, edges, deleteElements]);

  // 3. ペースト
  const handlePaste = useCallback(
    (targetPosition?: { x: number; y: number }) => {
      const json = localStorage.getItem('flow-clipboard');
      if (!json) return;

      let clipboard: { nodes: Node[]; edges: Edge[] } | null = null;
      try {
        clipboard = JSON.parse(json);
      } catch (e) {
        console.error('Failed to parse clipboard', e);
        return;
      }

      if (
        !clipboard ||
        !Array.isArray(clipboard.nodes) ||
        clipboard.nodes.length === 0
      )
        return;

      // IDマッピング
      const idMap = new Map<string, string>();

      // 移動量の計算
      let dx = 40; // Ctrl+V時のデフォルトずらし幅
      let dy = 40;

      if (targetPosition) {
        // 1. アンカーノード（基準となる左上のノード）を特定
        //    X座標が最小、同じならY座標が最小のものを選ぶ
        const sortedByPos = [...clipboard.nodes].sort((a, b) => {
          if (Math.abs(a.position.x - b.position.x) > 1) {
            return a.position.x - b.position.x;
          }
          return a.position.y - b.position.y;
        });
        const anchorNode = sortedByPos[0];

        // 2. 右クリック位置を、アンカーノードのタイプに合わせてスナップ計算 (onDropと同様)
        //    これにより「枠の中央」や「グリッド」に正しく吸着する座標が得られる
        const snappedPos = snapToSlot(
          targetPosition.x,
          targetPosition.y,
          anchorNode.type || 'default',
        );

        // 3. 差分（移動量）を計算
        //    (吸着後の目標座標) - (コピー元の座標)
        dx = snappedPos.x - anchorNode.position.x;
        dy = snappedPos.y - anchorNode.position.y;
      }

      // A. ノードの複製
      const newNodes = clipboard.nodes.map((node) => {
        const newId = crypto.randomUUID();
        idMap.set(node.id, newId);

        // 新しい座標 = 元の座標 + 移動量
        let newX = node.position.x + dx;
        let newY = node.position.y + dy;

        // Ctrl+V (マウス位置指定なし) の場合のみ、念のため20pxグリッドに丸める
        if (!targetPosition) {
          newX = Math.round(newX / 20) * 20;
          newY = Math.round(newY / 20) * 20;
        }

        return {
          ...node,
          id: newId,
          position: { x: newX, y: newY },
          selected: true,
        };
      });

      // B. エッジの複製
      const newEdges = clipboard.edges
        .map((edge) => {
          const newSource = idMap.get(edge.source);
          const newTarget = idMap.get(edge.target);

          if (newSource && newTarget) {
            return {
              ...edge,
              id: crypto.randomUUID(),
              source: newSource,
              target: newTarget,
              selected: true,
            };
          }
          return null;
        })
        .filter((e) => e !== null) as Edge[];

      // C. 反映
      setNodes([...nodes.map((n) => ({ ...n, selected: false })), ...newNodes]);
      setEdges([
        ...edges.map((e) => ({ ...e, selected: false })),
        ...newEdges,
      ] as Edge[]);

      toast.success('Pasted');
    },
    [nodes, edges, setNodes, setEdges],
  );

  // Undo Handler
  const handleUndo = useCallback(() => {
    // 現在の nodes/edges を渡して、戻すべき状態を受け取る
    const state = undo(nodes, edges);
    if (state) {
      setNodes(state.nodes);
      setEdges(state.edges);
      toast.info('Undo');
    }
  }, [undo, nodes, edges, setNodes, setEdges]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    const state = redo(nodes, edges);
    if (state) {
      setNodes(state.nodes);
      setEdges(state.edges);
      toast.info('Redo');
    }
  }, [redo, nodes, edges, setNodes, setEdges]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力フォーム等では無効化
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      )
        return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'x':
            e.preventDefault();
            handleCut();
            break;
          case 'v':
            e.preventDefault();
            handlePaste();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo(); // Ctrl+Shift+Z
            } else {
              handleUndo(); // Ctrl+Z
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo(); // Ctrl+Y
            break;
          case 'a':
            // TODO: Select All 実装
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handleCut, handlePaste, handleUndo, handleRedo]);

  // --- Theme Colors ---
  // テーマに応じてグリッド色を切り替え
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const gridColorSlot = isDark ? '#334155' : '#e2e8f0'; // slate-700 : slate-200
  const gridColorDot = isDark ? '#475569' : '#cbd5e1'; // slate-600 : slate-300
  const maskColor = isDark
    ? 'rgba(0, 0, 0, 0.5)' // ダークモード: 背景(黒)よりさらに暗く
    : 'rgba(0, 0, 0, 0.25)'; // ライトモード: スイムレーン(薄グレー)より暗い影を落とす

  // --- Render Helpers ---
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading Flow...
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {/* --- Header --- */}
      <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background z-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Input
                value={flowTitle}
                onFocus={() => takeSnapshot(nodes, edges)}
                onChange={(e) => setFlowTitle(e.target.value)}
                className="h-7 w-64 border-none shadow-none text-lg font-medium px-0 focus-visible:ring-0 bg-transparent"
                placeholder="Untitled Flow"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge
                variant={flowStatus === 'PUBLISHED' ? 'default' : 'secondary'}
                className="h-5 px-1.5 font-normal"
              >
                {flowStatus}
              </Badge>
              <span className="text-muted-foreground">ver: {version}</span>
              <span className="text-slate-400">Autosave: off</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ゴミ箱 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteNode}
            disabled={!selectedNodeId}
            className="text-muted-foreground hover:text-destructive disabled:opacity-30"
            title="Delete Selected Node (Backspace)"
          >
            <Trash2 className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleLock}
            disabled={!selectedNodeId}
            className={cn(
              'text-muted-foreground hover:text-primary disabled:opacity-30',
              isSelectedNodeLocked
                ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/30' // ロック中は色を変える
                : '',
            )}
            title={isSelectedNodeLocked ? 'Unlock Node' : 'Lock Node'}
          >
            {isSelectedNodeLocked ? (
              <LockIcon className="w-5 h-5" />
            ) : (
              <LockOpen className="w-5 h-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleFormat}
            className="text-muted-foreground hover:text-primary"
            title="Format & Validate Flow"
          >
            <Wand2 className="w-5 h-5" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <ModeToggle />

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-muted-foreground"
            onClick={handleGoToPreview}
            title="Switch to Viewer Mode"
          >
            <Eye className="w-4 h-4" /> Preview
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="w-4 h-4" /> Save
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Send className="w-4 h-4" /> Submit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportJson}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                Import JSON
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Flow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* --- Left Sidebar (Palette) --- */}
        <aside className="w-20 border-r border-sidebar-border bg-sidebar flex flex-col items-center py-4 gap-4 overflow-y-auto z-10 custom-scrollbar">
          {paletteItems.map(({ sectionTitle, items }, i) => {
            const paletteItems = items.map((props) => (
              <PaletteItem
                key={`paletteItem-${props.type}-${props.subType}`}
                {...props}
                onDragStart={onDragStart}
              />
            ));
            return (
              <div key={`sectionTitle-${sectionTitle}`}>
                {i === 0 ? null : <Separator className="w-10" />}
                <PaletteSection key={sectionTitle} title={sectionTitle}>
                  {paletteItems}
                </PaletteSection>
              </div>
            );
          })}
        </aside>

        <ContextMenu>
          <ContextMenuTrigger
            className="flex-1 relative h-full w-full"
            onContextMenu={onContextMenu}
          >
            {/* --- Canvas --- */}
            <main className="flex-1 flex flex-col relative bg-muted/20 h-full">
              <div className="flex-1 relative h-full" ref={reactFlowWrapper}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeDrag={onNodeDrag}
                  onNodeDragStop={onNodeDragStop}
                  onSelectionChange={onSelectionChange}
                  onNodeClick={onNodeClick}
                  panOnScroll
                  selectionOnDrag
                  snapToGrid
                  panOnDrag={[1]}
                  selectionMode={SelectionMode.Partial}
                  defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
                  snapGrid={[GRID_SIZE, GRID_SIZE]}
                  minZoom={0.2}
                  maxZoom={3.0}
                >
                  {/* 枠線グリッド */}
                  <Background
                    id="slot-grid"
                    variant={BackgroundVariant.Lines}
                    gap={[SLOT_WIDTH, SLOT_HEIGHT]}
                    size={1}
                    color={gridColorSlot}
                    lineWidth={1.2}
                  />
                  {/* ドットグリッド */}
                  <Background
                    id="fine-grid"
                    variant={BackgroundVariant.Dots}
                    gap={[GRID_SIZE, GRID_SIZE]}
                    size={1}
                    color={gridColorDot}
                  />

                  <Controls
                    className={cn(
                      // ベース: カード背景、ボーダーあり、影あり
                      'bg-card! border! border-border! shadow-sm! rounded-md! p-1!',

                      // 子要素のボタンに対するスタイル上書き
                      '[&>button]:bg-transparent!', // ボタン自体の背景は透明に
                      '[&>button]:border-none!', // ボタン間の余計なボーダーを消す（あるいは !border-border で区切る）
                      '[&>button]:text-muted-foreground!', // アイコン色

                      // ホバー時のスタイル
                      '[&>button:hover]:bg-accent! [&>button:hover]:text-accent-foreground!',

                      // SVGアイコンの塗りつぶし補正 (React Flowのアイコンはfill/strokeが特殊な場合があるため)
                      '[&>button>svg]:fill-current!',
                    )}
                  />
                  <MiniMap
                    // 1. パネル自体のスタイル (Controlsと同様に !important で上書き)
                    className={cn(
                      'bg-card! border! border-border! shadow-sm! rounded-md!',
                      'bottom-1! right-1!', // 位置調整
                    )}
                    // 2. マスクの色 (テーマ動的対応)
                    maskColor={maskColor}
                    // 3. ノードごとのクラス動的適用
                    nodeClassName={(node) => {
                      // A. スイムレーン: 背景として非常に薄く表示
                      if (node.type === 'bpmnSwimlane') {
                        return cn(
                          'fill-muted/30!', // 塗りつぶし: 薄いグレー/透過
                          'stroke-border/50!', // 枠線: 薄い境界線
                          'dark:fill-muted/20!', // ダークモード時はさらに薄く
                        );
                      }

                      // B. 通常ノード: Primaryカラーで強調
                      return cn(
                        '!fill-primary', // 塗りつぶし: メインカラー
                        '!stroke-transparent', // 枠線: なし
                      );
                    }}
                    zoomable
                    pannable
                  />
                </ReactFlow>
              </div>

              <SheetTabs
                flowId={id}
                version={version}
                navigate={navigate}
                routeName="/flow/[id]/[version]/edit"
              />
            </main>
          </ContextMenuTrigger>

          {/* --- Context Menu --- */}
          <ContextMenuContent className="w-64">
            <ContextMenuItem onClick={handleCopy}>
              <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCut}>
              <Scissors className="mr-2 h-4 w-4" /> Cut
              <ContextMenuShortcut>⌘X</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                const screenPos = contextMenuPosRef.current;
                const flowPos = screenToFlowPosition(screenPos);
                handlePaste(flowPos);
              }}
            >
              <ClipboardPaste className="mr-2 h-4 w-4" /> Paste
              <ContextMenuShortcut>⌘V</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem
              onClick={() =>
                handleInsertSpace('y', 1, contextMenuPosRef.current)
              }
            >
              <Rows2Icon className="mr-2 h-4 w-4" />
              Insert 1 Row (Below)
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                handleInsertSpace('x', 1, contextMenuPosRef.current)
              }
            >
              <Columns2Icon className="mr-2 h-4 w-4" />
              Insert 1 Column (Right)
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuSub>
              <ContextMenuSubTrigger>Insert Multiple...</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem
                  onClick={() => {
                    setInsertConfig({
                      axis: 'y',
                      cursor: contextMenuPosRef.current,
                    });
                    setInsertCount(2);
                    setIsInsertDialogOpen(true);
                  }}
                >
                  Insert N Rows...
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    setInsertConfig({
                      axis: 'x',
                      cursor: contextMenuPosRef.current,
                    });
                    setInsertCount(2);
                    setIsInsertDialogOpen(true);
                  }}
                >
                  Insert N Cols...
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSeparator />

            {/* ▼ Delete Menu Items (Red color for destructive action) */}
            <ContextMenuItem
              onClick={() =>
                handleAttemptDelete('y', 1, contextMenuPosRef.current)
              }
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete 1 Row
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() =>
                handleAttemptDelete('x', 1, contextMenuPosRef.current)
              }
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete 1 Column
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuSub>
              <ContextMenuSubTrigger>Delete Multiple...</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem
                  onClick={() => {
                    setDeleteCountDialogConfig({
                      axis: 'y',
                      cursor: contextMenuPosRef.current,
                    });
                    setDeleteCountInput(2);
                  }}
                >
                  Delete N Rows...
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    setDeleteCountDialogConfig({
                      axis: 'x',
                      cursor: contextMenuPosRef.current,
                    });
                    setDeleteCountInput(2);
                  }}
                >
                  Delete N Cols...
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>

        {/* --- Right Sidebar (Properties) --- */}
        {selectedNodeId ? (
          <aside className="w-80 bg-sidebar border-l border-sidebar-border p-4 overflow-y-auto shadow-xl z-20 h-full">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-4 h-4" />
              <h2 className="text-sm font-semibold">Properties</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="label">Label Text</Label>
                <Textarea
                  id="label"
                  value={(selectedNode?.data.label as string) || ''}
                  onFocus={() => takeSnapshot(nodes, edges)}
                  onChange={(e) => updateNodeData('label', e.target.value)}
                  className="bg-background"
                />
              </div>
              {selectedNode?.type === 'bpmnMessaging' && (
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  <Input
                    id="assignee"
                    placeholder="e.g. Sales Team"
                    value={(selectedNode?.data.assignee as string) || ''}
                    onFocus={() => takeSnapshot(nodes, edges)}
                    onChange={(e) => updateNodeData('assignee', e.target.value)}
                    className="bg-background"
                  />
                </div>
              )}

              {selectedNode?.type === 'bpmnJump' && (
                <div className="space-y-2">
                  <Label htmlFor="jumpId">Link ID (e.g. "A")</Label>
                  <Input
                    id="jumpId"
                    placeholder="A"
                    maxLength={3}
                    value={(selectedNode?.data.label as string) || ''}
                    onFocus={() => takeSnapshot(nodes, edges)}
                    onChange={(e) => updateNodeData('label', e.target.value)}
                    className="bg-background font-mono uppercase"
                  />
                  <p className="text-[10px] text-background">
                    Must match on both To/From nodes.
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  placeholder="Enter detailed description..."
                  className="min-h-[100px] bg-background resize-none"
                  value={(selectedNode?.data.description as string) || ''}
                  onFocus={() => takeSnapshot(nodes, edges)}
                  onChange={(e) =>
                    updateNodeData('description', e.target.value)
                  }
                />
              </div>

              {/* ▼ スイムレーン専用: カラー設定 */}
              {selectedNode?.type === 'bpmnSwimlane' && (
                <div className="space-y-3">
                  <Label>Header Color</Label>

                  {/* プリセットカラー */}
                  <div className="flex flex-wrap gap-2">
                    {LANE_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c || 'default'}
                        className={cn(
                          'w-6 h-6 rounded-full border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 ring-primary',
                          // 現在の色と一致するか判定
                          selectedNode.data.color === c ||
                            (!selectedNode.data.color && c === '')
                            ? 'ring-2 ring-offset-2 ring-primary'
                            : '',
                        )}
                        style={{ backgroundColor: c || 'hsl(var(--muted))' }}
                        onClick={() => updateNodeData('color', c)}
                        title={c ? c : 'Default'}
                      />
                    ))}
                  </div>

                  {/* カスタムカラーピッカー */}
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="color"
                      className="w-12 h-8 p-0 border-0"
                      value={(selectedNode.data.color as string) || '#ffffff'}
                      onFocus={() => takeSnapshot(nodes, edges)}
                      onChange={(e) => updateNodeData('color', e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">
                      Custom Hex
                    </span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        ) : selectedEdge ? (
          // ▼ エッジ選択時のプロパティ
          <aside className="w-80 bg-sidebar border-l border-sidebar-border p-4 overflow-y-auto shadow-xl z-20 h-full animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-4 h-4" />
              <h2 className="text-sm font-semibold">Edge Properties</h2>
            </div>

            <div className="space-y-5">
              <div className="p-2 bg-muted/50 rounded border border-border text-[10px] text-muted-foreground font-mono break-all">
                ID: {selectedEdge.id}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edge-label">Label Text</Label>
                <Input
                  id="edge-label"
                  placeholder="e.g. Yes, No, OK"
                  value={(selectedEdge.label as string) || ''}
                  onFocus={() => takeSnapshot(nodes, edges)}
                  onChange={(e) => updateEdgeLabel(e.target.value)}
                  className="bg-background"
                />
                <p className="text-[10px] text-muted-foreground">
                  Text displayed on the connection line.
                </p>
              </div>
            </div>
          </aside>
        ) : (
          <div className="hidden w-0 lg:flex lg:w-4 border-l border-sidebar-border bg-sidebar" />
        )}
      </div>

      {/* Export Json dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="min-w-[80vh] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Export Flow Data</DialogTitle>
            <DialogDescription>
              Raw JSON data for the current flow version.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden relative border rounded-md">
            <div className="absolute inset-0 overflow-auto">
              <CodeBlock
                code={exportedJson}
                language="json"
                fileName={`${flowTitle || 'flow-data'}_${version}.json`}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import JSON Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import JSON</DialogTitle>
            <DialogDescription>
              Paste the JSON content of a flow to restore it. This will
              overwrite current changes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"graphData": ...}'
              className="h-48 font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ▼ Insert Dialog */}
      <Dialog open={isInsertDialogOpen} onOpenChange={setIsInsertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Insert {insertConfig?.axis === 'x' ? 'Columns' : 'Rows'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Number of units to insert</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={insertCount}
                onFocus={() => takeSnapshot(nodes, edges)}
                onChange={(e) =>
                  setInsertCount(parseInt(e.target.value, 10) || 1)
                }
              />
              <p className="text-xs text-muted-foreground">
                1 unit ={' '}
                {insertConfig?.axis === 'x'
                  ? `${SLOT_WIDTH}px`
                  : `${SLOT_HEIGHT}px`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInsertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={executeInsertFromDialog}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Count Dialog (N個入力用) */}
      <Dialog
        open={!!deleteCountDialogConfig}
        onOpenChange={(open) => !open && setDeleteCountDialogConfig(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete Multiple{' '}
              {deleteCountDialogConfig?.axis === 'x' ? 'Columns' : 'Rows'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Number of units to delete</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={deleteCountInput}
                onFocus={() => takeSnapshot(nodes, edges)}
                onChange={(e) =>
                  setDeleteCountInput(parseInt(e.target.value, 10) || 1)
                }
              />
              <p className="text-xs text-muted-foreground">
                1 unit ={' '}
                {deleteCountDialogConfig?.axis === 'x'
                  ? `${SLOT_WIDTH}px`
                  : `${SLOT_HEIGHT}px`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCountDialogConfig(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={proceedToDeleteCheck}>
              Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ▼ Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!deleteAlertConfig}
        onOpenChange={(open) => !open && setDeleteAlertConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Warning: Nodes will be deleted
            </AlertDialogTitle>
            <AlertDialogDescription>
              There are <strong>{deleteAlertConfig?.affectedNodes}</strong>{' '}
              node(s) or event(s) starting in the selected area.
              <br className="mb-2" />
              Continuing will <strong>permanently delete</strong> these nodes
              and shift the remaining content. This action cannot be undone
              easily.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAlertConfig) {
                  executeDelete(
                    deleteAlertConfig.axis,
                    deleteAlertConfig.thresholdStart,
                    deleteAlertConfig.deleteSize,
                  );
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper Components
const PaletteSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 w-full items-center">
    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
      {title}
    </span>
    {children}
  </div>
);

// --- Sub Component: Palette Item ---
interface PaletteItemProps {
  type: string;
  subType?: string;
  label: string;
  icon: React.ReactNode;
  onDragStart: (
    e: React.DragEvent,
    type: string,
    label: string,
    subType?: string,
  ) => void;
}
const PaletteItem = ({
  type,
  subType,
  label,
  icon,
  onDragStart,
}: PaletteItemProps) => (
  <div
    className="cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 group text-center w-full"
    onDragStart={(e) => onDragStart(e, type, label, subType)}
    draggable
  >
    <div className="w-10 h-10 rounded border border-border bg-card flex items-center justify-center group-hover:border-primary group-hover:shadow-sm transition-all text-muted-foreground group-hover:text-primary">
      {icon}
    </div>
    <span className="text-[9px] text-muted-foreground font-medium leading-tight">
      {label}
    </span>
  </div>
);
