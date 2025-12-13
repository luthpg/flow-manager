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

// --- Common: 4-Direction Handles ---
const NodeHandles = () => {
  const handleClass = cn(
    'w-3 h-3 bg-muted-foreground border-2 border-background',
    'transition-opacity duration-200',
    'opacity-0 group-hover:opacity-100', // Show on hover
  );
  return (
    <>
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

// 1. Task Node
export const BpmnTaskNode = memo(({ data, selected }: NodeProps<Node>) => (
  <div
    className={cn(
      'relative flex flex-col justify-center items-center p-2 rounded-lg shadow-sm transition-all group',
      'w-[140px] h-[60px] bg-card border-2',
      selected
        ? 'border-primary shadow-md ring-2 ring-primary/20'
        : 'border-border hover:border-primary/50',
    )}
  >
    <NodeHandles />
    <div className="whitespace-pre-wrap text-xs font-medium text-card-foreground line-clamp-2 leading-tight text-center">
      {(data.label as string) ?? 'Task'}
    </div>
  </div>
));

// 2. Gateway Node
export const BpmnGatewayNode = memo(({ data, selected }: NodeProps<Node>) => {
  const type = (data.gatewayType as string) || 'exclusive';
  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
      <NodeHandles />
      <div
        className={cn(
          'w-11 h-11 border-2 rotate-45 shadow-sm flex items-center justify-center transition-colors bg-card',
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
      <div className="whitespace-pre-wrap absolute -bottom-6 w-[100px] text-center text-[10px] text-muted-foreground font-medium truncate">
        {data.label as string}
      </div>
    </div>
  );
});

// 3. Event Node
export const BpmnEventNode = memo(({ data, selected }: NodeProps<Node>) => {
  const isEnd = data.eventType === 'end';
  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
      <NodeHandles />
      <div
        className={cn(
          'w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all bg-card',
          isEnd
            ? 'border-4 border-foreground'
            : 'border-2 border-foreground/70',
          selected && 'border-primary ring-4 ring-primary/20',
        )}
      />
      <div className="whitespace-pre-wrap absolute -bottom-5 w-20 text-center text-[10px] text-muted-foreground font-medium">
        {(data.label as string) || (isEnd ? 'End' : 'Start')}
      </div>
    </div>
  );
});

// 4. Messaging Node
export const BpmnMessagingNode = memo(({ data, selected }: NodeProps<Node>) => {
  const msgType = (data.messageType as string) || 'send';
  return (
    <div
      className={cn(
        'relative flex flex-col justify-center p-2 border-2 rounded-lg shadow-sm transition-all group',
        'w-[140px] h-[60px] bg-card',
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
      <div className="whitespace-pre-wrap text-xs font-medium text-card-foreground line-clamp-2 leading-tight text-center">
        {(data.label as string) || 'Message'}
      </div>
    </div>
  );
});

// 5. Jump Node
export const BpmnJumpNode = memo(({ data, selected }: NodeProps<Node>) => {
  const jumpType = (data.jumpType as string) || 'source';
  const linkId = (data.label as string) || '?';
  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
      <NodeHandles />
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm bg-card',
          jumpType === 'source'
            ? 'border-[3px] border-foreground'
            : 'border-2 border-muted-foreground border-dashed',
          selected && 'border-primary ring-4 ring-primary/20 border-solid',
          jumpType === 'source' &&
            'group-hover/jump:scale-110 group-hover/jump:border-primary group-hover/jump:text-primary',
        )}
      >
        {jumpType === 'source' ? (
          <ArrowRight className="w-5 h-5" strokeWidth={3} />
        ) : (
          <ArrowBigRight className="w-5 h-5" />
        )}
      </div>
      <div className="absolute -bottom-5 w-[60px] text-center">
        <span className="whitespace-pre-wrap bg-muted text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded border border-border">
          {linkId}
        </span>
      </div>
    </div>
  );
});

// 6. Decision Node
export const BpmnDecisionNode = memo(({ data, selected }: NodeProps<Node>) => (
  <div
    className={cn(
      'relative flex items-center justify-center group w-[140px] h-[60px]',
    )}
  >
    <NodeHandles />
    <svg
      className="absolute inset-0 w-full h-full overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M70 0 L140 30 L70 60 L0 30 Z"
        className={cn(
          'fill-card stroke-2 transition-colors',
          selected
            ? 'stroke-primary'
            : 'stroke-border group-hover:stroke-primary/50',
        )}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
    {selected && (
      <div className="absolute inset-2 border-2 border-primary/20 rounded-sm" />
    )}
    <div className="relative z-10 px-6 w-full text-center">
      <div className="whitespace-pre-wrap text-xs font-medium text-card-foreground line-clamp-2 leading-tight">
        {(data.label as string) || '?'}
      </div>
    </div>
  </div>
));

// 7. Swimlane Node
export const BpmnSwimlaneNode = memo(
  ({ id, data, selected }: NodeProps<Node>) => {
    const { setNodes } = useReactFlow();
    const orientation = data.orientation || 'horizontal';
    const isHorizontal = orientation === 'horizontal';
    const nodeRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
      nodeRef.current
        ?.closest('.react-flow__node-bpmnSwimlane')
        ?.classList.remove('nopan');
    });

    const handleResize: OnResize = useCallback(
      (_, params) => {
        const { width, height } = params;
        const snappedWidth = Math.max(
          SLOT_WIDTH,
          Math.round(width / SLOT_WIDTH) * SLOT_WIDTH,
        );
        const snappedHeight = Math.max(
          SLOT_HEIGHT,
          Math.round(height / SLOT_HEIGHT) * SLOT_HEIGHT,
        );
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id
              ? {
                  ...n,
                  style: {
                    ...n.style,
                    width: snappedWidth,
                    height: snappedHeight,
                  },
                }
              : n,
          ),
        );
      },
      [id, setNodes],
    );

    const color = data.color as string;
    const headerStyle = color
      ? { backgroundColor: color, color: '#ffffff', borderColor: color }
      : {};

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
          ref={nodeRef}
          className={cn(
            'relative flex w-full h-full border-2 transition-all group box-border bg-background/50',
            selected ? 'border-primary shadow-sm' : 'border-border',
            isHorizontal ? 'flex-row' : 'flex-col',
          )}
          style={{ width: '100%', height: '100%' }}
        >
          <div
            className={cn(
              'lane-drag-handle flex items-center justify-center border-border select-none shrink-0 transition-colors cursor-grab active:cursor-grabbing',
              !color && 'bg-muted text-muted-foreground',
              isHorizontal
                ? 'w-[90px] h-full border-r'
                : 'w-full h-[90px] border-b',
            )}
            style={headerStyle}
          >
            <span
              className="text-sm font-bold tracking-wider whitespace-nowrap overflow-hidden text-ellipsis px-2 pointer-events-none"
              style={
                isHorizontal
                  ? { writingMode: 'vertical-rl', textOrientation: 'mixed' }
                  : {}
              }
            >
              {(data.label as string) || 'Lane'}
            </span>
          </div>
          <div className="flex-1 relative min-w-0 min-h-0" />
        </div>
      </>
    );
  },
);

