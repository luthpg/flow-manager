import { useParams } from '@ciderjs/city-gas/react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  BpmnAnnotationNode,
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
import { ViewerHeader } from '@/components/flow/viewer-header';
import { ViewerSidebar } from '@/components/flow/viewer-sidebar';
import { SheetTabs } from '@/components/sheet-tabs';
import { useTheme } from '@/components/theme-provider';
import useIsMobile from '@/hooks/is-mobile';
import { useViewerStore } from '@/store/viewer-store';
import '@xyflow/react/dist/style.css';

export default function ViewerPage() {
  const { id, version, sheetId } = useParams('/flow/[id]/[version]/preview');
  return (
    <ReactFlowProvider>
      <ViewerLayout id={id} version={version} sheetId={sheetId} />
    </ReactFlowProvider>
  );
}

function ViewerLayout({
  id,
  version,
  sheetId,
}: {
  id: string;
  version: string;
  sheetId?: string;
}) {
  const { theme } = useTheme();
  const { isMobile } = useIsMobile();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const {
    loading,
    nodes,
    edges,
    sheets,
    activeSheetId,
    initialize,
    switchSheet,
  } = useViewerStore(
    useShallow((state) => ({
      loading: state.loading,
      nodes: state.nodes,
      edges: state.edges,
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
      initialize: state.initialize,
      switchSheet: state.switchSheet,
    })),
  );

  useEffect(() => {
    initialize(id, version, sheetId);
  }, [id, version, sheetId, initialize]);

  // Visuals
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolvedTheme = isDark ? 'dark' : 'light';
  const maskColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.25)';

  const nodeTypes = useMemo(
    () => ({
      bpmnTask: BpmnTaskNode,
      bpmnGateway: BpmnGatewayNode,
      bpmnEvent: BpmnEventNode,
      bpmnMessaging: BpmnMessagingNode,
      bpmnJump: BpmnJumpNode,
      bpmnDecision: BpmnDecisionNode,
      bpmnSwimlane: BpmnSwimlaneNode,
      bpmnTimer: BpmnTimerEventNode,
      bpmnAnnotation: BpmnAnnotationNode,
      bpmnDatabase: BpmnDatabaseNode,
      bpmnMessage: BpmnMessageEventNode,
    }),
    [],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      <ViewerHeader />

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col relative bg-muted/20">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              onSelectionChange={({ nodes: selected }) => {
                setSelectedNodeId(selected[0]?.id || null);
              }}
              colorMode={resolvedTheme}
              fitView
              minZoom={0.2}
              maxZoom={3.0}
            >
              <Background
                color={isDark ? '#334155' : '#e2e8f0'}
                gap={20}
                size={1}
              />
              {!isMobile && (
                <>
                  <Controls className="bg-card! shadow-sm!" />
                  <MiniMap
                    maskColor={maskColor}
                    className="bg-card! shadow-sm!"
                  />
                </>
              )}
            </ReactFlow>
          </div>

          <SheetTabs
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSwitch={switchSheet}
            onAdd={() => {}}
            onRemove={() => {}}
            onRename={() => {}}
            onReorder={() => {}}
            readOnly={true}
          />
        </main>

        <div className="hidden md:block h-full">
          <ViewerSidebar selectedNodeId={selectedNodeId} />
        </div>
      </div>
    </div>
  );
}
