import { useNavigate } from '@ciderjs/city-gas/react';
import { formatDistanceToNow } from 'date-fns';
// import { ja } from 'date-fns/locale';
import { FileSpreadsheet, Menu, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { serverScripts } from '@/lib/server';
import type { ApiResponse } from '~/types/appsscript/server';
import type { FlowMeta, FlowStatus } from '~/types/flow';

// ステータスに応じたバッジのデザイン定義
const getStatusBadge = (status: FlowStatus) => {
  switch (status) {
    case 'PUBLISHED':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200">
          公開中
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200">
          申請中
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200">
          下書き
        </Badge>
      );
    case 'REJECTED':
      return <Badge variant="destructive">否認</Badge>;
    default:
      return <Badge variant="outline">不明</Badge>;
  }
};

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [flows, setFlows] = useState<FlowMeta[]>([]);

  useEffect(() => {
    (async () => {
      const json = await serverScripts.getFlows();
      const res = JSON.parse(json) as ApiResponse<FlowMeta[]>;
      if (res.data != null) {
        setFlows(res.data);
      }
    })();
  }, []);

  // 検索フィルター処理
  const filteredFlows = flows.filter((flow) =>
    flow.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* --- Top App Bar (Header) --- */}
      <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-slate-500">
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-medium text-slate-700 hidden sm:block">
            Flowchart Manager
          </h1>
        </div>

        {/* Search Bar: 中央配置 & Material Design風の角丸 */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search flows..."
              className="pl-10 h-11 bg-slate-100 border-none rounded-full focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User Avatar */}
          <Avatar className="w-9 h-9 cursor-pointer hover:ring-2 hover:ring-slate-200">
            <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
            <AvatarFallback>USER</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {/* Grid Layout for Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredFlows.map((flow) => (
            <FlowCard key={flow.flowId} flow={flow} />
          ))}
        </div>

        {/* Empty State */}
        {filteredFlows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <FileSpreadsheet className="w-12 h-12 mb-2 opacity-20" />
            <p>No flows found matching "{searchTerm}"</p>
          </div>
        )}
      </main>

      {/* --- Floating Action Button (FAB) --- */}
      {/* Material Design 3 スタイル: 大きめのシャドウ、角丸、アクセントカラー */}
      <div className="fixed bottom-8 right-8">
        <Button
          size="lg"
          className="w-14 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl transition-transform hover:scale-105 active:scale-95 p-0 grid place-items-center"
          onClick={() => console.log('Navigate to New Flow')}
        >
          <Plus className="w-8 h-8 text-white" />
        </Button>
      </div>
    </div>
  );
}

// --- Sub Component: Flow Card ---
function FlowCard({ flow }: { flow: FlowMeta }) {
  const navigate = useNavigate();
  return (
    <Card
      className="group cursor-pointer overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl flex flex-col h-[260px]"
      onClick={() =>
        navigate('/flow/[id]/[version]/preview', {
          id: flow.flowId,
          version: flow.versionId,
        })
      }
    >
      {/* Thumbnail Area (Mock) */}
      <div className="h-36 bg-slate-50 relative border-b border-slate-100 flex items-center justify-center overflow-hidden">
        {/* 実際の実装ではここにサムネイル画像を表示 */}
        {/* パターン背景などで図面っぽさを演出 */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        ></div>
        {/* フロー図のアイコン（プレースホルダー） */}
        <div className="w-24 h-16 border-2 border-slate-300 rounded-md flex items-center justify-center bg-white shadow-sm group-hover:scale-105 transition-transform">
          <div className="w-2 h-2 rounded-full bg-slate-300 mr-2"></div>
          <div className="w-8 h-0.5 bg-slate-300"></div>
          <div className="w-2 h-2 rounded-sm bg-slate-300 ml-2"></div>
        </div>
      </div>

      {/* Card Content */}
      <CardHeader className="p-4 pb-2 space-y-0">
        <div className="flex justify-between items-start">
          <h3
            className="font-medium text-slate-900 truncate pr-2"
            title={flow.title}
          >
            {flow.title}
          </h3>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-1">
        {getStatusBadge(flow.currentStatus)}
      </CardContent>

      <CardFooter className="p-4 mt-auto flex justify-between items-center text-xs text-slate-500">
        <span>
          Last updated:{' '}
          {formatDistanceToNow(new Date(flow.updatedAt), {
            addSuffix: true,
          })}
        </span>
      </CardFooter>
    </Card>
  );
}
