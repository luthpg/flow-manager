import type {
  DashboardFlowItem,
  FlowMeta,
  FlowRow,
  FlowVersionDetail,
  FlowVersionRow,
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

  /**
   * 下書き保存 (Save Draft)
   * - 指定されたユーザーのドラフトバージョンID (draft-user-date) を生成
   * - 既に同日のドラフトがあれば上書き、なければ新規作成
   */
  saveDraft(
    flowId: string,
    jsonData: string,
    userEmail: string,
    title?: string,
  ) {
    // 1. フローメタデータの更新
    if (title) {
      this.db.update(SHEET_NAMES.FLOWS, 'flow_id', flowId, {
        title: title,
        updated_at: new Date(),
      });
    }

    // 2. ドラフトIDの決定
    const targetVersionId = generateDraftVersionId(userEmail);

    const versions = this.db.getData<FlowVersionDetail>(
      SHEET_NAMES.FLOW_VERSIONS,
    );
    const existingDraft = versions.find(
      (v) => v.flow_id === flowId && v.version_id === targetVersionId,
    );

    if (existingDraft) {
      // 既存ドラフトの上書き
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'version_id', targetVersionId, {
        json_data: jsonData,
        updated_at: new Date(),
      });
      return targetVersionId;
    } else {
      // 新規ドラフト作成
      // 最新の version_num を取得して +1 する
      const flowVersions = versions.filter((v) => v.flow_id === flowId);
      const maxNum =
        flowVersions.length > 0
          ? Math.max(...flowVersions.map((v) => v.version_num))
          : 0;

      this.db.insert(SHEET_NAMES.FLOW_VERSIONS, {
        version_id: targetVersionId,
        flow_id: flowId,
        version_num: maxNum + 1,
        status: 'DRAFT',
        json_data: jsonData,
        created_by: userEmail,
        created_at: new Date(),
        comment: '',
      });

      // 親ステータス更新
      this.db.update(SHEET_NAMES.FLOWS, 'flow_id', flowId, {
        current_status: 'DRAFT',
        updated_at: new Date(),
      });

      return targetVersionId;
    }
  }

  /**
   * 承認申請 (Submit)
   * - ロックを取得し、ステータスをPENDINGに変更
   */
  submitFlow(flowId: string, versionId: string, comment: string) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONFIG.LOCK_WAIT_MS);

      // 指定されたバージョンID (ドラフト) を取得
      const versions = this.db.getData<FlowVersion>('Flow_Versions');
      const target = versions.find(
        (v) => v.version_id === versionId && v.flow_id === flowId,
      );

      if (!target || target.status !== 'DRAFT') {
        throw new Error(`申請可能な下書きが見つかりません: ${versionId}`);
      }

      // ステータス更新
      this.db.update('Flow_Versions', 'version_id', versionId, {
        status: 'PENDING',
        comment: comment,
      });

      this.db.update(SHEET_NAMES.FLOWS, 'flow_id', flowId, {
        current_status: 'PENDING',
        updated_at: new Date(),
      });
    } catch (e) {
      throw new Error(`排他制御エラー: ${e}`);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * フロー詳細取得
   * - IDとバージョンIDで一意に特定して返す
   */
  getFlowDetail(flowId: string, versionId: string) {
    const flowMeta = this.db
      .getData<FlowMeta>(SHEET_NAMES.FLOWS)
      .find((f) => f.flow_id === flowId);

    if (!flowMeta) throw new Error('Flow not found');

    const versions = this.db.getData<FlowVersion>(SHEET_NAMES.FLOW_VERSIONS);
    const targetVersion = versions.find(
      (v) => v.flow_id === flowId && v.version_id === versionId,
    );

    if (!targetVersion) {
      // 指定バージョンがない場合、かつEditorでない場合
      throw new Error(`Version ${versionId} not found for Flow ${flowId}`);
    }

    return {
      meta: flowMeta,
      version: targetVersion,
      graphData: JSON.parse(targetVersion.json_data),
    };
  }

  /**
   * 承認・公開 (Approve)
   * - ドラフト/申請中ID (draft-...) を リリースID (YYYYMMDD) に変更する
   * - つまり、レコードのID自体を書き換える (Approve = Release)
   */
  approveFlow(
    flowId: string,
    currentVersionId: string,
    approverEmail: string,
    comment: string,
    graphData?: object,
  ) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONFIG.LOCK_WAIT_MS);

      if (graphData) {
        this.db.update(
          SHEET_NAMES.FLOW_VERSIONS,
          'version_id',
          currentVersionId,
          {
            json_data: JSON.stringify(graphData),
            updated_at: new Date(),
          },
        );
      }

      const versions = this.db.getData<FlowVersion>(SHEET_NAMES.FLOW_VERSIONS);
      const targetVersion = versions.find(
        (v) => v.version_id === currentVersionId,
      );

      if (!targetVersion) throw new Error('Target version not found.');
      if (targetVersion.status !== 'PENDING') {
        throw new Error(
          `Cannot approve. Current status is ${targetVersion.status}.`,
        );
      }

      // 新しいリリースIDの生成
      const existingIds = versions
        .filter((v) => v.flow_id === flowId)
        .map((v) => v.version_id);

      const newVersionId = generateReleaseVersionId(existingIds);

      const newComment = targetVersion.comment
        ? `${targetVersion.comment}\n\n[Approved by ${approverEmail}]: ${comment}`
        : `[Approved by ${approverEmail}]: ${comment}`;

      this.db.update(
        SHEET_NAMES.FLOW_VERSIONS,
        'version_id',
        currentVersionId,
        {
          version_id: newVersionId,
          status: 'PUBLISHED',
          comment: newComment,
          updated_at: new Date(),
        },
      );

      // 親情報の更新
      this.db.update(SHEET_NAMES.FLOWS, 'flow_id', flowId, {
        current_status: 'PUBLISHED',
        active_version_id: newVersionId,
        updated_at: new Date(),
      });

      return newVersionId;
    } catch (e) {
      throw new Error(`Approval failed: ${e}`);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * 否認 (Reject)
   * - バージョンステータスを REJECTED に変更
   * - フロー管理簿のステータスも差し戻し状態にする
   */
  rejectFlow(
    flowId: string,
    versionId: string,
    rejecterEmail: string,
    comment: string,
  ) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONFIG.LOCK_WAIT_MS);

      // 1. 対象バージョンの確認
      const versions = this.db.getData<FlowVersion>('Flow_Versions');
      const targetVersion = versions.find((v) => v.version_id === versionId);

      if (!targetVersion) throw new Error('Target version not found.');
      if (targetVersion.status !== 'PENDING') {
        throw new Error(
          `Cannot reject. Current status is ${targetVersion.status}.`,
        );
      }

      // 2. バージョン情報の更新 (Status -> REJECTED)
      const newComment = targetVersion.comment
        ? `${targetVersion.comment}\n\n[Rejected by ${rejecterEmail}]: ${comment}`
        : `[Rejected by ${rejecterEmail}]: ${comment}`;

      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'version_id', versionId, {
        status: 'REJECTED',
        comment: newComment,
        updated_at: new Date(),
      });

      // 3. フロー親情報の更新
      // active_version_id は更新しない（以前の公開版を維持するため）
      // current_status は REJECTED にして、ダッシュボード等でわかるようにする
      this.db.update(SHEET_NAMES.FLOWS, 'flow_id', flowId, {
        current_status: 'REJECTED',
        updated_at: new Date(),
      });
    } catch (e) {
      throw new Error(`Rejection failed: ${e}`);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * ユーザーが閲覧可能なフローの一覧を取得
   */
  getFlowList(userEmail: string): FlowMeta[] {
    // 1. 権限があるフォルダIDを取得
    const allowedFolderIds = this.auth.getAuthorizedFolderIds(userEmail);

    // 2. 全フローデータを取得
    const allFlows = this.db.getData<FlowMeta>('Flows');

    // 3. フォルダIDに基づいてフィルタリング
    const visibleFlows = allFlows.filter((flow) =>
      allowedFolderIds.includes(flow.folder_id),
    );

    // 4. 更新日時順（降順）でソートして返す
    return visibleFlows.sort((a, b) => {
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }

  /**
   * ダッシュボード用: フロー一覧とフォルダ一覧を一括取得
   * - N+1問題を避けるため、全バージョンを一括取得してメモリ上で結合する
   */
  getDashboardData(userEmail: string): {
    flows: DashboardFlowItem[];
    folders: FolderMeta[];
  } {
    // 1. 権限確認: アクセス可能なフォルダIDリストを取得
    const allowedFolderIds = this.auth.getAuthorizedFolderIds(userEmail);

    // 2. データ一括取得 (Spreadsheetへのアクセスはここでまとめる)
    const allFolders = this.db.getData<FolderRow>(SHEET_NAMES.FOLDERS);
    const allFlows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);
    const allVersions = this.db.getData<FlowVersionRow>(
      SHEET_NAMES.FLOW_VERSIONS,
    );

    // 3. フォルダのフィルタリング & 変換
    const visibleFolders = allFolders
      .filter((f) => allowedFolderIds.includes(f.folderId))
      .map((f) => ({
        id: f.folderId,
        name: f.name,
        parentId: f.parentId,
      }));

    // 4. フローのフィルタリング
    // 権限のあるフォルダに属するフローのみ抽出
    const visibleFlows = allFlows.filter((f) =>
      allowedFolderIds.includes(f.folderId),
    );

    // 5. バージョン情報のグルーピング (FlowId -> VersionSummary[])
    const versionMap = new Map<string, FlowVersionSummary[]>();

    // 最新順にソートしておくとフロントで楽
    const sortedVersions = allVersions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const v of sortedVersions) {
      if (!versionMap.has(v.flowId)) {
        versionMap.set(v.flowId, []);
      }
      // jsonDataは除外して軽量化オブジェクトに変換
      versionMap.get(v.flowId)?.push(this.toVersionSummary(v));
    }

    // 6. DashboardFlowItem の構築
    const dashboardFlows: DashboardFlowItem[] = visibleFlows.map((flowRow) => {
      const meta = this.toFlowMeta(flowRow);
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
}
