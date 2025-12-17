import type {
  AdvancedSearchQuery,
  DashboardFlowItem,
  FlowGraphData,
  FlowMeta,
  FlowRow,
  FlowStatus,
  FlowVersionRow,
  FlowVersionSummary,
  FolderMeta,
  FolderRow,
} from '~/types/flow';
import { APP_CONFIG, SHEET_NAMES } from '../constants';
import { SheetDB } from '../repository/SheetDB';
import {
  generateDraftVersionId,
  generateReleaseVersionId,
} from '../utils/version';
import { AuthService } from './AuthService';

export class FlowService {
  private db: SheetDB;
  private auth: AuthService;

  constructor() {
    this.db = new SheetDB();
    this.auth = new AuthService();
  }

  // =================================================================
  // Helper Methods: Data Conversion
  // =================================================================

  /**
   * DB行データ(FlowRow)をドメインモデル(FlowMeta)に変換
   * ※DBカラムもキャメルケース前提のため、基本はそのまま利用するが
   * 型安全と将来的な拡張のために明示的にマッピングを行う
   */
  private toFlowMeta(row: FlowRow): FlowMeta {
    return {
      flowId: row.flowId,
      folderId: row.folderId,
      title: row.title,
      currentStatus: row.currentStatus as FlowStatus,
      activeVersionId: row.activeVersionId,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * DB行データ(FlowVersionRow)を要約情報(FlowVersionSummary)に変換
   * ※巨大な jsonData を除外して軽量化する
   */
  private toVersionSummary(row: FlowVersionRow): FlowVersionSummary {
    return {
      versionId: row.versionId,
      versionNum: row.versionNum,
      status: row.status as FlowStatus,
      comment: row.comment,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }

  // =================================================================
  // Main Features: Dashboard & Search
  // =================================================================

  /**
   * ダッシュボード用データ取得 (最適化版)
   * - フォルダ一覧、フロー一覧、全バージョン履歴を一括取得
   * - N+1問題を回避し、jsonDataを除外して軽量化
   */
  getDashboardData(userEmail: string): {
    flows: DashboardFlowItem[];
    folders: FolderMeta[];
  } {
    // 1. 権限確認: アクセス可能なフォルダIDリストを取得
    const allowedFolderIds = this.auth.getAuthorizedFolderIds(userEmail);

    // 2. データ一括取得 (Spreadsheet APIコール回数削減)
    const allFolders = this.db.getData<FolderRow>(SHEET_NAMES.FOLDERS);
    const allFlows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);
    const allVersions = this.db.getData<FlowVersionRow>(
      SHEET_NAMES.FLOW_VERSIONS,
    );

    // 3. フォルダのフィルタリング & 変換
    const visibleFolders: FolderMeta[] = allFolders
      .filter((f) => allowedFolderIds.includes(f.folderId))
      .map((f) => ({
        id: f.folderId,
        name: f.name,
        parentId: f.parentId,
      }));

    // 4. フローのフィルタリング
    // フォルダ権限に基づいてフローを絞り込む
    const visibleFlows = allFlows.filter((f) =>
      allowedFolderIds.includes(f.folderId),
    );

    // 5. バージョン情報のグルーピング (FlowId -> VersionSummary[])
    // バージョンを作成日時の降順（新しい順）でソートしてからマップする
    const versionMap = new Map<string, FlowVersionSummary[]>();
    const sortedVersions = allVersions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const v of sortedVersions) {
      if (!versionMap.has(v.flowId)) {
        versionMap.set(v.flowId, []);
      }
      // toVersionSummary を通すことで jsonData (巨大文字列) が除外される
      versionMap.get(v.flowId)?.push(this.toVersionSummary(v));
    }

    // 6. DashboardFlowItem の構築
    const dashboardFlows: DashboardFlowItem[] = visibleFlows.map((flowRow) => {
      const meta = this.toFlowMeta(flowRow);
      // 関連するバージョン一覧を取得（なければ空配列）
      const versions = versionMap.get(flowRow.flowId) || [];
      return {
        ...meta,
        versions,
      };
    });

    // 最終更新順でソート
    dashboardFlows.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return {
      flows: dashboardFlows,
      folders: visibleFolders,
    };
  }

  /**
   * 詳細検索 (Advanced Search)
   * ノード情報(jsonData)を含めた検索を行う
   */
  searchFlows(
    query: AdvancedSearchQuery,
    userEmail: string,
  ): {
    flows: DashboardFlowItem[];
    folders: FolderMeta[];
  } {
    const { keyword, targetField } = query;
    // キーワードが空なら通常のダッシュボードデータを返す
    if (!keyword) return this.getDashboardData(userEmail);

    // 1. 基本データの取得と権限フィルタリング
    const allowedFolderIds = this.auth.getAuthorizedFolderIds(userEmail);
    const allFolders = this.db.getData<FolderRow>(SHEET_NAMES.FOLDERS);
    const allFlows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);
    const allVersions = this.db.getData<FlowVersionRow>(
      SHEET_NAMES.FLOW_VERSIONS,
    );

    const visibleFolders = allFolders
      .filter((f) => allowedFolderIds.includes(f.folderId))
      .map((f) => ({ id: f.folderId, name: f.name, parentId: f.parentId }));

    const visibleFlows = allFlows.filter((f) =>
      allowedFolderIds.includes(f.folderId),
    );
    const visibleFlowIds = new Set(visibleFlows.map((f) => f.flowId));

    // 2. 検索対象となるバージョンの特定
    // 各フローにつき「最新のバージョン（ドラフト含む）」のみを検索対象とする
    const targetVersions = new Map<string, FlowVersionRow>();

    const sortedVersions = allVersions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const v of sortedVersions) {
      if (!visibleFlowIds.has(v.flowId)) continue;
      // まだ登録されていなければ（＝そのフローの最新版）、対象に追加
      if (!targetVersions.has(v.flowId)) {
        targetVersions.set(v.flowId, v);
      }
    }

