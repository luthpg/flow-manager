# 詳細設計書：フローチャート作成・管理システム

## 1. システムアーキテクチャ

### 1.1 技術スタック
* **Frontend**:
    * React 19, TypeScript
    * Build: Vite (Single File Build)
    * UI: Tailwind CSS, Shadcn UI
    * Diagram: @xyflow/react (React Flow)
    * State: Zustand + Immer
    * Routing: @ciderjs/city-gas (Query Parameter Routing)
* **Backend**:
    * Google Apps Script (V8 Runtime)
    * Communication: @ciderjs/gasnuki (Type-safe RPC)
* **Database**:
    * Google Spreadsheet

### 1.2 ディレクトリ構造
```text
root/
├── .docs/              # ドキュメント
├── server/             # GASバックエンドコード
│   ├── controller.ts   # APIエンドポイント
│   ├── service/        # ビジネスロジック
│   ├── repository/     # DBアクセス (SheetDB)
│   └── app.ts          # エントリーポイント
├── src/                # フロントエンドコード
│   ├── components/     # UIコンポーネント
│   ├── hooks/          # 汎用Hooks
│   ├── lib/            # ユーティリティ (BPMNロジック, Diff等)
│   ├── pages/          # ページコンポーネント (Dashboard, Editor, Viewer)
│   ├── store/          # Zustandストア (Flow, Dashboard, Viewer)
│   └── main.tsx        # エントリーポイント
├── types/              # 共通型定義
│   ├── appsscript/     # APIレスポンス型
│   └── flow.ts         # ドメインモデル & DBスキーマ
└── vite.config.ts      # ビルド設定
```

## 2. データベース設計 (Spreadsheet Schema)

全テーブルでスネークケースのカラム名を使用し、コード上でキャメルケースにマッピングする。

### 2.1 シート一覧
1.  **System_Users**: ユーザー情報
2.  **Folders**: フォルダ管理
3.  **Folder_Permissions**: 権限管理
4.  **Flows**: フローのメタデータ
5.  **Flow_Versions**: フローの実データ（履歴）

### 2.2 主要テーブル定義

**A. Flows (フロー管理簿)**
| Column | Key | Description |
| :--- | :--- | :--- |
| A | `flow_id` | UUID (PK) |
| B | `folder_id` | 所属フォルダID |
| C | `title` | フロー名称 |
| D | `current_status` | 最新ステータス (DRAFT/PENDING/PUBLISHED/REJECTED) |
| E | `active_version_id` | 公開中のバージョンID (FK) |
| F | `updated_at` | 最終更新日時 (ISO) |

**B. Flow_Versions (バージョン履歴)**
| Column | Key | Description |
| :--- | :--- | :--- |
| A | `version_id` | バージョンID (`draft-{uid}-{date}` or `YYYYMMDD-nn`) |
| B | `flow_id` | 親フローID (FK) |
| C | `version_num` | 版数 (連番) |
| D | `status` | このバージョンのステータス |
| E | `json_data` | **GraphData (Sheets, Nodes, Edges) のJSON文字列** |
| F | `created_by` | 作成者Email |
| G | `created_at` | 作成日時 |
| H | `comment` | 申請/承認コメント履歴 |

## 3. データモデル (TypeScript Interfaces)

### 3.1 共通型 (`types/flow.ts`)
DBスキーマ型 (`Row`) とドメインモデル型を分離して定義する。

```typescript
// Domain Models (CamelCase)
export interface FlowMeta {
  flowId: string;
  folderId: string;
  title: string;
  currentStatus: FlowStatus;
  activeVersionId: string;
  updatedAt: string;
}

export interface FlowGraphData {
  sheets: FlowSheet[]; // マルチシート対応
  activeSheetId: string;
}

export interface FlowSheet {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}
```

## 4. バックエンド設計 (GAS)

### 4.1 APIエンドポイント (`server/controller.ts`)
`@ciderjs/gasnuki` を使用し、JSON文字列化されたレスポンスを返す。

