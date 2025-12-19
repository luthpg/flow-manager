import type {
  FlowData,
  FlowGraphData,
  FlowMeta,
  Role,
} from '~/types/flow';
import { AuthService } from './service/AuthService';
import { FlowService } from './service/FlowService';
import { response } from './utils/response';

const flowService = new FlowService();
const authService = new AuthService();

/**
 * ダッシュボード用: フロー一覧取得
 * - 権限: ログインユーザーに関連するフォルダのフローのみ
 */
export function getFlows(): string {
  try {
    const email = Session.getActiveUser().getEmail();

    // サービス層で権限フィルタリング済みのリストを取得
    const flows: FlowMeta[] = flowService.getFlowList(email);

    return response.success(flows);
  } catch (e) {
    return response.error(e instanceof Error ? e.message : String(e));
  }
}

/**
 * 編集画面・閲覧画面データ取得
 * - 必須: flowId, versionId
 */
export function getFlowData(flowId: string, versionId: string): string {
  try {
    const email = Session.getActiveUser().getEmail();

    // 権限チェック
    authService.requirePermission(email, flowId, 'VIEWER');

    // 権限レベル取得
    const role = authService.getRole(email, flowId);

    // 指定バージョンを取得
    const result = flowService.getFlowDetail(flowId, versionId);

    const responseData: FlowData & { userRole: Role | null } = {
      ...result,
      userRole: role,
    };

    return response.success(responseData);
  } catch (e) {
    return response.error(e instanceof Error ? e.message : String(e));
  }
}

/**
 * 下書き保存
 * - 権限: EDITOR以上
 */
export function saveDraft(payload: {
  flowId: string;
  title: string;
  graphData: FlowGraphData;
}): string {
  try {
    const email = Session.getActiveUser().getEmail();

    // ▼ 権限チェック: 編集にはEDITOR以上が必要
    authService.requirePermission(email, payload.flowId, 'EDITOR');

    const jsonString = JSON.stringify(payload.graphData);
    const versionId = flowService.saveDraft(
      payload.flowId,
      jsonString,
      email,
      payload.title,
    );
    return response.success({ versionId });
  } catch (e) {
    return response.error(e instanceof Error ? e.message : String(e));
  }
}

/**
 * 承認申請
 * - 権限: EDITOR以上
 */
export function submitFlow(payload: {
  flowId: string;
  versionId: string;
  comment: string;
}): string {
  try {
    const email = Session.getActiveUser().getEmail();

    // ▼ 権限チェック
    authService.requirePermission(email, payload.flowId, 'EDITOR');

    flowService.submitFlow(payload.flowId, payload.versionId, payload.comment);
    return response.success({ status: 'PENDING' });
  } catch (e) {
    return response.error(e instanceof Error ? e.message : String(e));
  }
}

/**
 * 承認実行 (Approve)
 * - 権限: APPROVER以上
 */
export function approveFlow(payload: {
  flowId: string;
  versionId: string;
  comment: string;
  graphData?: FlowGraphData;
}): string {
  try {
    const email = Session.getActiveUser().getEmail();

    // ▼ 権限チェック: APPROVER以上が必要
    authService.requirePermission(email, payload.flowId, 'APPROVER');

    const newVersionId = flowService.approveFlow(
      payload.flowId,
      payload.versionId,
      email,
      payload.comment,
      payload.graphData,
    );

    return response.success({ status: 'PUBLISHED', versionId: newVersionId });
  } catch (e) {
    return response.error(e instanceof Error ? e.message : String(e));
  }
}

/**
 * 否認実行 (Reject)
 * - 権限: APPROVER以上
 */
export function rejectFlow(payload: {
  flowId: string;
  versionId: string;
  comment: string;
}): string {
  try {
    const email = Session.getActiveUser().getEmail();

    // ▼ 権限チェック: APPROVER以上
    authService.requirePermission(email, payload.flowId, 'APPROVER');

    flowService.rejectFlow(
      payload.flowId,
      payload.versionId,
      email,
      payload.comment,
    );

    return response.success({ status: 'REJECTED' });
  } catch (e) {
    return response.error(e instanceof Error ? e.message : String(e));
  }
}
