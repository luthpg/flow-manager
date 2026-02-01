# 残タスク一覧

現在の実装状況（`v0.x`）に基づき、Enterprise向けアプリケーションとして必要な残タスクを整理しました。

## 1. フロントエンド (Frontend)

### 1.1 権限管理のUI/UX (Priority: High)

- **現状**:
  - `edit.tsx` にて `userRole` に基づく簡易的なアクセス制御（VIEWERのリダイレクト）は実装済み。
  - `Preview` 画面と `Edit` 画面の役割分担、ボタンの出し分け（承認/否認）が完全に連動しているか最終確認が必要。
- **タスク**:
  - `Preview` 画面（`preview.tsx`）の実装確認と、権限によるボタン制御（Approve/Reject）のテスト。
  - 権限がないユーザーがURL直打ちでアクセスした際のハンドリング強化（Error Boundary等）。

### 1.2 エディタ機能の研磨 (Priority: Medium)

- **スイムレーンの操作性向上**:
  - **現状**: `onNodeDrag` に自動拡張ロジックはあるが、ユーザー体験としてスムーズか検証が必要。
  - **タスク**: ドラッグ中の拡張挙動の微調整（感度、拡張方向の明示）。
- **[完了] クロスシート/クロスフロー コピー＆ペースト**:
  - `localStorage` を利用した実装完了 (`edit.tsx`).
- **[完了] JSONインポート機能**:
  - 実装完了 (`edit.tsx` のメニューに追加済み).

### 1.3 管理画面 (Admin UI) (Priority: Medium)

- **監査ログ閲覧**:
  - **現状**: バックエンド (`LoggerService`) は実装済みだが、閲覧するUIがない。
  - **タスク**: ダッシュボードまたは設定画面に「監査ログ (Audit Log)」タブを追加し、`System_Logs` の内容を表示する。

## 2. バックエンド (Server / GAS)

### 2.1 排他制御の高度化 (Priority: Low)

- **現状**: Heartbeat (`startEditing`) による5分間のロック更新機構は実装済み。
- **タスク**:
  - ロック奪取（強制解除）機能の管理者向け提供（現在は5分待機のみ）。

### 2.2 [完了] 監査ログ基盤

- `LoggerService` および `FlowService`/`AuthService` への組み込み完了。

## 3. テスト (Testing)

### 3.1 権限・セキュリティの結合テスト (Priority: High)

- **タスク**:
  - `VIEWER` ユーザーがAPI (`saveDraft`, `submitFlow`) を直接叩いた場合に `AuthService` が正しくエラーを返すかテストコードで保証する。
  - フォルダ権限の継承ロジックのテスト。

---

## 完了したタスク (Completed)

- [x] **コピー＆ペースト**: LocalStorageを使用したクロスシート/タブ対応。
- [x] **JSON Import**: エディタメニューへの実装。
- [x] **監査ログ基盤**: `LoggerService` 実装と主要アクション (`Approve`, `Reject`, `Submit`) へのフック。
- [x] **非破壊的マージ**: `FlowService` での実装。
- [x] **マルチシートDiff**: `diff-utils.ts`。
- [x] **基本エディタ機能**: タブ、BPMNノード、自動整列。
