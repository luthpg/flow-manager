import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate, useParams } from '@ciderjs/city-gas/react';
import { ArrowLeft, Save, Send, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

// Custom Components
import {
  BpmnAnnotationNode,
  BpmnArrowNode,
  BpmnDatabaseNode,
  BpmnDecisionNode,
  BpmnEventNode,
  BpmnGatewayNode,
  BpmnJumpNode,
  BpmnMessageEventNode,
  BpmnMessagingNode,
  BpmnSwimlaneNode,
  BpmnTaskNode,
  BpmnTimerEventNode,
} from '@/components/custom-nodes';
import { FlowPalette } from '@/components/flow/palette';
import { PropertiesPanel } from '@/components/flow/properties-panel';
import { ModeToggle } from '@/components/mode-toggle';
import { SheetTabs } from '@/components/sheet-tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

import { autoFormatGraph, validateBPMN } from '@/lib/bpmn-logic';
import { GRID_SIZE, OFFSET_Y, SLOT_HEIGHT, SLOT_WIDTH } from '@/lib/constants';
import { serverScripts } from '@/lib/server';
import { useFlowStore } from '@/store/flow-store';
import type { ApiResponse } from '~/types/appsscript/server';
import type { FlowData, FlowStatus } from '~/types/flow';

// Helper: Snap to Slot Logic
const snapToSlot = (x: number, y: number, type: string) => {
  if (type === 'bpmnSwimlane' || type === 'bpmnArrow') {
    return {
      x: Math.round(x / SLOT_WIDTH) * SLOT_WIDTH,
      y: Math.round(y / SLOT_HEIGHT) * SLOT_HEIGHT,
    };
  }
  if (['bpmnAnnotation', 'bpmnArrow'].includes(type)) {
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE,
    };
  }
  // Standard Nodes (Center of Slot)
  const isWide = [
    'bpmnTask',
    'bpmnMessaging',
    'bpmnDecision',
    'bpmnDatabase',
  ].includes(type);
  const nodeWidth = isWide ? 140 : 60;
  const offsetX = (SLOT_WIDTH - nodeWidth) / 2;
  const slotX = Math.round((x - offsetX) / SLOT_WIDTH);
  const slotY = Math.round((y - OFFSET_Y) / SLOT_HEIGHT);
  return {
    x: slotX * SLOT_WIDTH + offsetX,
    y: slotY * SLOT_HEIGHT + OFFSET_Y,
  };
};

export default function FlowEditorPage() {
  const { id, version } = useParams('/flow/[id]/[version]/edit');
  return (
    <ReactFlowProvider>
      <FlowEditorContent id={id} version={version} />
    </ReactFlowProvider>
  );
}