    // 3. コンテンツ検索実行
    const hitFlowIds = new Set<string>();
    const lowerKeyword = keyword.toLowerCase();

    for (const [flowId, version] of targetVersions) {
      // Step A: 文字列としての簡易チェック (高速化)
      // JSONパース前に単純な文字列マッチングで絞り込む
      if (!version.jsonData.toLowerCase().includes(lowerKeyword)) {
        continue;
      }

      // Step B: JSONパースして詳細フィールドチェック
      try {
        const graphData = JSON.parse(version.jsonData) as FlowGraphData;
        let isHit = false;

        // 全シート・全ノードを走査
        for (const sheet of graphData.sheets) {
          for (const node of sheet.nodes) {
            const data = node.data as any;
            if (!data) continue;

            const label = String(data.label || '').toLowerCase();
            const description = String(data.description || '').toLowerCase();
            const assignee = String(data.assignee || '').toLowerCase();

            if (targetField === 'all') {
              if (
                label.includes(lowerKeyword) ||
                description.includes(lowerKeyword) ||
                assignee.includes(lowerKeyword)
              ) {
                isHit = true;
              }
            } else if (targetField === 'label') {
              if (label.includes(lowerKeyword)) isHit = true;
            } else if (targetField === 'description') {
              if (description.includes(lowerKeyword)) isHit = true;
            } else if (targetField === 'assignee') {
              if (assignee.includes(lowerKeyword)) isHit = true;
            }

            if (isHit) break;
          }
          if (isHit) break;
        }

        if (isHit) {
          hitFlowIds.add(flowId);
        }
      } catch (e) {
        console.warn(`Failed to parse json for flow ${flowId}`, e);
      }
    }

