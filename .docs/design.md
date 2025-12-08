# 詳細設計書：フローチャート作成・管理システム

## 1\. 開発環境・ディレクトリ構成

Viteを中心としたモノレポ構成を採用し、フロントエンド(`src`)とバックエンド(`server`)を分離して管理する。  
ルーティングは `@ciderjs/city-gas` を採用し、クライアントサイドでパラメータルーティング（`?page=...`）を解決する。

### 1.1 ディレクトリ構造

新規作成・整理されたファイルを含む構成へ更新。

```
root/
├── src/
│   ├── components/
│   │   ├── custom-nodes.tsx  # [New] BPMNカスタムノード定義集約
│   │   ├── sheet-tabs.tsx    # [New] シート切り替えタブ
│   │   ├── mode-toggle.tsx   # [New] ダークモード切替
│   │   └── ui/               # Shadcn UI Components
│   ├── hooks/
│   │   └── use-flow-sheets.ts # [New] シート管理ロジック
│   ├── lib/
│   │   ├── bpmn-logic.ts     # [New] バリデーション・自動整列ロジック
│   │   ├── diff-utils.ts     # [New] 差分検知・マージロジック
│   │   ├── constants.ts      # [New] グリッド・ノードサイズ定数
│   │   └── server.ts         # Server API Client wrapper
│   └── pages/
│       ├── flow/
│       │   └── [id]/
│       │       └── [version]/
│       │           ├── edit.tsx    # [Update] バージョン指定エディタ
│       │           └── preview.tsx # [Update] バージョン指定ビューワー
```

---

## 2\. フロントエンド詳細設計

### 2.1 ルーティング (`@ciderjs/city-gas`)

GASのWebアプリURL（`script.google.com/.../exec`）のクエリパラメータ `page` をベースにルーティングを行う。  
GASサーバー側でのパラメータ中継は行わず、クライアント初期化時に `google.script.url` または `window.location` 経由で現在のルートを解決する。

- **URLパターン:**  
    
  - `.../exec` \-\> `src/pages/index.tsx`  
  - `.../exec?page=/user/config` \-\> `src/pages/user/config.tsx`


- **実装イメージ (`src/main.tsx`):**

