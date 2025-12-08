import {
  Background,
  Controls,
  type Edge,
  MiniMap, // ▼ 追加
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNavigate, useParams } from '@ciderjs/city-gas/react';
import {
  ArrowLeft,
  CheckCircle2,
  Diff,
  FileText,
  GitPullRequestArrow,
  History,
  Loader2,
  MessageSquare,
  PanelRightOpen,
  Pencil,
  User,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import z from 'zod';
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
import { ModeToggle } from '@/components/mode-toggle';
import { SheetTabs } from '@/components/sheet-tabs';
import { useTheme } from '@/components/theme-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import useIsMobile from '@/hooks/is-mobile';
import { useFlowSheets } from '@/hooks/use-flow-sheets';
import {
  computeDiff,
  type DiffDecision,
  type DiffStatus,
  resolveDiff,
} from '@/lib/diff-utils';
import { serverScripts } from '@/lib/server';
import { cn } from '@/lib/utils';
import type { FlowStatus, Role } from '~/types/appsscript/client';
import type { ApiResponse } from '~/types/appsscript/server';
import type { FlowData, FlowGraphData, FlowMeta } from '~/types/flow';

// 履歴表示用の型定義
interface HistoryItem {
  id: string;
  date: string;
  user: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMMENT';
  comment: string;
}

const getDiffStyle = (
  status: DiffStatus,
  isDark: boolean,
): React.CSSProperties => {
  switch (status) {
    case 'added': // 薄い青
      return {
        backgroundColor: isDark ? 'rgba(30, 64, 175, 0.3)' : '#dbeafe',
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
      };
    case 'deleted': // 薄い赤
      return {
        backgroundColor: isDark ? 'rgba(153, 27, 27, 0.3)' : '#fee2e2',
        borderColor: '#ef4444',
        opacity: 0.7,
        borderStyle: 'dotted',
      };
    case 'modified': // 薄い緑
      return {
        backgroundColor: isDark ? 'rgba(6, 78, 59, 0.3)' : '#dcfce7',
        borderColor: '#22c55e',
        borderWidth: '3px',
      };
    default:
      return { opacity: 0.5 }; // 変更なしは少し薄くして差分を目立たせる(任意)
  }
};

export const schema = z.object({
  sheetId: z.string().optional(),
});

export default function ViewerPage() {
  const { id, version, sheetId } = useParams('/flow/[id]/[version]/preview');
  return (
    <ReactFlowProvider key={`${id}-${version}`}>
      <ViewerContent id={id} version={version} sheetId={sheetId} />
    </ReactFlowProvider>
  );
}

interface ViewerSidebarContentProps {
  assignee?: string;
  description?: string;
  label?: string;
}

const ViewerSidebarContent = ({
  selectedNode,
  historyList,
}: {
  selectedNode: (Node & { data: ViewerSidebarContentProps }) | undefined;
  historyList: HistoryItem[];
}) => {
  return (
    <div className="p-5 space-y-8 h-full">
      {/* Section A: Selected Node Detail */}
      <section>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Details
        </h3>

        {selectedNode ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label</Label>
              <div className="p-3 bg-muted/50 border border-border rounded-md text-sm font-medium text-foreground wrap-break-words whitespace-pre-wrap">
                {(selectedNode.data.label as string) || 'No Label'}
              </div>
            </div>
            {selectedNode.data.assignee && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Assignee
                </Label>
                <div className="p-2 bg-muted/50 border border-border rounded text-sm flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {selectedNode.data.assignee as string}
                </div>
              </div>
            )}
            {selectedNode.data.description && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Description
                </Label>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedNode.data.description as string}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic py-4 text-center border border-dashed border-border rounded">
            Select a node to view details
          </div>
        )}
      </section>

      <Separator />

      {/* Section B: History Timeline */}
      <section>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-muted-foreground" />
          History
        </h3>

        <div className="relative pl-2 space-y-6 pb-10">
          <div className="absolute top-2 bottom-2 left-[11px] w-0.5 bg-border" />
          {historyList.map((item, index) => (
            <div key={item.id} className="relative pl-8 group">
              <div
                className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center z-10 ${
                  index === 0
                    ? 'bg-primary shadow-lg'
                    : 'bg-muted-foreground/30'
                }`}
              />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-mono">
                  {item.date}
                </div>
                <div className="text-sm font-medium text-foreground">
                  <ActionLabel action={item.action} />
                  <span className="text-muted-foreground font-normal ml-1 text-xs">
                    by {item.user}
                  </span>
                </div>
                {item.comment && (
                  <div className="mt-2 bg-muted/50 p-3 rounded-lg border border-border text-sm text-foreground relative">
                    <MessageSquare className="w-3 h-3 absolute top-3 left-[-6px] text-muted-foreground fill-muted-foreground transform rotate-45" />
                    <span className="whitespace-pre-wrap">{item.comment}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

function ViewerContent({
  id,
  version,
  sheetId,
}: {
  id: string;
  version: string;
  sheetId?: string;
}) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // --- State ---
  // Read-onlyなのでonNodesChange等は不要だが、選択状態管理のためにuseNodesStateを使う
  const [nodes, setNodes, _onNodesChange] = useNodesState<
    Node & { data: ViewerSidebarContentProps }
  >([]);
  const [edges, setEdges, _onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [flowTitle, setFlowTitle] = useState('');
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('DRAFT');
  const [userRole, setUserRole] = useState<Role>('VIEWER');
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffChanges, setDiffChanges] = useState<Record<string, any>>({});
  const [diffDecisions, setDiffDecisions] = useState<
    Record<string, DiffDecision>
  >({});
  // Diff表示用のノード (判定を反映したプレビュー用)
  const [previewNodes, setPreviewNodes] = useState<
    (Node & { data: { label?: string } })[]
  >([]);
  const [previewEdges, setPreviewEdges] = useState<Edge[]>([]);
  // 元のDiff計算結果 (Stateとして保持)
  const [rawDiffResult, setRawDiffResult] = useState<{
    nodes: Node[];
    edges: Edge[];
    baseNodes: Node[];
    baseEdges: Edge[];
  } | null>(null);

  const [originalGraph, setOriginalGraph] = useState<{
    nodes: Node[];
    edges: Edge[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionComment, setActionComment] = useState('');
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const { isMobile } = useIsMobile();

  // ▼ Sheet Management Hook
  const { sheets, activeSheetId, setSheets, setActiveSheetId, switchSheet } =
    useFlowSheets({
      routeName: '/flow/[id]/[version]/preview',
      routeParams: { id, version },
    });

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
      bpmnTimer: BpmnTimerEventNode,
      bpmnAnnotation: BpmnAnnotationNode,
      bpmnDatabase: BpmnDatabaseNode,
      bpmnMessage: BpmnMessageEventNode,
    }),
    [],
  );

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await serverScripts.getFlowData(id, version);
        const res = JSON.parse(json) as ApiResponse<FlowData>;

        if (res.success && res.data) {
          const { meta, graphData } = res.data;
          const verData = {} as any;

          setFlowTitle(meta.title);
          setFlowStatus(meta.currentStatus);
          setUserRole(userRole);

          // ▼ シートデータのロード処理
          setSheets(graphData.sheets);
          const initialId =
            sheetId || graphData.activeSheetId || graphData.sheets[0].id;
          setActiveSheetId(initialId);

          const finalNodes = graphData.sheets?.[0]?.nodes || [];
          const finalEdges = graphData.sheets?.[0]?.edges || [];

          // 2. Diffモードの準備 (PENDING かつ 比較対象がある場合)
          if (verData.status === 'PENDING' && initialId) {
            try {
              // 比較対象(公開版)を取得
              const baseJson = await serverScripts.getFlowData(id, initialId);
              const baseRes = JSON.parse(baseJson);

              if (baseRes.success) {
                const baseNodes =
                  baseRes.data.graphData.sheets?.[0]?.nodes || [];
                const baseEdges =
                  baseRes.data.graphData.sheets?.[0]?.edges || [];

                // Diff計算
                const {
                  nodes: diffNodes,
                  edges: diffEdges,
                  changes,
                } = computeDiff(baseNodes, baseEdges, finalNodes, finalEdges);

                setRawDiffResult({
                  nodes: diffNodes,
                  edges: diffEdges,
                  baseNodes,
                  baseEdges, // 復元用に保持
                });

                setPreviewNodes(diffNodes);
                setPreviewEdges(diffEdges);
                setDiffChanges(changes);

                // 生データとDiffデータを保持しておく
                setOriginalGraph({ nodes: finalNodes, edges: finalEdges });

                // 初期状態ではDiffデータを持たせておくが、モードOFFなら通常表示に戻す制御をする
                // ここでは便宜上、Diff計算結果を保持するstateを分けるか、
                // isDiffMode 切り替え時に nodes を差し替える方式をとる

                // 簡単のため「Diffデータ」を別のRefかStateに保存
                // (実装簡略化のため、useEffect内での即時反映はせず、トグル時に切り替えるロジックにします)
                (window as any).__diffData = {
                  nodes: diffNodes,
                  edges: diffEdges,
                };
              }
            } catch (e) {
              console.error('Failed to fetch comparison version', e);
            }
          }

          const activeSheet = graphData.sheets.find((s) => s.id === initialId);
          setNodes(activeSheet?.nodes || []);
          setEdges(activeSheet?.edges || []);

          // コメント履歴パース
          const rawComments = verData.comment || '';
          const parsedHistory = parseHistory(
            rawComments,
            verData.created_by,
            verData.created_at,
          );
          setHistoryList(parsedHistory);
        } else {
          toast.error('Failed to load flow', { description: res.error });
        }
      } catch (e) {
        toast.error('Connection failed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, version, setNodes, setEdges, setSheets, setActiveSheetId, userRole]);

  // --- Sheet Switch Handler ---
  const handleSwitchSheet = useCallback(
    (targetId: string) => {
      const { nodes: nextNodes, edges: nextEdges } = switchSheet(
        targetId,
        nodes,
        edges,
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(null);
    },
    [nodes, edges, switchSheet, setNodes, setEdges],
  );

  // ▼ 判定切り替えハンドラ
  const handleToggleDecision = (targetId: string, accepted: boolean) => {
    const newDecisions: Record<string, DiffDecision> = {
      ...diffDecisions,
      [targetId]: accepted ? 'accepted' : 'rejected',
    };
    setDiffDecisions(newDecisions);

    // プレビューの更新
    // ここでは「見た目」を変える。
    // Rejectedなら: Added->透明化, Deleted->通常表示, Modified->元の見た目に戻す
    if (rawDiffResult) {
      const updatedNodes = rawDiffResult.nodes.map((n) => {
        const decision = newDecisions[n.id] || 'accepted';
        const status = n.data._diff;

        if (decision === 'rejected') {
          if (status === 'added') return { ...n, hidden: true }; // 追加拒否＝消す
          if (status === 'deleted')
            return {
              ...n,
              style: {
                ...n.style,
                opacity: 1,
                borderStyle: 'solid',
                borderColor: 'transparent',
              },
            }; // 削除拒否＝復活（スタイルリセット）
          if (status === 'modified') {
            // 変更拒否＝元のデータに戻して表示 (簡易的にスタイルだけ戻すか、データごと戻す)
            // 厳密なプレビューのためには resolveDiff のロジックをここでも使うのが良い
            const original = rawDiffResult.baseNodes.find(
              (bn) => bn.id === n.id,
            );
            return original ? { ...original, position: n.position } : n; // 位置は今のまま、中身は戻すなどの調整
          }
        }
        return n; // acceptedならそのままDiff表示
      });
      setPreviewNodes(updatedNodes);
    }
  };

  // --- Actions (Approve / Reject) ---
  const handleAction = async (action: 'approve' | 'reject') => {
    setIsActionProcessing(true);
    try {
      let res: ApiResponse<{ status: string; versionId?: string }>;
      if (action === 'approve') {
        // 1. 最終データの生成 (Resolve)
        let graphDataPayload;

        if (rawDiffResult) {
          const { nodes: finalNodes, edges: finalEdges } = resolveDiff(
            rawDiffResult.nodes,
            rawDiffResult.edges,
            rawDiffResult.baseNodes,
            rawDiffResult.baseEdges,
            diffDecisions,
          );

          // シート構造に合わせて整形
          graphDataPayload = {
            sheets: [{ ...sheets[0], nodes: finalNodes, edges: finalEdges }], // マルチシート対応なら全シート分やる
            activeSheetId: activeSheetId,
          };
        }

        // 2. 承認APIコール (graphData付き)
        const json = await serverScripts.approveFlow({
          flowId: id,
          versionId: version,
          comment: actionComment,
          graphData: graphDataPayload, // 選別結果を送信
        });
        res = JSON.parse(json);
      } else {
        // 否認実行
        const json = await serverScripts.rejectFlow({
          flowId: id,
          versionId: version,
          comment: actionComment,
        });
        res = JSON.parse(json);
      }

      if (res.success) {
        toast.success(action === 'approve' ? 'Flow approved' : 'Flow rejected');
        // 承認時は新しいバージョン(リリースID)が返ってくる可能性があるため遷移
        // 否認時はステータスが変わるのでリロード
        if (
          action === 'approve' &&
          res.data?.versionId &&
          res.data.versionId !== version
        ) {
          navigate('/flow/[id]/[version]/preview', {
            id,
            version: res.data.versionId,
          });
        } else {
          window.location.reload();
        }
      } else {
        toast.error('Action failed', { description: res.error });
      }
    } catch (e) {
      toast.error('Communication error');
    } finally {
      setIsActionProcessing(false);
      setActionComment('');
    }
  };

  // --- Helper: Node Selection ---
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const onSelectionChange = ({ nodes }: { nodes: Node[] }) => {
    const newNode = nodes[0];
    setSelectedNodeId(newNode?.id || null);
    if (newNode && window.innerWidth < 768) {
      toast.info('Node selected', {
        description: 'Tap info button for details',
      });
    }
  };

  // --- Toggle Diff Mode ---
  const toggleDiffMode = (pressed: boolean) => {
    setIsDiffMode(pressed);
    const diffData = (window as any).__diffData;

    if (pressed && diffData) {
      // Diffデータを適用 (スタイル注入)
      const styledNodes = diffData.nodes.map((n: Node) => {
        const status = n.data._diff as DiffStatus;
        if (!status || status === 'unchanged') return n;

        return {
          ...n,
          style: {
            ...n.style,
            ...getDiffStyle(status, resolvedTheme === 'dark'),
          },
        };
      });

      // エッジの色変え (追加:青, 削除:赤)
      const styledEdges = diffData.edges.map((e: Edge) => {
        const status = e.data?._diff as DiffStatus;
        let stroke = '';
        if (status === 'added') stroke = '#3b82f6';
        if (status === 'deleted') stroke = '#ef4444';

        return stroke
          ? { ...e, style: { ...e.style, stroke, strokeWidth: 2 } }
          : e;
      });

      setNodes(styledNodes);
      setEdges(styledEdges);
    } else if (originalGraph) {
      // 通常モードに戻す
      setNodes(originalGraph.nodes);
      setEdges(originalGraph.edges);
    }
  };

  const handleGoToEdit = useCallback(() => {
    navigate('/flow/[id]/[version]/edit', {
      id,
      version,
      sheetId: activeSheetId,
    });
  }, [navigate, id, version, activeSheetId]);

  // --- Theme / Visuals ---
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const resolvedTheme = isDark ? 'dark' : 'light';

  // マスクカラー: 閲覧画面は見やすさ重視で少し暗くする
  const maskColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.25)';

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading Flow...
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {/* --- Header --- */}
      <header className="h-14 md:h-16 border-b border-border flex items-center justify-between px-3 md:px-4 bg-background z-20 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground shrink-0"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-medium text-foreground truncate">
                {flowTitle}
              </h1>
              <span className="hidden md:inline-block text-xs text-muted-foreground font-mono bg-muted px-1 rounded">
                {version}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <StatusBadge status={flowStatus} />
            </div>
          </div>
        </div>

        {flowStatus === 'PENDING' && (
          <div className="flex items-center gap-2 ml-auto"></div>
        )}

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <ModeToggle />

          {/* ▼ Edit Button (権限がある場合のみ表示) */}
          {(userRole === 'EDITOR' ||
            userRole === 'APPROVER' ||
            userRole === 'ADMIN') && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleGoToEdit}
              title="Switch to Editor Mode"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden md:inline">Edit</span>
            </Button>
          )}

          {/* Action Buttons: Only visible for APPROVER/ADMIN and when PENDING */}
          {!isMobile &&
            (userRole === 'APPROVER' || userRole === 'ADMIN') &&
            flowStatus === 'PENDING' && (
              <div className="flex items-center gap-3">
                <Toggle
                  pressed={isDiffMode}
                  onPressedChange={toggleDiffMode}
                  className="gap-2 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                >
                  <Diff className="w-4 h-4" />
                  <span className="text-xs font-bold">Diff View</span>
                </Toggle>

                {/* Reject Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="gap-2 shadow-sm"
                      disabled={isActionProcessing}
                    >
                      <XCircle className="w-4 h-4" /> 否認
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>否認しますか？</DialogTitle>
                      <DialogDescription>
                        否認理由を入力してください。申請者に通知され、ステータスは「REJECTED」になります。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Textarea
                        placeholder="修正依頼コメント..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline">キャンセル</Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleAction('reject')}
                        disabled={isActionProcessing}
                      >
                        {isActionProcessing && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}{' '}
                        否認を実行
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Approve Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      disabled={isActionProcessing}
                    >
                      <CheckCircle2 className="w-4 h-4" /> 承認
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>承認・公開しますか？</DialogTitle>
                      <DialogDescription>
                        このバージョンを正式版として公開します。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>承認コメント (任意)</Label>
                      <Textarea
                        placeholder="承認します。"
                        className="mt-2"
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline">キャンセル</Button>
                      <Button
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() => handleAction('approve')}
                        disabled={isActionProcessing}
                      >
                        {isActionProcessing && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}{' '}
                        承認して公開
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          {isMobile && (
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-muted-foreground"
                >
                  <PanelRightOpen className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Flow Details</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-full pb-10">
                  <ViewerSidebarContent
                    selectedNode={selectedNode}
                    historyList={historyList}
                  />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* --- Main Viewer Area --- */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* --- Canvas --- */}
        <main className="flex-1 flex flex-col relative bg-muted/20">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              onSelectionChange={onSelectionChange}
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
                  <Controls
                    className={cn(
                      'bg-card! border! border-border! shadow-sm! rounded-md! p-1!',
                      '[&>button]:bg-transparent! [&>button]:border-none! [&>button]:text-muted-foreground!',
                      '[&>button:hover]:bg-accent! [&>button:hover]:text-accent-foreground!',
                      '[&>button>svg]:fill-current!',
                    )}
                  />
                  <MiniMap
                    className={cn(
                      'bg-card! border! border-border! shadow-sm! rounded-md!',
                      'bottom-1! right-1!',
                    )}
                    maskColor={maskColor}
                    nodeClassName={(node) => {
                      if (node.type === 'bpmnSwimlane') {
                        return cn(
                          'fill-muted/30!',
                          'stroke-border/50!',
                          'dark:fill-muted/20"',
                        );
                      }
                      return cn('fill-primary!', 'stroke-transparent!');
                    }}
                    zoomable
                    pannable
                  />
                </>
              )}
            </ReactFlow>
          </div>

          {/* Footer Tabs (Responsive) */}
          <SheetTabs
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSwitch={handleSwitchSheet}
            onAdd={() => {}}
            onRemove={() => {}}
            onRename={() => {}}
            onReorder={() => {}}
            readOnly={true}
          />
        </main>

        {/* --- Desktop Sidebar (Hidden on Mobile) --- */}
        <aside className="hidden md:flex w-80 bg-sidebar border-l border-sidebar-border flex-col z-10 shadow-xl">
          <ScrollArea className="flex-1">
            {isDiffMode && (
              <div className="p-4 border-b">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GitPullRequestArrow className="w-4 h-4" />
                  Review Changes
                </h3>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {/* 変更点リスト */}
                    {previewNodes
                      .filter(
                        (n) => n.data._diff && n.data._diff !== 'unchanged',
                      )
                      .map((node) => {
                        const status = node.data._diff as string;
                        const isAccepted =
                          (diffDecisions[node.id] ?? 'accepted') === 'accepted';

                        return (
                          <div
                            key={node.id}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded border text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <StatusIcon status={status} />
                              <span className="truncate max-w-[100px] font-medium">
                                {node.data.label || node.id}
                              </span>
                            </div>

                            {/* 採用/不採用スイッチ */}
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  'text-[10px]',
                                  isAccepted
                                    ? 'text-muted-foreground'
                                    : 'text-red-500 font-bold',
                                )}
                              >
                                {isAccepted ? 'Apply' : 'Revert'}
                              </span>
                              <Switch
                                checked={isAccepted}
                                onCheckedChange={(c) =>
                                  handleToggleDecision(node.id, c)
                                }
                                className="scale-75"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
            )}

            <ViewerSidebarContent
              selectedNode={selectedNode}
              historyList={historyList}
            />
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatusBadge({ status }: { status: FlowStatus }) {
  const styles = {
    PUBLISHED:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    PENDING:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    DRAFT:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    REJECTED:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  };
  return (
    <Badge
      className={`border hover:bg-opacity-80 ${styles[status] || styles.DRAFT}`}
    >
      {status}
    </Badge>
  );
}

function ActionLabel({ action }: { action: HistoryItem['action'] }) {
  switch (action) {
    case 'SUBMITTED':
      return <span>Submitted</span>;
    case 'APPROVED':
      return (
        <span className="text-emerald-600 dark:text-emerald-400">Approved</span>
      );
    case 'REJECTED':
      return <span className="text-red-600 dark:text-red-400">Rejected</span>;
    default:
      return <span>Comment</span>;
  }
}

// --- History Parser Logic ---
function parseHistory(
  rawComment: string,
  creatorEmail: string,
  createdAt: string,
): HistoryItem[] {
  const items: HistoryItem[] = [];

  // 1. Initial Submission (Created)
  items.push({
    id: 'init',
    date: new Date(createdAt).toLocaleDateString(),
    user: creatorEmail.split('@')[0],
    action: 'SUBMITTED',
    comment: '',
  });
  if (!rawComment) return items.reverse();

  // 2. Parse appended comments
  // Split by double newline to separate entries
  const entries = rawComment.split(/\n\n/g);
  entries.forEach((entry, idx) => {
    // Regex to capture "[Approved by email]: comment"
    const match = entry.match(/^\[(Approved|Rejected) by (.+?)\]:\s*(.*)/s);
    if (match) {
      const actionType = match[1].toUpperCase() as 'APPROVED' | 'REJECTED';
      const user = match[2].split('@')[0];
      const text = match[3];
      items.push({
        id: `hist-${idx}`,
        date: '---',
        user: user,
        action: actionType,
        comment: text,
      });
    } else if (entry.trim() !== '') {
      // タグがない場合は、申請時のコメントとみなして初期アイテムに結合、または通常コメントとする
      // ここでは初期サブミットへのコメントとして扱う
      if (items[0]) {
        items[0].comment = entry;
      }
    }
  });

  // 最新が上に来るように逆順にする
  return items.reverse();
}

// Helper Icon
const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'added')
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-1 py-0 text-[10px]">
        Add
      </Badge>
    );
  if (status === 'deleted')
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 px-1 py-0 text-[10px]">
        Del
      </Badge>
    );
  if (status === 'modified')
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-1 py-0 text-[10px]">
        Mod
      </Badge>
    );
  return null;
};