* **`getFlows()`**:
    * ユーザーの権限に基づき、閲覧可能なフォルダとフローの一覧を返す。
    * N+1問題を回避するため、全データを一括取得しメモリ上で結合して返す。
    * Response: `{ flows: DashboardFlowItem[], folders: FolderMeta[] }`
* **`getFlowData(flowId, versionId)`**:
    * 指定されたフロー・バージョンの詳細データを返す。
    * 権限チェック (`VIEWER`以上) を実施。
    * Response: `FlowDetailResponse` (Meta + GraphData + VersionDetail)
* **`saveDraft(payload)`**:
    * 下書き保存。`json_data` をJSON文字列としてDBに保存。
    * 権限: `EDITOR`以上。
* **`submitFlow(payload)`**:
    * ステータスを `PENDING` に更新。
* **`approveFlow(payload)`**:
    * ステータスを `PUBLISHED` に更新し、バージョンIDを正式版 (`YYYYMMDD`) に採番し直す。
    * 権限: `APPROVER`以上。
* **`rejectFlow(payload)`**:
    * ステータスを `REJECTED` に更新。

### 4.2 サービス層 (`server/service/`)
* **`AuthService`**: ユーザーEmailとフォルダIDに基づき、`VIEWER`, `EDITOR`, `APPROVER`, `ADMIN` の権限判定を行う。
* **`FlowService`**: DBアクセス、排他制御 (`LockService`)、ID採番、スネークケース⇔キャメルケースの変換を担当。

## 5. フロントエンド設計

### 5.1 状態管理 (Zustand Stores)
3つのストアに分離して管理する。

1.  **`useDashboardStore`**:
    * フロー一覧、フォルダ一覧、検索クエリ、フィルタ状態を管理。
    * 責務: ダッシュボード表示用データのフェッチと加工。
2.  **`useFlowStore` (Editor用)**:
    * **Immer** ミドルウェアを使用し、ネストされたオブジェクト（Sheets > Nodes）を安全に更新。
    * `sheets`, `activeSheetId`, `nodes`, `edges` を管理。
    * `histories`: シートごとの Undo/Redo スタックを管理。
    * アクション: `addSheet`, `onNodesChange`, `takeSnapshot` 等。
3.  **`useViewerStore` (Viewer用)**:
    * 閲覧専用データの保持。
    * **Diffロジック**: 比較対象（公開版）との差分を計算し、`rawDiffResult` として保持。
    * アクション: `toggleDiffMode`, `approveFlow`, `rejectFlow`。

### 5.2 コンポーネント設計
* **`pages/`**: ルーティングのエントリーポイント。ストアへのデータロードとレイアウト定義のみを行う。
* **`components/ui/`**: Shadcn UIベースの汎用コンポーネント。
* **`components/custom-nodes.tsx`**: React Flowのカスタムノード（Task, Gateway, Swimlane等）。`memo`化によりレンダリングを最適化。
* **`components/sheet-tabs.tsx`**: ドラッグ＆ドロップ可能なシート切り替えタブ。
* **`components/dashboard/`**: ダッシュボード固有パーツ（SidebarNav, FlowCard）。

### 5.3 差分検知ロジック (`lib/diff-utils.ts`)
* **アルゴリズム**:
    1.  ノードIDをキーとして、新旧のノードリストを突合。
    2.  IDが存在しない場合 -> `added` / `deleted`
    3.  IDが存在する場合 -> プロパティ (`data`, `style`) を比較し、差異があれば `modified`。
    4.  エッジも同様に比較。
* **表示**: `_diff` プロパティをノードデータに注入し、エディタ/ビューワー側でスタイル（色、枠線）を動的に変更する。

### 5.4 バリデーション (`lib/bpmn-logic.ts`)
* **BPMNルールチェック**:
    * 開始イベントに入力があってはならない。
    * 終了イベントから出力があってはならない。
    * 孤立したノードの検知。
* **自動整形**:
    * ノード座標をグリッド（スロット）に吸着させる。
    * スイムレーンのサイズを内包するノードに合わせて自動拡張する。