```
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createRouter } from '@ciderjs/city-gas';
import { RouterProvider } from '@ciderjs/city-gas/react';
import { pages, specialPages } from './generated/routes';

// Create the router instance
const router = createRouter(pages, { specialPages });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

### 2.2 通信・データフェッチ (`@ciderjs/gasnuki`)

- **通信方式:** `google.script.run` をラップした `gasnuki` を使用し、`server/controller.ts` の関数を型安全に呼び出す。  
- **ローカル開発:** `window.google` APIの有無を自動的に判断し、Spreadsheetに接続せずローカルモックデータを返す。

---

## 3\. バックエンド詳細設計 (`server/`)

### 3.1 エントリーポイント (`server/main.ts`)

`doGet` は単にHTMLテンプレート（Reactアプリ）を返す役割に徹する。 ルーティング情報はクライアントサイドで解決されるため、`e.parameter` の処理は不要。

```ts
// server/main.ts
function doGet(e: GoogleAppsScript.Events.DoGet) {
  const template = HtmlService.createTemplateFromFile('index');
  
  // 初期ロード高速化のため、ユーザーEmailのみ埋め込んでおく
  // ※フロントエンドでこれを読み取り、APIコールの回数を減らすことが可能
  template.activeUserEmail = Session.getActiveUser().getEmail();

  return template.evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('Flowchart Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

### 3.2 アーキテクチャパターン

1. **Controller (`server/controller.ts`)**  
   - クライアントから呼ばれる関数群。  
   - エラーハンドリングとレスポンス整形を行う。  
2. **Service (`server/service/`)**
    * **`FlowService.ts`**:
    * **マルチシート対応**: `saveDraft` は `FlowGraphData` (シート配列を含むオブジェクト) を受け取り、JSON文字列化して保存する。
    * **バージョン管理**: `saveDraft` は `draft-{user}-{date}` 形式、`approveFlow` は `YYYYMMDD` 形式のIDを管理する。
    * **Diff解決**: `approveFlow` はオプションで `graphData` (チェリーピック後の確定データ) を受け取り、それを正として公開バージョンを作成する。
3. **Repository (`server/repository/`)**  
   - `SheetDB.ts`: Spreadsheetへの読み書き。  
   - JSONデータの文字列化・パース、排他制御(`LockService`)の実装。

---

## 4\. データモデル詳細定義 (TypeScript Interfaces)

### 4.1 User & Permission

```ts
export type Role = 'VIEWER' | 'EDITOR' | 'APPROVER' | 'ADMIN';

export interface User {
  email: string;
  name: string;
  groups: string[]; 
}
```

### 4.2 Flow & Version

```ts
export type FlowStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface Flow {
  flowId: string;
  folderId: string;
  title: string;
  currentStatus: FlowStatus;
  activeVersionId?: string;
  updatedAt: string;
}
```

### 4.3 Flow Graph Data Structure (New)

マルチシートおよび将来的な拡張性を考慮したJSONデータ構造。

```ts
// シート1枚の定義
export interface FlowSheet {
  id: string;
  name: string;
  nodes: Node[]; // React Flow Nodes
  edges: Edge[]; // React Flow Edges
  viewport?: { x: number; y: number; zoom: number };
}

// 保存されるJSONデータ全体
export interface FlowGraphData {
  sheets: FlowSheet[];
  activeSheetId: string;
  // 互換性のため直下にnodes/edgesを持つ場合もあるが、基本はsheetsを利用
}
```

---

## 5\. セキュリティと権限管理

### 5.1 アプリケーションレベルのRBAC

`server/service/AuthService.ts` にて、実行ユーザー（`Session.getActiveUser().getEmail()`）に基づいた権限チェックを行う。 Controllerの各関数の冒頭で権限検証を行い、不正なアクセスを遮断する。

```ts
// server/controller.ts 例
function saveDraft(flowId: string, jsonData: string) {
  const email = Session.getActiveUser().getEmail();
  
  // 権限チェック (なければThrow)
  AuthService.requirePermission(email, flowId, 'EDITOR');
  
  // 保存処理
  FlowService.saveDraft(flowId, jsonData, email);
}
```

---

## 6\. 開発・デプロイフロー

1. **ローカル開発:**  
   - `npm run dev`: Viteサーバー起動。  
   - モックデータを利用してUI/UXを確認。  
   - URL: `http://localhost:5173/?page=/flows/123` 等で動作確認。  
2. **ビルド:**  
   - `npm run build`: `vite-plugin-singlefile` 等により、アセットをインライン化した `dist/index.html` を生成。  
3. **デプロイ:**  
   - `clasp push`: `dist/index.html` と `server/` 配下のコードをGASへアップロード。  
   - Webアプリとしてデプロイ（新規バージョン作成）。

## 7\. フロントエンド機能実装詳細 (New)

### 7.1 BPMNカスタムノード実装方針

`@xyflow/react` を使用し、以下の仕様で実装する。

* **共通仕様**:
    * 接続ハンドルはホバー時のみ表示 (`opacity-0 group-hover:opacity-100`)。
    * 上下左右の全ハンドルが `source` / `target` 両対応。
    * ダークモード対応 (Tailwind CSS `dark:` クラスおよび CSS変数活用)。
* **スイムレーン (`BpmnSwimlaneNode`)**:
    * `nopan` クラスを除去し、ボディのドラッグでキャンバス移動を可能にする。
    * ヘッダー部分のみドラッグハンドル (`.lane-drag-handle`) として機能させる。
    * リサイズは `NodeResizeControl` を使用し、向きに応じて方向（右/下）を制限する。
* **その他ノード**:
    * SVGを活用し、拡大縮小に耐えうる描画を行う。
    * メッセージイベント等の「データ連携」は、接続状況に応じてハンドル位置やラベル位置を動的に計算する。

### 7.2 差分検知・承認フロー (Diff & Merge)

* **Diffロジック (`src/lib/diff-utils.ts`)**:
    * 現在のドラフト版と、比較対象（公開版）のノード/エッジIDをキーに突合する。
    * プロパティ（`data`）の差異を検出し、`added` / `deleted` / `modified` のステータスを付与する。
* **チェリーピック承認**:
    * Viewer上で各変更点に対し `accepted` (適用) / `rejected` (却下) を選択。
    * 承認実行時、`resolveDiff` 関数により最終的なノード/エッジリストを生成し、サーバーへ送信する。
