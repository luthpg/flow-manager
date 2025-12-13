import { Settings } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/store/flow-store';

// 定義済みカラーパレット
const LANE_COLORS = [
  '',
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#64748b', // Slate
];

export const PropertiesPanel = () => {
  // Storeから選択中のノード情報を取得
  // アクティブシート内のノードから selected: true なものを探す
  const {
    selectedNode,
    selectedEdge,
    updateNodeData,
    updateEdgeLabel,
    takeSnapshot,
  } = useFlowStore(
    useShallow((state) => {
      const activeSheet = state.sheets.find(
        (s) => s.id === state.activeSheetId,
      );
      const sNode = activeSheet?.nodes.find((n) => n.selected);
      const sEdge = activeSheet?.edges.find((e) => e.selected);

      return {
        selectedNode: sNode,
        selectedEdge: sEdge,
        updateNodeData: (key: string, val: any) => {
          // ストアのアクションとして定義するか、setNodesで更新する
          // ここではStoreに直接ロジックを書かずに、setNodesを使って更新する関数を即席で作る例
          // ★本来は store/flow-store.ts に `updateNodeData` アクションを作るべきですが
          // setNodesを使って実装することも可能です。
          if (!activeSheet || !sNode) return;
          const newNodes = activeSheet.nodes.map((n) =>
            n.id === sNode.id ? { ...n, data: { ...n.data, [key]: val } } : n,
          );
          state.setNodes(newNodes);
        },
        updateEdgeLabel: (label: string) => {
          if (!activeSheet || !sEdge) return;
          const newEdges = activeSheet.edges.map((e) =>
            e.id === sEdge.id
              ? {
                  ...e,
                  label,
                  labelStyle: {
                    fill: 'currentColor',
                    fontWeight: 500,
                    fontSize: 12,
                  },
                  labelBgStyle: { fill: 'var(--background)', fillOpacity: 0.9 },
                  labelBgPadding: [8, 4] as [number, number],
                  labelBgBorderRadius: 4,
                }
              : e,
          );
          state.setEdges(newEdges);
        },
        takeSnapshot: state.takeSnapshot,
      };
    }),
  );

  if (selectedNode) {
    const data = selectedNode.data as any;
    return (
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
              value={data.label || ''}
              onFocus={takeSnapshot}
              onChange={(e) => updateNodeData('label', e.target.value)}
              className="bg-background"
            />
          </div>

          {selectedNode.type === 'bpmnMessaging' && (
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Input
                id="assignee"
                placeholder="e.g. Sales Team"
                value={data.assignee || ''}
                onFocus={takeSnapshot}
                onChange={(e) => updateNodeData('assignee', e.target.value)}
                className="bg-background"
              />
            </div>
          )}

          {selectedNode.type === 'bpmnJump' && (
            <div className="space-y-2">
              <Label htmlFor="jumpId">Link ID</Label>
              <Input
                id="jumpId"
                placeholder="A"
                maxLength={3}
                value={data.label || ''}
                onFocus={takeSnapshot}
                onChange={(e) => updateNodeData('label', e.target.value)}
                className="bg-background font-mono uppercase"
              />
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Enter details..."
              className="min-h-[100px] bg-background resize-none"
              value={data.description || ''}
              onFocus={takeSnapshot}
              onChange={(e) => updateNodeData('description', e.target.value)}
            />
          </div>

          {/* Swimlane Color */}
          {selectedNode.type === 'bpmnSwimlane' && (
            <div className="space-y-3">
              <Label>Header Color</Label>
              <div className="flex flex-wrap gap-2">
                {LANE_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c || 'default'}
                    className={cn(
                      'w-6 h-6 rounded-full border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 ring-primary',
                      (data.color === c || (!data.color && c === '')) &&
                        'ring-2 ring-offset-2 ring-primary',
                    )}
                    style={{ backgroundColor: c || 'hsl(var(--muted))' }}
                    onClick={() => updateNodeData('color', c)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  if (selectedEdge) {
    return (
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
              placeholder="e.g. Yes, No"
              value={(selectedEdge.label as string) || ''}
              onFocus={takeSnapshot}
              onChange={(e) => updateEdgeLabel(e.target.value)}
              className="bg-background"
            />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="hidden w-0 lg:flex lg:w-4 border-l border-sidebar-border bg-sidebar" />
  );
};
