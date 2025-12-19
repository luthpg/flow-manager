import { APP_CONFIG, SHEET_NAMES } from '../constants';
import { SheetDB } from '../repository/SheetDB';
import {
  generateDraftVersionId,
  generateReleaseVersionId,
} from '../utils/version';
import { AuthService } from './AuthService';
import type {
  FlowMeta,
} from '../../types/flow';
import {
  type FlowRow,
  type FlowVersionRow,
  joinJsonChunks,
  splitJsonData,
  toFlowMeta,
  toFlowVersionDetail,
} from '../utils/data-mapper';

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
    const splitData = splitJsonData(jsonData);

    const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
    const existingDraft = versions.find(
      (v) => v.flow_id === flowId && v.version_id === targetVersionId,
    );

    if (existingDraft) {
      // 既存ドラフトの上書き
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'version_id', targetVersionId, {
        ...splitData,
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
        ...splitData,
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
      const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
      const target = versions.find(
        (v) => v.version_id === versionId && v.flow_id === flowId,
      );

      if (!target || target.status !== 'DRAFT') {
        throw new Error('申請可能な下書きが見つかりません: ' + versionId);
      }

      // ステータス更新
      this.db.update(SHEET_NAMES.FLOW_VERSIONS, 'version_id', versionId, {
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
    const flows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);
    const flowRow = flows.find((f) => f.flow_id === flowId);

    if (!flowRow) throw new Error('Flow not found');

    const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
    const targetVersionRow = versions.find(
      (v) => v.flow_id === flowId && v.version_id === versionId,
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

      let updateData: Record<string, any> = {
        updated_at: new Date(),
      };

      if (graphData) {
        const jsonString = JSON.stringify(graphData);
        const splitData = splitJsonData(jsonString);
        updateData = { ...updateData, ...splitData };
      }

      // まず更新データを適用 (グラフデータがある場合)
      if (Object.keys(updateData).length > 1) { // updated_at以外がある場合
         this.db.update(
          SHEET_NAMES.FLOW_VERSIONS,
          'version_id',
          currentVersionId,
          updateData,
        );
      }

      const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
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

      // ID書き換えとステータス更新
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
      const versions = this.db.getData<FlowVersionRow>(SHEET_NAMES.FLOW_VERSIONS);
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
    const allFlows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);

    // 3. フォルダIDに基づいてフィルタリング
    const visibleFlows = allFlows.filter((flow) =>
      allowedFolderIds.includes(flow.folder_id),
    );

    // 4. 更新日時順（降順）でソートし、Metaに変換して返す
    return visibleFlows
      .sort((a, b) => {
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      })
      .map(toFlowMeta);
  }
}
