import {
  Handle,
  type Node,
  type NodeProps,
  NodeResizeControl,
  NodeResizer,
  type OnResize,
  Position,
  useEdges,
  useReactFlow,
} from '@xyflow/react';
import {
  ArrowBigRight,
  ArrowRight,
  Circle,
  Clock,
  Inbox,
  Mail,
  Plus,
  Send,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import { SLOT_HEIGHT, SLOT_WIDTH } from '@/lib/constants';
import { cn } from '@/lib/utils';

// --- 共通: 4方向の接続ハンドル ---
const NodeHandles = () => {
  const handleClass = cn(
    'w-5! h-5! bg-muted-foreground border-2! border-muted-foreground!',
    'transition-opacity duration-200', // ふわっと表示させるアニメーション
    'opacity-0 group-hover:opacity-100', // ホバー時のみ表示
  );
  return (
    <>
      {/* Top: Target & Source */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={handleClass}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={handleClass}
      />

      {/* Right: Target & Source */}
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className={handleClass}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClass}
      />

      {/* Bottom: Target & Source */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className={handleClass}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClass}
      />

      {/* Left: Target & Source */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleClass}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={handleClass}
      />
    </>
  );
};

// ==========================================================
// 1. BPMN Task Node
// ==========================================================
export interface BpmnTaskNodeParameter {
  label?: string;
}
export const BpmnTaskNode = memo(
  ({ data, selected }: NodeProps<Node & { data: BpmnTaskNodeParameter }>) => {
    return (
      <div
        className={cn(
          'relative flex flex-col justify-center items-center p-2 rounded-lg shadow-sm transition-all group',
          'w-[140px] h-[60px]',
          'bg-card border-2', // bg-white -> bg-card
          // 選択時はPrimary色、通常はBorder色
          selected
            ? 'border-primary shadow-md ring-2 ring-primary/20'
            : 'border-border hover:border-primary/50',
        )}
      >
        <NodeHandles />

        {/* Label Area */}
        <div className="whitespace-pre-wrap text-xs font-medium text-card-foreground line-clamp-2 leading-tight text-center m-0 p-0">
          {data.label ?? 'Task Name'}
        </div>
      </div>
    );
  },
);

// ==========================================================
// 2. BPMN Gateway Node
// ==========================================================
export interface BpmnGatewayNodeParameter {
  gatewayType?: 'exclusive' | 'parallel' | 'inclusive';
  label?: string;
}
export const BpmnGatewayNode = memo(
  ({
    data,
    selected,
  }: NodeProps<Node & { data: BpmnGatewayNodeParameter }>) => {
    const type = data.gatewayType || 'exclusive';

    return (
      <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
        <NodeHandles />

        {/* Diamond Shape */}
        <div
          className={cn(
            'w-11 h-11 border-2 rotate-45 shadow-sm flex items-center justify-center transition-colors',
            'bg-card',
            selected
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-foreground/60 hover:border-foreground',
          )}
        >
          <div className="-rotate-45 text-foreground/80">
            {type === 'parallel' && <Plus className="w-8 h-8" />}
            {type === 'exclusive' && <X className="w-8 h-8" />}
            {type === 'inclusive' && (
              <Circle className="w-8 h-8" strokeWidth={2} />
            )}
          </div>
        </div>

        <div className="whitespace-pre-wrap absolute -bottom-6 w-[100px] text-center text-[10px] text-muted-foreground font-medium truncate m-0 p-0">
          {data.label}
        </div>
      </div>
    );
  },
);

// ==========================================================
// 3. BPMN Event Node
// ==========================================================
export interface BpmnEventNodeParameter {
  eventType?: 'start' | 'end';
  label?: string;
}
export const BpmnEventNode = memo(
  ({ data, selected }: NodeProps<Node & { data: BpmnEventNodeParameter }>) => {
    const isEnd = data.eventType === 'end';

    return (
      <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
        <NodeHandles />

        <div
          className={cn(
            'w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all',
            'bg-card',
            isEnd
              ? 'border-4 border-foreground'
              : 'border-2 border-foreground/70',
            selected && 'border-primary ring-4 ring-primary/20',
          )}
        ></div>

        <div className="whitespace-pre-wrap absolute -bottom-5 w-20 text-center text-[10px] text-muted-foreground font-medium m-0 p-0">
          {data.label || (isEnd ? 'End' : 'Start')}
        </div>
      </div>
    );
  },
);

// ==========================================================
// 4. BPMN Messaging Task Node
// ==========================================================
export interface BpmnMessagingNodeParameter {
  messageType?: 'send' | 'receive' | 'generic';
  label?: string;
}
export const BpmnMessagingNode = memo(
  ({
    data,
    selected,
  }: NodeProps<Node & { data: BpmnMessagingNodeParameter }>) => {
    const msgType = data.messageType || 'send';

    return (
      <div
        className={cn(
          'relative flex flex-col justify-center p-2 border-2 rounded-lg shadow-sm transition-all group',
          'w-[140px] h-[60px]',
          'bg-card',
          selected
            ? 'border-primary shadow-md ring-2 ring-primary/20'
            : 'border-border hover:border-primary/50',
        )}
      >
        <NodeHandles />

        <div
          className={cn(
            'absolute top-1 left-1 p-0.5 rounded bg-muted',
            msgType === 'send' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {msgType === 'send' && <Send className="w-3.5 h-3.5" />}
          {msgType === 'receive' && <Inbox className="w-3.5 h-3.5" />}
          {msgType === 'generic' && <Mail className="w-3.5 h-3.5" />}
        </div>

        <div className="whitespace-pre-wrap text-xs font-medium text-card-foreground line-clamp-2 leading-tight text-center m-0 p-0">
          {data.label || 'Send Message'}
        </div>
      </div>
    );
  },
);

// ==========================================================
// 5. BPMN Jump Node
// ==========================================================
export interface BpmnJumpNodeParameter {
  jumpType?: 'source' | 'target';
  label?: string;
}
export const BpmnJumpNode = memo(
  ({ data, selected }: NodeProps<Node & { data: BpmnJumpNodeParameter }>) => {
    const jumpType = data.jumpType || 'source';
    const linkId = data.label || '?';
    const isClickable = jumpType === 'source';

    return (
      <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
        <NodeHandles />

        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm',
            'bg-card',
            jumpType === 'source'
              ? 'border-[3px] border-foreground'
              : 'border-2 border-muted-foreground border-dashed',
            selected && 'border-primary ring-4 ring-primary/20 border-solid',
            // ▼ ホバー時の強調 (Sourceのみ)
            isClickable &&
              'group-hover/jump:scale-110 group-hover/jump:border-primary group-hover/jump:text-primary',
          )}
        >
          {jumpType === 'source' ? (
            <ArrowRight
              className="w-5 h-5 text-foreground group-hover/jump:text-primary transition-colors"
              strokeWidth={3}
            />
          ) : (
            <ArrowBigRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="absolute -bottom-5 w-[60px] text-center">
          <span className="whitespace-pre-wrap bg-muted text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded border border-border">
            {linkId}
          </span>
        </div>

        {isClickable && selected && (
          <div className="absolute -top-8 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow border animate-in fade-in zoom-in">
            Click to Jump
          </div>
        )}
      </div>
    );
  },
);

// ==========================================================
// 6. BPMN Decision Node (New: 3x7 Grid = 140px x 60px)
//    横長の菱形・テキスト入力可能
// ==========================================================
export interface BpmnDecisionNodeParameter {
  label?: string;
}

export const BpmnDecisionNode = memo(
  ({
    data,
    selected,
  }: NodeProps<Node & { data: BpmnDecisionNodeParameter }>) => {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center group',
          'w-[140px] h-[60px]', // 3x7 Grid
        )}
      >
        <NodeHandles />

        {/* Diamond Shape using SVG for better border control */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>condition diamond</title>
          <path
            d="M70 0 L140 30 L70 60 L0 30 Z"
            className={cn(
              'fill-card stroke-2 transition-colors',
              selected
                ? 'stroke-primary'
                : 'stroke-border group-hover:stroke-primary/50',
            )}
            vectorEffect="non-scaling-stroke" // 拡大縮小しても線の太さを維持
          />
        </svg>

        {/* Selection Ring */}
        {selected && (
          <div className="absolute inset-2 border-2 border-primary/20 rounded-sm" />
        )}

        {/* Label Area (Diamondの中央に収まるようにパディング) */}
        <div className="relative z-10 px-6 w-full text-center">
          <div className="whitespace-pre-wrap text-xs font-medium text-card-foreground line-clamp-2 leading-tight wrap-break-word m-0 p-0">
            {data.label || 'Condition?'}
          </div>
        </div>
      </div>
    );
  },
);

// ==========================================================
// 7. BPMN Swimlane Node (New)
//    Resizeable, Orientation support
// ==========================================================
export interface BpmnSwimlaneNodeParameter {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  color?: string; // ヘッダー背景色 (Hex string)
}

export const BpmnSwimlaneNode = memo(
  ({
    id,
    data,
    selected,
  }: NodeProps<Node & { data: BpmnSwimlaneNodeParameter }>) => {
    const { setNodes } = useReactFlow();
    const orientation = data.orientation || 'horizontal';
    const isHorizontal = orientation === 'horizontal';

    const nodeRef = useRef<HTMLDivElement>(null);

    // ▼ nopanクラス削除ロジック
    useLayoutEffect(() => {
      if (nodeRef.current) {
        // React Flowのノードラッパー（親要素）を取得
        const wrapper = nodeRef.current.closest(
          '.react-flow__node-bpmnSwimlane',
        );
        if (wrapper) {
          wrapper.classList.remove('nopan');
        }
      }
    });

    // ▼ リサイズ時のスナップ処理
    const handleResize: OnResize = useCallback(
      (_, params) => {
        const { width, height } = params;

        // 幅のスナップ計算 (180px単位)
        const snappedWidth = Math.max(
          SLOT_WIDTH,
          Math.round(width / SLOT_WIDTH) * SLOT_WIDTH,
        );

        // 高さのスナップ計算 (100px単位)
        const snappedHeight = Math.max(
          SLOT_HEIGHT,
          Math.round(height / SLOT_HEIGHT) * SLOT_HEIGHT,
        );

        // ノードの状態を更新
        setNodes((nodes) =>
          nodes.map((n) => {
            if (n.id === id) {
              return {
                ...n,
                style: {
                  ...n.style,
                  width: snappedWidth,
                  height: snappedHeight,
                },
              };
            }
            return n;
          }),
        );
      },
      [id, setNodes],
    );

    // ▼ カラー設定がある場合のスタイル
    // colorが指定されていればその色を使用、なければクラス(bg-muted)の色が適用される
    const headerStyle = data.color
      ? {
          backgroundColor: data.color,
          color: '#ffffff', // カスタム色の場合は白文字にする（簡易的なコントラスト確保）
          borderColor: data.color,
        }
      : {};

    return (
      <>
        {/* === Resizer === */}
        <NodeResizer
          isVisible={selected}
          minWidth={SLOT_WIDTH}
          minHeight={SLOT_HEIGHT}
          onResize={handleResize}
          lineClassName="border-primary"
          handleClassName="h-3 w-3 bg-primary border-2 border-background"
        />

        {/* === Node Main Container === */}
        <div
          ref={nodeRef}
          className={cn(
            'relative flex w-full h-full border-2 transition-all group box-border',
            'bg-background/50',
            selected ? 'border-primary shadow-sm' : 'border-border',
            isHorizontal ? 'flex-row' : 'flex-col',
          )}
          style={{ width: '100%', height: '100%' }}
        >
          {/* --- Header Area (Title Zone) --- */}
          <div
            className={cn(
              'lane-drag-handle',
              'flex items-center justify-center border-border select-none shrink-0 transition-colors cursor-grab active:cursor-grabbing',
              // 色指定がない場合のデフォルトクラス
              !data.color && 'bg-muted text-muted-foreground',

              isHorizontal
                ? 'w-[90px] h-full border-r'
                : 'w-full h-[90px] border-b',
            )}
            style={headerStyle}
          >
            <span
              className={cn(
                'text-sm font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis px-2 pointer-events-none',
              )}
              style={
                isHorizontal
                  ? { writingMode: 'vertical-rl', textOrientation: 'mixed' }
                  : {}
              }
            >
              {data.label || 'Lane'}
            </span>
          </div>

          {/* --- Content Area --- */}
          <div className="flex-1 relative min-w-0 min-h-0 " />
        </div>
      </>
    );
  },
);

// ==========================================================
// Helper: BPMN専用 メールアイコン SVG
// ==========================================================
export const BpmnMailIcon = ({
  className,
  isFilled,
}: {
  className?: string;
  isFilled: boolean;
}) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('pointer-events-none', className)}
    >
      <title>Mail Icon</title>
      {/* 封筒の外枠 */}
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        className={cn(
          'stroke-2 transition-colors',
          isFilled
            ? 'fill-foreground stroke-foreground'
            : 'fill-background stroke-foreground',
        )}
      />
      {/* 封筒のベロ（折り返し線） */}
      <path
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
        className={cn(
          'stroke-2 fill-none transition-colors',
          isFilled ? 'stroke-background' : 'stroke-foreground',
        )}
      />
    </svg>
  );
};