// Helper Icon
export const BpmnMailIcon = ({
  className,
  isFilled,
}: {
  className?: string;
  isFilled: boolean;
}) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('pointer-events-none', className)}
  >
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
    <path
      d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
      className={cn(
        'stroke-2 fill-none transition-colors',
        isFilled ? 'stroke-background' : 'stroke-foreground',
      )}
    />
  </svg>
);

// 8. Message Event Node
export const BpmnMessageEventNode = memo(
  ({ id, data, selected }: NodeProps<Node>) => {
    const edges = useEdges();
    const typeStr = ((data.messageType as string) || 'send').toLowerCase();
    const isSend = typeStr !== 'receive';
    const isEnd = !!data.isEnd;
    const hasData = !!data.hasData;

    const connectedDataEdge = edges.find(
      (e) =>
        e.source === id &&
        (e.sourceHandle === 'data-top' || e.sourceHandle === 'data-bottom'),
    );
    const dataHandlePosition =
      connectedDataEdge?.sourceHandle === 'data-top' ? 'top' : 'bottom';
    const labelPosition = hasData
      ? dataHandlePosition === 'top'
        ? 'bottom'
        : 'top'
      : 'bottom';

    return (
      <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
        <NodeHandles />
        <div
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center transition-all relative z-10 bg-background',
            isEnd ? 'border-4 border-foreground' : 'border-2 border-foreground',
            selected && 'ring-4 ring-primary/20',
          )}
        >
          {!isEnd && (
            <div className="absolute inset-0 rounded-full border border-foreground m-0.5 pointer-events-none" />
          )}
          <div className="transform scale-125 flex items-center justify-center">
            <BpmnMailIcon isFilled={isSend} />
          </div>
        </div>
        {hasData && (
          <>
            <Handle
              type="source"
              position={Position.Top}
              id="data-top"
              className="w-4 h-4 bg-transparent border-none -top-2.5 z-20"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="data-bottom"
              className="w-4 h-4 bg-transparent border-none -bottom-2.5 z-20"
            />
            <div
              className={cn(
                'absolute w-3 h-3 bg-background border border-foreground rounded-full z-20 pointer-events-none',
                dataHandlePosition === 'top' ? '-top-2' : '-bottom-2',
              )}
            />
          </>
        )}
        <div
          className={cn(
            'whitespace-pre-wrap absolute w-40 text-center text-[11px] leading-tight truncate px-1',
            !isSend
              ? 'text-muted-foreground font-medium'
              : 'text-red-600 font-bold',
            labelPosition === 'top' ? '-top-8' : '-bottom-8',
          )}
        >
          {data.label as string}
        </div>
      </div>
    );
  },
);