function FlowEditorContent({ id, version }: { id: string; version: string }) {
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, deleteElements } = useReactFlow();

  // --- Store Selectors ---
  const {
    sheets,
    activeSheetId,
    nodes,
    edges,
    initializeFlow,
    setActiveSheetId,
    addSheet,
    removeSheet,
    renameSheet,
    reorderSheets,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setNodes,
    takeSnapshot,
    undo,
    redo,
  } = useFlowStore(
    useShallow((state) => {
      const activeSheet = state.sheets.find(
        (s) => s.id === state.activeSheetId,
      );
      return {
        sheets: state.sheets,
        activeSheetId: state.activeSheetId,
        nodes: activeSheet?.nodes || [],
        edges: activeSheet?.edges || [],
        initializeFlow: state.initializeFlow,
        setActiveSheetId: state.setActiveSheetId,
        addSheet: state.addSheet,
        removeSheet: state.removeSheet,
        renameSheet: state.renameSheet,
        reorderSheets: state.reorderSheets,
        onNodesChange: state.onNodesChange,
        onEdgesChange: state.onEdgesChange,
        onConnect: state.onConnect,
        addNode: state.addNode,
        setNodes: state.setNodes,
        takeSnapshot: state.takeSnapshot,
        undo: state.undo,
        redo: state.redo,
      };
    }),
  );

  const [loading, setLoading] = useState(true);
  const [flowTitle, setFlowTitle] = useState('');
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('DRAFT');

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

  // --- Initialization ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await serverScripts.getFlowData(id, version);
        const res = JSON.parse(json) as ApiResponse<FlowData>;
        if (res.success && res.data) {
          setFlowTitle(res.data.meta.title);
          setFlowStatus(res.data.meta.currentStatus);
          initializeFlow(res.data.graphData);
        } else {
          toast.error('Failed to load flow');
        }
      } catch (_e) {
        toast.error('Connection error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, version, initializeFlow]);

  // --- Handlers ---

  const onDragStart = (
    e: React.DragEvent,
    type: string,
    label: string,
    subType?: string,
  ) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.setData('application/label', label);
    if (subType) e.dataTransfer.setData('application/subtype', subType);
    e.dataTransfer.effectAllowed = 'move';
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

      const { x, y } = snapToSlot(position.x, position.y, type);
      takeSnapshot();

      // Node Data construction
      const nodeData: any = { label };
      let initialStyle = {};

      if (type === 'bpmnSwimlane') {
        const isHorizontal = subType === 'horizontal';
        nodeData.orientation = subType;
        initialStyle = {
          width: isHorizontal ? SLOT_WIDTH * 10 : SLOT_WIDTH * 2,
          height: isHorizontal ? SLOT_HEIGHT * 2 : SLOT_HEIGHT * 10,
          zIndex: -1,
        };
      } else {
        nodeData.gatewayType = type === 'bpmnGateway' ? subType : undefined;
        nodeData.messageType =
          type === 'bpmnMessage'
            ? subType?.includes('send')
              ? 'send'
              : 'receive'
            : undefined;
        nodeData.isEnd = subType?.includes('end');
        nodeData.eventType = type === 'bpmnEvent' ? subType : undefined;
        nodeData.timerType = type === 'bpmnTimer' ? subType : undefined;
        nodeData.jumpType = type === 'bpmnJump' ? subType : undefined;
      }

      addNode({
        id: crypto.randomUUID(),
        type,
        position: { x, y },
        style: initialStyle,
        data: nodeData,
        dragHandle: type === 'bpmnSwimlane' ? '.lane-drag-handle' : undefined,
      });
    },
    [screenToFlowPosition, addNode, takeSnapshot],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSave = async () => {
    const currentState = useFlowStore.getState();
    const promise = async () => {
      const json = await serverScripts.saveDraft({
        flowId: id,
        title: flowTitle,
        graphData: {
          sheets: currentState.sheets,
          activeSheetId: currentState.activeSheetId,
        },
      });
      const res = JSON.parse(json);
      if (!res.success) throw new Error(res.error);
      if (res.data.versionId !== version) {
        navigate(
          '/flow/[id]/[version]/edit',
          { id, version: res.data.versionId },
          { replace: true },
        );
      }
    };
    toast.promise(promise(), {
      loading: 'Saving...',
      success: 'Draft saved',
      error: 'Save failed',
    });
  };

  const handleFormat = () => {
    const formatted = autoFormatGraph(nodes);
    setNodes(formatted);
    const result = validateBPMN(formatted, edges);
    if (result.isValid) toast.success('Formatted & Validated');
    else
      toast.warning('Warnings found', {
        description: result.messages.join('\n'),
      });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-4 bg-background z-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Input
              value={flowTitle}
              onChange={(e) => setFlowTitle(e.target.value)}
              className="h-8 border-none text-lg font-bold px-0 focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{flowStatus}</Badge>
              <span>ver: {version}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={undo} title="Undo">
            <span className="text-lg">↩</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} title="Redo">
            <span className="text-lg">↪</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFormat}
            title="Auto Format"
          >
            <Wand2 className="w-5 h-5" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <ModeToggle />
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
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4" /> Submit
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Palette */}
        <FlowPalette onDragStart={onDragStart} />

        {/* Center Canvas */}
        <main
          className="flex-1 flex flex-col relative bg-muted/20"
          ref={reactFlowWrapper}
        >
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeDragStart={() => takeSnapshot()}
              snapToGrid
              snapGrid={[GRID_SIZE, GRID_SIZE]}
              minZoom={0.2}
              maxZoom={3.0}
              selectionMode={SelectionMode.Partial}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
          <SheetTabs
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSwitch={setActiveSheetId}
            onAdd={addSheet}
            onRemove={removeSheet}
            onRename={renameSheet}
            onReorder={reorderSheets}
          />
        </main>

        {/* Right Properties Panel */}
        <PropertiesPanel />
      </div>
    </div>
  );
}
