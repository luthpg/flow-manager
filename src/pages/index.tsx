import { useNavigate } from '@ciderjs/city-gas/react';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  GitPullRequestArrow,
  Layers,
  LayoutGrid,
  Menu,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { FeatureCard, UseCaseItem } from '@/components/lp-items';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleStart = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* --- Header --- */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <LayoutGrid className="w-5 h-5" />
            </div>
            Flowchart Manager
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a
              href="#features"
              className="hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#use-cases"
              className="hover:text-primary transition-colors"
            >
              Use Cases
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              Pricing
            </a>
            <Separator orientation="vertical" className="h-4" />
            <Button
              variant="ghost"
              onClick={handleStart}
              className="hover:bg-primary/5"
            >
              Log in
            </Button>
            <Button
              onClick={handleStart}
              className="shadow-md shadow-primary/20"
            >
              Get Started
            </Button>
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader className="text-left mb-6">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4">
                  <a
                    href="#features"
                    className="text-lg font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Features
                  </a>
                  <a
                    href="#use-cases"
                    className="text-lg font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Use Cases
                  </a>
                  <Button
                    size="lg"
                    onClick={handleStart}
                    className="mt-4 w-full"
                  >
                    Get Started
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* --- Hero Section --- */}
        <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-[100%] blur-3xl -z-10 opacity-50 pointer-events-none" />

          <div className="container px-4 md:px-8 mx-auto flex flex-col items-center text-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-4xl">
              {/* <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur"
              >
                <span className="font-bold mr-2">New</span>
                マルチシート & 差分検知機能リリース ✨
              </Badge> */}

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                業務フローを、
                <br />
                もっと
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                  スマートに可視化
                </span>
                する。
              </h1>

              <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed">
                Google Apps Scriptで動作する、
                <br className="sm:hidden" />
                サーバーレスなBPMNエディタ。
                <br />
                変更箇所のDiff表示と承認ワークフローで、
                <br className="sm:hidden" />
                業務プロセスのガバナンスを強化します。
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="h-12 px-8 text-base shadow-xl shadow-primary/20 transition-transform hover:scale-105"
                >
                  ダッシュボードへ移動 <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base bg-background/50 backdrop-blur"
                >
                  ドキュメントを見る
                </Button>
              </div>
            </div>

            {/* --- App Preview Image (3D-like container) --- */}
            <div className="mt-16 w-full max-w-6xl perspective-[2000px] group">
              <div className="relative rounded-xl border bg-card/50 p-2 shadow-2xl transition-all duration-500 md:group-hover:rotate-x-2 md:rotate-x-6 backdrop-blur-sm">
                <div className="aspect-16/10 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden relative border border-border/50">
                  {/* Mock UI: Header */}
                  <div className="h-12 border-b bg-background/80 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                      <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <div className="ml-4 h-6 w-64 bg-muted/50 rounded-full" />
                    <div className="ml-auto flex gap-2">
                      <div className="h-8 w-20 bg-primary/20 rounded-md" />
                      <div className="h-8 w-20 bg-primary rounded-md" />
                    </div>
                  </div>
                  {/* Mock UI: Sidebar & Canvas */}
                  <div className="flex h-full">
                    <div className="w-16 border-r bg-muted/20 hidden sm:block" />
                    <div className="flex-1 relative flex items-center justify-center p-10">
                      {/* Grid Pattern */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            'radial-gradient(var(--border) 1px, transparent 1px)',
                          backgroundSize: '24px 24px',
                          opacity: 0.3,
                        }}
                      />

                      {/* Flowchart Mock */}
                      <div className="relative w-full max-w-2xl aspect-video border-2 border-dashed border-primary/20 rounded-xl flex items-center justify-center bg-card/50 shadow-sm">
                        <div className="text-center space-y-2">
                          <LayoutGrid className="w-16 h-16 mx-auto text-primary/40 animate-pulse" />
                          <p className="text-muted-foreground font-medium">
                            BPMN Editor Preview
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            ここに実際のスクリーンショット（.docs/images/editor.jpg）を配置
                          </p>
                        </div>
                        {/* Sample Node */}
                        <div className="absolute top-1/4 left-1/4 w-32 h-16 bg-card border-2 border-primary rounded-lg shadow-lg" />
                        <div className="absolute bottom-1/4 right-1/4 w-32 h-16 bg-card border-2 border-muted-foreground rounded-lg shadow-sm" />
                        {/* Connecting Line */}
                        <svg
                          className="absolute inset-0 pointer-events-none stroke-primary/50"
                          strokeWidth="2"
                        >
                          <path
                            d="M 300 200 C 400 200, 400 300, 500 300"
                            fill="none"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="w-64 border-l bg-card hidden lg:block p-4 space-y-4">
                      <div className="h-4 w-1/2 bg-muted rounded" />
                      <div className="h-20 w-full bg-muted/30 rounded" />
                      <div className="h-20 w-full bg-muted/30 rounded" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Glow Effect behind image */}
              <div className="absolute inset-0 bg-primary/20 blur-[100px] -z-10 rounded-full opacity-40 pointer-events-none transform translate-y-20" />
            </div>
          </div>
        </section>

        <Separator />

        {/* --- Features Section --- */}
        <section id="features" className="py-20 md:py-32 bg-muted/30">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight leading-tight sm:text-4xl md:text-5xl">
                強力な管理機能で、
                <br />
                <span className="text-blue-600 dark:text-blue-500">
                  業務の「正しさ」
                </span>
                を担保。
              </h2>
              <p className="text-lg text-muted-foreground">
                作図のしやすさだけでなく、
                <br className="sm:hidden" />
                承認プロセスやバージョン管理など、
                <br className="sm:hidden" />
                エンタープライズで求められる
                <br className="sm:hidden" />
                ガバナンス機能を標準搭載しています。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Layers className="w-8 h-8 text-purple-500" />}
                title="マルチシート対応"
                description="1つのフロー定義内で複数のシートを管理。\nメインフローとサブプロセスをタブ切り替えで整理できます。"
              />
              <FeatureCard
                icon={<FileSpreadsheet className="w-8 h-8 text-emerald-600" />}
                title="GAS & Spreadsheet"
                description="データは全てGoogleスプレッドシートに保存。\n専用サーバー不要で、Googleアカウントさえあれば即座に導入可能です。"
              />
              <FeatureCard
                icon={<LayoutGrid className="w-8 h-8 text-orange-500" />}
                title="BPMN 2.0 準拠"
                description="スイムレーン、ゲートウェイ、メッセージイベントなど、標準的な記法をフルサポート。\n独自ルールに陥りません。"
              />
              <FeatureCard
                icon={<CheckCircle2 className="w-8 h-8 text-green-500" />}
                title="承認ワークフロー"
                description="下書き・申請・承認・公開のステータス管理を内蔵。\n誰がいつ承認したかを記録し、証跡として残せます。"
              />
              <FeatureCard
                icon={<ShieldCheck className="w-8 h-8 text-red-500" />}
                title="権限管理 & ロック"
                description="閲覧者、編集者、承認者を分離。\n誤操作を防ぐノードロック機能や、範囲選択からの除外機能も搭載。"
              />
              <FeatureCard
                icon={<GitPullRequestArrow className="w-8 h-8 text-blue-500" />}
                title="Diff & Cherry-Pick"
                description="変更前後の差分を色分け表示。\n承認者は変更箇所を個別に「採用/却下」でき、意図しない変更の混入を防ぎます。"
              />
            </div>
          </div>
        </section>

        {/* --- Use Cases Section --- */}
        <section id="use-cases" className="py-20 md:py-32">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  チームの合意形成を加速する
                </h2>
                <div className="space-y-6">
                  <UseCaseItem
                    title="業務マニュアルの標準化"
                    description="属人化した業務フローを可視化し、チーム全体で共有。\n新入社員のオンボーディングにも最適です。"
                  />
                  <UseCaseItem
                    title="システム要件定義"
                    description="エンジニアとビジネスサイドの共通言語としてBPMNを活用。\n仕様の認識齟齬を減らします。"
                  />
                  <UseCaseItem
                    title="内部統制・監査対応"
                    description="承認履歴と変更ログが自動で残るため、いつ誰がプロセスを変更したかを追跡可能です。"
                  />
                </div>
              </div>

              {/* Decorative Image Area */}
              <div className="relative">
                <div className="absolute -inset-4 bg-linear-to-r from-primary/20 to-purple-500/20 rounded-3xl blur-2xl -z-10 opacity-70" />
                <div className="grid gap-6">
                  <Card className="shadow-lg border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          承認依頼
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Just now
                        </span>
                      </div>
                      <CardTitle className="text-base mt-2">
                        在庫管理フロー改定 v2.1
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        「棚卸プロセス」にダブルチェック工程を追加しました。詳細は更新差分をご確認ください。
                      </p>
                      <div className="flex -space-x-2 mt-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-background flex items-center justify-center text-xs font-bold">
                          Y
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-background flex items-center justify-center text-xs font-bold">
                          M
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg ml-8 border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        >
                          公開完了
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          2h ago
                        </span>
                      </div>
                      <CardTitle className="text-base mt-2">
                        販売プロセス 2024年度版
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        管理チーム承認済
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- CTA Section --- */}
        <section className="py-20 md:py-32 border-t">
          <div className="container px-4 md:px-8 mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 shadow-2xl sm:px-16 md:pt-24 md:pb-24 lg:px-24">
              <div className="relative z-10 flex flex-col items-center text-center text-primary-foreground max-w-3xl mx-auto space-y-6">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  業務プロセスを最適化しましょう
                </h2>
                <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl">
                  インストール不要。Googleアカウントがあれば、今すぐブラウザから利用を開始できます。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleStart}
                    className="font-bold h-14 px-8 text-lg w-full sm:w-auto shadow-lg"
                  >
                    今すぐ始める
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-bold h-14 px-8 text-lg w-full sm:w-auto bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  >
                    お問い合わせ
                  </Button>
                </div>
              </div>

              {/* Background Decor */}
              <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 opacity-10">
                <Zap className="w-64 h-64 rotate-12" />
              </div>
              <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 opacity-10">
                <LayoutGrid className="w-64 h-64 -rotate-12" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer className="border-t py-12 bg-muted/10">
        <div className="container px-4 md:px-8 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <LayoutGrid className="w-3 h-3" />
            </div>
            Flowchart Manager
          </div>

          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; 2024 Your Company. Built with React Flow & Google Apps
            Script.
          </p>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