// ==========================================================
// 8. BPMN Message Event Node (3x3 Grid = 60px x 60px)
// ==========================================================
export interface BpmnMessageEventNodeParameter {
  label?: string;
  messageType?: 'send' | 'receive';
  isEnd?: boolean;
  hasData?: boolean;
}

export const BpmnMessageEventNode = memo(
  ({
    id,
    data,
    selected,
  }: NodeProps<Node & { data: BpmnMessageEventNodeParameter }>) => {
    const edges = useEdges();

    const typeStr = (data.messageType || 'send').toLowerCase();
    const isReceive = typeStr === 'receive' || typeStr === 'recieve';
    const isSend = !isReceive;
    const isEnd = data.isEnd || false;
    const hasData = data.hasData || false;

    // データ接続方向の判定 (Top or Bottom)
    const connectedDataEdge = edges.find(
      (e) =>
        e.source === id &&
        (e.sourceHandle === 'data-top' || e.sourceHandle === 'data-bottom'),
    );
    const dataHandlePosition =
      connectedDataEdge?.sourceHandle === 'data-top' ? 'top' : 'bottom';

    // ラベル位置 (データハンドルの逆)
    const labelPosition = hasData
      ? dataHandlePosition === 'top'
        ? 'bottom'
        : 'top'
      : 'bottom';

    // ▼ ラベルスタイルの決定
    const labelStyle = isReceive
      ? 'text-muted-foreground font-medium' // 受信: プレーン (標準色)
      : 'text-red-600 font-bold'; // 送信: 強調 (赤太文字)

    return (
      <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
        <NodeHandles />

        {/* --- Main Circle --- */}
        <div
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center transition-all relative z-10',
            'bg-background',
            isEnd
              ? 'border-4 border-foreground' // 終了: 太線
              : 'border-2 border-foreground', // 通常: 普通線
            selected && 'ring-4 ring-primary/20',
          )}
        >
          {/* 二重丸の表現 */}
          {!isEnd && (
            <div className="absolute inset-0 rounded-full border border-foreground m-0.5 pointer-events-none" />
          )}

          {/* メールアイコン (少し大きくする) */}
          <div className="transform scale-125 flex items-center justify-center">
            <BpmnMailIcon isFilled={isSend} />
          </div>
        </div>

        {/* --- Data Association Handles & Visuals --- */}
        {hasData && (
          <>
            {/* Functional Handles */}
            <Handle
              type="source"
              position={Position.Top}
              id="data-top"
              className="w-4 h-4 bg-transparent border-none -top-2.5 opacity-0 z-20 hover:opacity-50 hover:bg-blue-200/50 rounded-full"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="data-bottom"
              className="w-4 h-4 bg-transparent border-none -bottom-2.5 opacity-0 z-20 hover:opacity-50 hover:bg-blue-200/50 rounded-full"
            />

            {/* Visual White Circle (小さい白丸) */}
            <div
              className={cn(
                'absolute w-3 h-3 bg-background border border-foreground rounded-full z-20 pointer-events-none',
                dataHandlePosition === 'top' ? '-top-2' : '-bottom-2',
              )}
            />
          </>
        )}

        {/* --- Label --- */}
        <div
          className={cn(
            'whitespace-pre-wrap absolute w-40 text-center text-[11px] leading-tight truncate px-1',
            // ▼ スタイル適用
            labelStyle,
            labelPosition === 'top' ? '-top-8' : '-bottom-8',
          )}
        >
          {data.label}
        </div>
      </div>
    );
  },
);