// 9. Annotation Node
export const BpmnAnnotationNode = memo(
  ({ id, data, selected }: NodeProps<Node>) => {
    const { setNodes } = useReactFlow();
    const edges = useEdges();
    const connectedEdge = edges.find((e) => e.source === id || e.target === id);
    let borderClass = 'border-l-4';

    if (connectedEdge) {
      const handleId =
        connectedEdge.source === id
          ? connectedEdge.sourceHandle
          : connectedEdge.targetHandle;
      if (handleId === 'top') borderClass = 'border-t-4';
      else if (handleId === 'right') borderClass = 'border-r-4';
      else if (handleId === 'bottom') borderClass = 'border-b-4';
    }

    const handleChange = useCallback(
      (evt: ChangeEvent<HTMLTextAreaElement>) => {
        const val = evt.target.value;
        setNodes((nodes) =>
          nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, label: val } } : n,
          ),
        );
      },
      [id, setNodes],
    );

    const handleClass =
      'w-2 h-2 bg-primary border border-background opacity-0 group-hover:opacity-100 transition-opacity';

    return (
      <div className="group w-full h-full relative">
        <NodeResizeControl
          minWidth={100}
          minHeight={50}
          style={{ background: 'transparent', border: 'none' }}
        >
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-sm cursor-se-resize z-20" />
        </NodeResizeControl>
        <div
          className={cn(
            'relative w-full h-full flex flex-col box-border bg-blue-100/50 rounded-sm shadow-sm border-blue-400 transition-all',
            borderClass,
            selected && 'ring-2 ring-primary/30',
          )}
        >
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
          <textarea
            className="w-full h-full resize-none bg-transparent border-none p-2 text-xs text-slate-700 focus:ring-0 focus:outline-none nodrag cursor-text"
            placeholder="Add comment..."
            value={(data.label as string) || ''}
            onChange={handleChange}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  },
);

// 10. Database Node
export const BpmnDatabaseNode = memo(({ data, selected }: NodeProps<Node>) => (
  <div className="relative w-[140px] h-[60px] flex items-center justify-center group">
    <NodeHandles />
    <svg
      width="140"
      height="60"
      viewBox="0 0 140 60"
      className="pointer-events-none overflow-visible"
    >
      <path
        d="M 10 12 v 36 c 0 8 120 8 120 0 v -36"
        className={cn(
          'stroke-2 transition-colors fill-background stroke-foreground',
          selected && 'stroke-primary',
        )}
      />
      <ellipse
        cx="70"
        cy="12"
        rx="60"
        ry="6"
        className={cn(
          'stroke-2 transition-colors fill-background stroke-foreground',
          selected && 'stroke-primary',
        )}
      />
    </svg>
    {selected && (
      <div className="absolute inset-2 rounded-sm ring-2 ring-primary/20 pointer-events-none" />
    )}
    <div className="absolute inset-0 flex items-center justify-center px-4 pt-2">
      <span className="whitespace-pre-wrap text-center text-[13.5px] text-muted-foreground font-medium truncate line-clamp-2 leading-tight">
        {(data.label as string) || 'Data Store'}
      </span>
    </div>
  </div>
));

// 11. Timer Node
export const BpmnTimerEventNode = memo(
  ({ data, selected }: NodeProps<Node>) => {
    const isIntermediate =
      (data.timerType || 'intermediate') === 'intermediate';
    return (
      <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
        <NodeHandles />
        <div
          className={cn(
            'flex items-center justify-center transition-all relative z-10 rounded-full bg-background',
            isIntermediate
              ? 'w-[60px] h-[60px] border-2 border-foreground'
              : 'w-auto h-auto border-none',
            selected && 'ring-4 ring-primary/20',
          )}
        >
          <Clock
            className={cn(
              'text-foreground',
              isIntermediate ? 'w-14 h-14' : 'w-[58px] h-[58px]',
            )}
            strokeWidth={1}
          />
        </div>
        <div className="whitespace-pre-wrap absolute -bottom-5 w-24 text-center text-[10px] text-muted-foreground font-medium truncate">
          {(data.label as string) || 'Timer'}
        </div>
      </div>
    );
  },
);

// 12. Arrow Node
export const BpmnArrowNode = memo(({ id, data, selected }: NodeProps<Node>) => {
  const { setNodes } = useReactFlow();
  const handleResize: OnResize = useCallback(
    (_, params) => {
      const { width, height } = params;
      const snappedWidth = Math.max(
        SLOT_WIDTH,
        Math.round(width / SLOT_WIDTH) * SLOT_WIDTH,
      );
      const snappedHeight = Math.max(
        SLOT_HEIGHT,
        Math.round(height / SLOT_HEIGHT) * SLOT_HEIGHT,
      );
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                style: {
                  ...n.style,
                  width: snappedWidth,
                  height: snappedHeight,
                },
              }
            : n,
        ),
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
          'relative flex items-center justify-center p-2 transition-all group bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
          '[clip-path:polygon(0%_0%,calc(100%-20px)_0%,100%_50%,calc(100%-20px)_100%,0%_100%)]',
          selected
            ? 'filter-[drop-shadow(0_0_2px_#3b82f6)]'
            : 'filter-[drop-shadow(0_0_1px_#94a3b8)]',
        )}
        style={{ width: '100%', height: '100%' }}
      >
        <span className="truncate px-2 pr-6 text-sm font-medium leading-tight w-full text-center">
          {(data.label as string) || 'Step'}
        </span>
      </div>
    </>
  );
});
