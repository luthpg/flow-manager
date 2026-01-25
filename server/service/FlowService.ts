import type { FlowMeta } from '../../types/flow';
import { APP_CONFIG, SHEET_NAMES } from '../constants';
import { SheetDB } from '../repository/SheetDB';
import {
  type FlowRow,
  type FlowVersionRow,
  joinJsonChunks,
  splitJsonData,
  toFlowMeta,
  toFlowVersionDetail,
} from '../utils/data-mapper';
import {
  generateDraftVersionId,
  generateReleaseVersionId,
} from '../utils/version';
import { AuthService } from './AuthService';
import { LoggerService } from './LoggerService';

export class FlowService {
  private db: SheetDB;
  private auth: AuthService;
  private logger: LoggerService;

  constructor() {
    this.db = new SheetDB();
    this.auth = new AuthService();
    this.logger = new LoggerService();
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
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        title: title,
        updatedAt: new Date(),
      });
    }

    // 2. ドラフトIDの決定
    const targetVersionId = generateDraftVersionId(userEmail);
    const splitData = splitJsonData(jsonData);

    const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
    const existingDraft = versions.find(
      (v) => v.flowId === flowId && v.versionId === targetVersionId,
    );

    if (existingDraft) {
      // 既存ドラフトの上書き
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', targetVersionId, {
        ...splitData,
        updatedAt: new Date(),
      });
      return targetVersionId;
    } else {
      // 新規ドラフト作成
      // 最新の versionNum を取得して +1 する
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
        ...splitData,
        createdBy: userEmail,
        createdAt: new Date(),
        comment: '',
      });

      // 親ステータス更新
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'DRAFT',
        updatedAt: new Date(),
      });

      return targetVersionId;
    }
  }

  /**
   * 承認申請 (Submit)
   * - ロックを取得し、ステータスをPENDINGに変更
   */
  submitFlow(
    flowId: string,
    versionId: string,
    userEmail: string,
    comment: string,
  ) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(APP_CONFIG.LOCK_WAIT_MS);

      // 指定されたバージョンID (ドラフト) を取得
      const versions = this.db.getData<FlowVersionRow>(
        SHEET_NAMES.FLOW_VERSIONS,
      );
      const target = versions.find(
        (v) => v.versionId === versionId && v.flowId === flowId,
      );

      if (!target || target.status !== 'DRAFT') {
        throw new Error(`申請可能な下書きが見つかりません: ${versionId}`);
      }

      // ステータス更新
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', versionId, {
        status: 'PENDING',
        comment: comment,
      });

      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'PENDING',
        updatedAt: new Date(),
      });

      // ログ記録
      this.logger.log(
        'SUBMIT_FLOW',
        userEmail,
        flowId,
        `Version: ${versionId}`,
      );
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
    const flows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);
    const flowRow = flows.find((f) => f.flowId === flowId);

    if (!flowRow) throw new Error('Flow not found');

    const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
    const targetVersionRow = versions.find(
      (v) => v.flowId === flowId && v.versionId === versionId,
    );

    if (!targetVersionRow) {
      // 指定バージョンがない場合
      throw new Error(`Version ${versionId} not found for Flow ${flowId}`);
    }

    const flowMeta = toFlowMeta(flowRow);
    const versionDetail = toFlowVersionDetail(targetVersionRow);

    // JSON結合
    const jsonString = joinJsonChunks(targetVersionRow);

    return {
      meta: flowMeta,
      version: versionDetail,
      graphData: JSON.parse(jsonString),
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

      // 1. Get current draft
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

      // 2. Prepare Data (Handle graphData update if provided)
      // If graphData is provided, it should be reflected in both the Merged draft and the Published version.
      let commonData: Record<string, any> = {};
      if (graphData) {
        const jsonString = JSON.stringify(graphData);
        commonData = splitJsonData(jsonString);
      }

      const approvalComment = targetVersion.comment
        ? `${targetVersion.comment}\n\n[Approved by ${approverEmail}]: ${comment}`
        : `[Approved by ${approverEmail}]: ${comment}`;

      // 3. Mark Draft as MERGED
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', currentVersionId, {
        status: 'MERGED',
        comment: approvalComment,
        updatedAt: new Date(),
        ...commonData, // Update draft with latest content if provided
      });

      // 4. Create New PUBLISHED Version
      const existingIds = versions
        .filter((v) => v.flowId === flowId)
        .map((v) => v.versionId);

      // Note: We need to include 'currentVersionId' in existingIds calculation effectively?
      // generateReleaseVersionId checks for YYYYMMDD-NN formatting.
      // It doesn't matter if we pass the current draft id, it ignores it or handles it.

      const newVersionId = generateReleaseVersionId(existingIds);

      // Construct row for insertion
      // Base it on targetVersion (which has flowId, versionNum, createdBy etc.)
      // But we update status, versionId, etc.

      const publishedRow: FlowVersionRow = {
        ...targetVersion,
        ...commonData, // Apply latest graphData
        versionId: newVersionId,
        status: 'PUBLISHED',
        comment: approvalComment,
        updatedAt: new Date(), // Published time
        // versionNum? Should we increment?
        // Logic: Releases might want sequential versionNums?
        // Existing logic for drafts was `maxNum + 1`.
        // If we reuse the draft's versionNum, it might handle continuity.
        // But usually 'Release' differs from 'Draft' numbering?
        // Let's keep the draft's versionNum for now as 'this draft became this release'.
      };

      this.db.insert(SHEET_NAMES.FLOW_VERSIONS, publishedRow);

      // 5. Update Parent Flow Meta
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'PUBLISHED',
        activeVersionId: newVersionId,
        updatedAt: new Date(),
      });

      // ログ記録
      this.logger.log(
        'APPROVE_FLOW',
        approverEmail,
        flowId,
        `New Version: ${newVersionId}`,
      );

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

      // 2. バージョン情報の更新 (Status -> REJECTED)
      const newComment = targetVersion.comment
        ? `${targetVersion.comment}\n\n[Rejected by ${rejecterEmail}]: ${comment}`
        : `[Rejected by ${rejecterEmail}]: ${comment}`;

      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'versionId', versionId, {
        status: 'REJECTED',
        comment: newComment,
        updatedAt: new Date(),
      });

      // 3. フロー親情報の更新
      this.db.update(SHEET_NAMES.FLOWS, 'flowId', flowId, {
        currentStatus: 'REJECTED',
        updatedAt: new Date(),
      });

      // ログ記録
      this.logger.log(
        'REJECT_FLOW',
        rejecterEmail,
        flowId,
        `Version: ${versionId}`,
      );
    } catch (e) {
      throw new Error(`Rejection failed: ${e}`);
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * フローの全バージョンを取得
   */
  getFlowVersions(flowId: string) {
    const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
    return versions
      .filter((v) => v.flowId === flowId)
      .sort((a, b) => b.versionNum - a.versionNum)
      .map(toFlowVersionDetail);
  }

  /**
   * フロー検索
   */
  searchFlows(userEmail: string, query: string): FlowMeta[] {
    const allowedFolderIds = this.auth.getAuthorizedFolderIds(userEmail);
    const allFlows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);

    const lowerQuery = query.toLowerCase();

    return allFlows
      .filter((flow) => {
        const isVisible = allowedFolderIds.includes(flow.folderId);
        if (!isVisible) return false;

        const matchTitle = flow.title.toLowerCase().includes(lowerQuery);
        const matchStatus = flow.currentStatus
          .toLowerCase()
          .includes(lowerQuery);
        return matchTitle || matchStatus;
      })
      .sort((a, b) => {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })
      .map(toFlowMeta);
  }

  /**
   * ユーザーが閲覧可能なフローの一覧を取得
   */
  getFlowList(userEmail: string): FlowMeta[] {
    // 1. 権限があるフォルダIDを取得
    const allowedFolderIds = this.auth.getAuthorizedFolderIds(userEmail);

    // 2. 全フローデータを取得
    const allFlows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);

    // 3. フォルダIDに基づいてフィルタリング
    const visibleFlows = allFlows.filter((flow) =>
      allowedFolderIds.includes(flow.folderId),
    );

    // 4. 更新日時順（降順）でソートし、Metaに変換して返す
    return visibleFlows
      .sort((a, b) => {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })
      .map(toFlowMeta);
  }
}