// ==========================================================
// 9. BPMN Annotation Node (Resizable, Free Grid)
// ==========================================================
export interface BpmnAnnotationNodeParameter {
  label?: string; // コメント内容
}

export const BpmnAnnotationNode = memo(
  ({
    id,
    data,
    selected,
  }: NodeProps<Node & { data: BpmnAnnotationNodeParameter }>) => {
    const { setNodes } = useReactFlow();
    const edges = useEdges(); // ▼ 全エッジを取得

    // ▼ 接続方向の判定ロジック
    // 自分に繋がっている最初のエッジを探す
    const connectedEdge = edges.find((e) => e.source === id || e.target === id);

    let borderClass = 'border-l-4'; // デフォルトは左線

    if (connectedEdge) {
      // 自分が Source なのか Target なのか判定し、接続に使われている Handle ID を取得
      // (ハンドルIDは "top", "right", "bottom", "left" で定義済み)
      const handleId =
        connectedEdge.source === id
          ? connectedEdge.sourceHandle
          : connectedEdge.targetHandle;

      switch (handleId) {
        case 'top':
          borderClass = 'border-t-4';
          break;
        case 'right':
          borderClass = 'border-r-4';
          break;
        case 'bottom':
          borderClass = 'border-b-4';
          break;
        // case 'left':
        default:
          borderClass = 'border-l-4';
          break;
      }
    }

    // テキスト変更ハンドラ
    const handleChange = useCallback(
      (evt: ChangeEvent<HTMLTextAreaElement>) => {
        const val = evt.target.value;
        setNodes((nodes) =>
          nodes.map((node) => {
            if (node.id === id) {
              return { ...node, data: { ...node.data, label: val } };
            }
            return node;
          }),
        );
      },
      [id, setNodes],
    );

    // ハンドルの共通クラス
    const handleClass =
      'w-2 h-2 bg-primary border border-background opacity-0 group-hover:opacity-100 transition-opacity';

    return (
      <div className="group w-full h-full relative">
        {/* リサイズハンドル */}
        <NodeResizeControl
          minWidth={100}
          minHeight={50}
          style={{ background: 'transparent', border: 'none' }}
        >
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-sm cursor-se-resize z-20" />
        </NodeResizeControl>

        {/* Annotation Body */}
        <div
          className={cn(
            'relative w-full h-full flex flex-col box-border',
            'bg-blue-100/50 rounded-sm shadow-sm', // ベーススタイル
            borderClass, // ▼ 動的に決定したボーダークラス (border-l-4 等)
            'border-blue-400', // ボーダーの色
            'transition-all',
            selected ? 'ring-2 ring-primary/30' : '',
          )}
        >
          {/* 接続用ハンドル */}
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            className={handleClass}
            style={{ left: -3, zIndex: 10 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className={handleClass}
            style={{ right: -3, zIndex: 10 }}
          />
          <Handle
            type="source"
            position={Position.Top}
            id="top"
            className={handleClass}
            style={{ top: -3, zIndex: 10 }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className={handleClass}
            style={{ bottom: -3, zIndex: 10 }}
          />

          {/* Text Input Area */}
          <textarea
            className="w-full h-full resize-none bg-transparent border-none p-2 text-xs text-slate-700 focus:ring-0 focus:outline-none nodrag cursor-text"
            placeholder="Add comment..."
            value={data.label || ''}
            onChange={handleChange}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  },
);

// ==========================================================
// 10. BPMN Database Node (Data Store)
//    Size: 3x7 (140px x 60px)
//    Design: Simple Cylinder (Single layer)
// ==========================================================
export interface BpmnDatabaseNodeParameter {
  label?: string;
}

export const BpmnDatabaseNode = memo(
  ({
    data,
    selected,
  }: NodeProps<Node & { data: BpmnDatabaseNodeParameter }>) => {
    return (
      <div className="relative w-[140px] h-[60px] flex items-center justify-center group">
        {/* 4方向ハンドル */}
        <NodeHandles />

        {/* Cylinder Shape using SVG (Wide) */}
        <svg
          width="140"
          height="60"
          viewBox="0 0 140 60"
          className="pointer-events-none overflow-visible"
        >
          <title>database</title>
          {/* Body (側面と底面) */}
          <path
            // M 10 15: 左上の開始点 (少し内側から)
            // v 30: 下へ
            // c ...: 底面のカーブ (幅120px分)
            // v -30: 上へ戻る
            d="M 10 12 v 36 c 0 8 120 8 120 0 v -36"
            className={cn(
              'stroke-2 transition-colors',
              'fill-background stroke-foreground',
              selected && 'stroke-primary',
            )}
          />
          {/* Top (上面の楕円) */}
          <ellipse
            cx="70"
            cy="12"
            rx="60"
            ry="6"
            className={cn(
              'stroke-2 transition-colors',
              'fill-background stroke-foreground',
              selected && 'stroke-primary',
            )}
          />
        </svg>

        {/* Selection Ring */}
        {selected && (
          <div className="absolute inset-2 rounded-sm ring-2 ring-primary/20 pointer-events-none" />
        )}

        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center px-4 pt-2">
          <span className="whitespace-pre-wrap text-center text-[13.5px] text-muted-foreground font-medium truncate line-clamp-2 leading-tight">
            {data.label || 'Data Store'}
          </span>
        </div>
      </div>
    );
  },
);

// ==========================================================
// 11. BPMN Timer Event Node
//     Start (Single circle) / Intermediate (Double circle)
// ==========================================================
export interface BpmnTimerEventNodeParameter {
  label?: string;
  timerType?: 'start' | 'intermediate';
}

export const BpmnTimerEventNode = memo(
  ({
    data,
    selected,
  }: NodeProps<Node & { data: BpmnTimerEventNodeParameter }>) => {
    // デフォルトは中間イベント(待機)
    const isIntermediate =
      (data.timerType || 'intermediate') === 'intermediate';

    return (
      // ハンドル位置の基準となる60x60のコンテナ
      <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
        <NodeHandles />

        {/* Main Circle Container 
          - Start: 背景色のみ (円はアイコンが担う)
          - Intermediate: 背景色 + ボーダー (これが外側の円になる)
        */}
        <div
          className={cn(
            'flex items-center justify-center transition-all relative z-10 rounded-full',
            'bg-background', // 背景色は共通 (線が透けないように)

            // 中間タイマーの場合のみ、外枠(二重目の円)を描画
            isIntermediate
              ? 'w-[60px] h-[60px] border-2 border-foreground'
              : 'w-auto h-auto border-none', // 開始タイマーは枠なし

            selected && 'ring-4 ring-primary/20',
          )}
        >
          {/* Clock Icon 
            - Start: 枠いっぱいに大きく表示 (58px)。線の太さは細くする(1px)
            - Intermediate: 枠の中に少し小さく表示 (48px)。
          */}
          <Clock
            className={cn(
              'text-foreground',
              isIntermediate
                ? 'w-14 h-14' // 二重丸の内側
                : 'w-[58px] h-[58px]', // 一重丸そのもの
            )}
            // 通常24pxで2px相当 -> 60pxなら約0.8~1pxでバランスが取れる
            strokeWidth={1}
          />
        </div>

        {/* Label */}
        <div className="whitespace-pre-wrap absolute -bottom-5 w-24 text-center text-[10px] text-muted-foreground font-medium truncate">
          {data.label || 'Timer'}
        </div>
      </div>
    );
  },
);

// ==========================================================
// 11. 矢羽 (Arrow/Chevron) ノード
// ==========================================================
export interface BpmnArrowNodeParameter {
  label?: string;
}
export const BpmnArrowNode = memo(
  ({
    id,
    data,
    selected,
  }: NodeProps<Node & { data: BpmnArrowNodeParameter }>) => {
    const { setNodes } = useReactFlow();
    // ▼ リサイズ時のスナップ処理
    const handleResize: OnResize = useCallback(
      (_, params) => {
        const { width, height } = params;

        // 幅のスナップ計算 (180px単位)
        const snappedWidth = Math.max(
          SLOT_WIDTH,
          Math.round(width / SLOT_WIDTH) * SLOT_WIDTH,
        );

        // 高さのスナップ計算 (100px単位)
        const snappedHeight = Math.max(
          SLOT_HEIGHT,
          Math.round(height / SLOT_HEIGHT) * SLOT_HEIGHT,
        );

        // ノードの状態を更新
        setNodes((nodes) =>
          nodes.map((n) => {
            if (n.id === id) {
              return {
                ...n,
                style: {
                  ...n.style,
                  width: snappedWidth,
                  height: snappedHeight,
                },
              };
            }
            return n;
          }),
        );
      },
      [id, setNodes],
    );

    return (
      <>
        <NodeResizer
          isVisible={selected}
          minWidth={SLOT_WIDTH}
          minHeight={SLOT_HEIGHT}
          onResize={handleResize}
          lineClassName="border-primary"
          handleClassName="h-3 w-3 bg-primary border-2 border-background"
        />

        <div
          className={cn(
            // 基本レイアウト
            'relative flex items-center justify-center p-2 transition-all group',

            // 配色
            'bg-slate-100 text-slate-900',
            'dark:bg-slate-800 dark:text-slate-100',

            // ▼ 形状定義: 左端は直線(0%)、右端は20px手前から尖らせる
            // polygon(左上, 右上(20px手前), 右端(先端), 右下(20px手前), 左下)
            '[clip-path:polygon(0%_0%,calc(100%-20px)_0%,100%_50%,calc(100%-20px)_100%,0%_100%)]',

            // 枠線の表現: clip-pathでborderが消えるため drop-shadow を使用
            selected
              ? 'filter-[drop-shadow(0_0_2px_#3b82f6)_drop-shadow(0_0_3px_#60a5fa)] dark:filter-[drop-shadow(0_0_2px_#3b82f6)_drop-shadow(0_0_3px_#1e40af)]'
              : 'filter-[drop-shadow(0_0_1px_#94a3b8)] hover:filter-[drop-shadow(0_0_2px_#64748b)] dark:filter-[drop-shadow(0_0_1px_#475569)] dark:hover:filter-[drop-shadow(0_0_2px_#94a3b8)]',
          )}
          // サイズ適用
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {/* ラベルテキスト: 中央配置 */}
          {/* 矢印の先端部分(20px)に文字が被らないように右側にpaddingを入れる */}
          <span className="truncate px-2 pr-6 text-sm font-medium leading-tight w-full text-center">
            {data.label || 'Process Step'}
          </span>
        </div>
      </>
    );
  },
);