    // 4. 結果の構築
    // ヒットしたフローに関連するバージョン情報などを付与して返す
    const versionMap = new Map<string, FlowVersionSummary[]>();
    for (const v of sortedVersions) {
      if (hitFlowIds.has(v.flowId)) {
        if (!versionMap.has(v.flowId)) versionMap.set(v.flowId, []);
        versionMap.get(v.flowId)?.push(this.toVersionSummary(v));
      }
    }

    const dashboardFlows: DashboardFlowItem[] = visibleFlows
      .filter((f) => hitFlowIds.has(f.flowId))
      .map((row) => {
        const meta = this.toFlowMeta(row);
        return {
          ...meta,
          versions: versionMap.get(row.flowId) || [],
        };
      });

    return {
      flows: dashboardFlows,
      folders: visibleFolders,
    };
  }

  // =================================================================
  // Core Logic: CRUD & Workflow
  // =================================================================

  /**
   * フロー詳細取得
   * - 編集画面・閲覧画面用
   * - 指定されたバージョンIDの完全なデータ(GraphData含む)を返す
   */
  getFlowDetail(
    flowId: string,
    versionId: string,
  ): {
    meta: FlowMeta;
    versionSummary: FlowVersionSummary;
    graphData: FlowGraphData;
  } {
    // 1. メタデータ取得
    const flows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);
    const flowRow = flows.find((f) => f.flowId === flowId);
    if (!flowRow) throw new Error('Flow not found');

    const flowMeta = this.toFlowMeta(flowRow);

    // 2. バージョンデータ取得
    const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
    const targetVersion = versions.find(
      (v) => v.flowId === flowId && v.versionId === versionId,
    );

    if (!targetVersion) {
      throw new Error(`Version ${versionId} not found for Flow ${flowId}`);
    }

    // 3. データ整形
    let graphData: FlowGraphData;
    try {
      graphData = JSON.parse(targetVersion.jsonData); // jsonData (CamelCase)
    } catch (e) {
      console.error('Failed to parse graph data', e);
      // パースエラー時は空データを返す（システムエラーにしない）
      graphData = { sheets: [], activeSheetId: '' };
    }

    const versionSummary = this.toVersionSummary(targetVersion);

    return {
      meta: flowMeta,
      versionSummary,
      graphData,
    };
  }

  /**
   * 下書き保存
   * - 既に同日のドラフトがあれば上書き、なければ新規作成
   */
  saveDraft(
    flowId: string,
    graphData: object,
    userEmail: string,
    title?: string,
  ): string {
    // 1. メタデータ更新
    if (title) {
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        title: title,
        updatedAt: new Date(),
      });
    }

    const targetVersionId = generateDraftVersionId(userEmail);
    const jsonString = JSON.stringify(graphData);

    const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
    const existingDraft = versions.find(
      (v) => v.flowId === flowId && v.versionId === targetVersionId,
    );

    // 2. バージョン保存 (Upsert)
    if (existingDraft) {
      // 既存ドラフトの上書き
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', targetVersionId, {
        jsonData: jsonString,
        updatedAt: new Date(),
      });
      return targetVersionId;
    } else {
      // 新規ドラフト作成 (versionNumをインクリメント)
      const flowVersions = versions.filter((v) => v.flowId === flowId);
      const maxNum =
        flowVersions.length > 0
          ? Math.max(...flowVersions.map((v) => v.versionNum))
          : 0;

      this.db.insert(SHEET_NAMES.FLOW_VERSIONS, {
        versionId: targetVersionId,
        flowId: flowId,
        versionNum: maxNum + 1,
        status: 'DRAFT',
        jsonData: jsonString,
        createdBy: userEmail,
        createdAt: new Date(),
        comment: '',
      });

      // 親ステータスの更新
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'DRAFT',
        updatedAt: new Date(),
      });

      return targetVersionId;
    }
  }

  /**
   * 承認申請
   */
  submitFlow(flowId: string, versionId: string, comment: string): void {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONFIG.LOCK_WAIT_MS);

      const versions = this.db.getData<FlowVersionRow>(
        SHEET_NAMES.FLOW_VERSIONS,
      );
      const target = versions.find(
        (v) => v.versionId === versionId && v.flowId === flowId,
      );

      if (!target || target.status !== 'DRAFT') {
        throw new Error('申請可能な下書きが見つかりません: ' + versionId);
      }

      // バージョンステータス更新
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', versionId, {
        status: 'PENDING',
        comment: comment,
      });

      // フローステータス更新
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'PENDING',
        updatedAt: new Date(),
      });
    } catch (e) {
      throw new Error(`排他制御エラー: ${e}`);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * 承認・公開
   * - ドラフト/申請中IDをリリースIDに書き換える
   */
  approveFlow(
    flowId: string,
    currentVersionId: string,
    approverEmail: string,
    comment: string,
    graphData?: object,
  ): string {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONFIG.LOCK_WAIT_MS);

      // graphDataが渡された場合（Cherry-pick等）、データを更新
      if (graphData) {
        this.db.update(
          SHEET_NAMES.FLOW_VERSIONS,
          'versionId',
          currentVersionId,
          {
            jsonData: JSON.stringify(graphData),
            updatedAt: new Date(),
          },
        );
      }

      const versions = this.db.getData<FlowVersionRow>(
        SHEET_NAMES.FLOW_VERSIONS,
      );
      const targetVersion = versions.find(
        (v) => v.versionId === currentVersionId,
      );

      if (!targetVersion) throw new Error('Target version not found.');
      if (targetVersion.status !== 'PENDING') {
        throw new Error(
          `Cannot approve. Current status is ${targetVersion.status}.`,
        );
      }

      // 新しいリリースIDの生成 (YYYYMMDD-nnn)
      const existingIds = versions
        .filter((v) => v.flowId === flowId)
        .map((v) => v.versionId);

      const newVersionId = generateReleaseVersionId(existingIds);

      // コメントの追記
      const newComment = targetVersion.comment
        ? `${targetVersion.comment}\n\n[Approved by ${approverEmail}]: ${comment}`
        : `[Approved by ${approverEmail}]: ${comment}`;

      // バージョン情報の更新 (ID書き換え + PUBLISHED)
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', currentVersionId, {
        versionId: newVersionId,
        status: 'PUBLISHED',
        comment: newComment,
        updatedAt: new Date(),
      });

      // 親情報の更新 (activeVersionId更新)
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'PUBLISHED',
        activeVersionId: newVersionId,
        updatedAt: new Date(),
      });

      return newVersionId;
    } catch (e) {
      throw new Error(`Approval failed: ${e}`);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * 否認
   */
  rejectFlow(
    flowId: string,
    versionId: string,
    rejecterEmail: string,
    comment: string,
  ): void {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONFIG.LOCK_WAIT_MS);

      const versions = this.db.getData<FlowVersionRow>(
        SHEET_NAMES.FLOW_VERSIONS,
      );
      const targetVersion = versions.find((v) => v.versionId === versionId);

      if (!targetVersion) throw new Error('Target version not found.');
      if (targetVersion.status !== 'PENDING') {
        throw new Error(
          `Cannot reject. Current status is ${targetVersion.status}.`,
        );
      }

      const newComment = targetVersion.comment
        ? `${targetVersion.comment}\n\n[Rejected by ${rejecterEmail}]: ${comment}`
        : `[Rejected by ${rejecterEmail}]: ${comment}`;

      // バージョンステータス更新
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', versionId, {
        status: 'REJECTED',
        comment: newComment,
        updatedAt: new Date(),
      });

      // フローステータス更新
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'REJECTED',
        updatedAt: new Date(),
      });
    } catch (e) {
      throw new Error(`Rejection failed: ${e}`);
    } finally {
      lock.releaseLock();
    }
  }
}
