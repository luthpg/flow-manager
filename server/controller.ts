import { serialize } from '@ciderjs/gasnuki/json';
import type { FlowData, FlowGraphData, FlowMeta, Role } from '~/types/flow';
import { AuthService } from './service/AuthService';
import { FlowService } from './service/FlowService';
import { FolderService } from './service/FolderService';

const flowService = new FlowService();
const authService = new AuthService();
const folderService = new FolderService();

/**
 * ダッシュボード用: フロー一覧取得
 * - 権限: ログインユーザーに関連するフォルダのフローのみ
 */
export function getFlows() {
  const email = Session.getActiveUser().getEmail();

  // サービス層で権限フィルタリング済みのリストを取得
  const flows: FlowMeta[] = flowService.getFlowList(email);
  return serialize(flows);
}

/**
 * フォルダ一覧取得
 */
export function getFolders() {
  const folders = folderService.getFolders();
  return serialize(folders);
}

/**
 * フォルダ権限取得
 */
export function getFolderPermissions(folderId: string) {
  const permissions = authService.getFolderPermissions(folderId);
  return serialize(permissions);
}

/**
 * フォルダ権限追加
 */
export function addFolderPermission(
  folderId: string,
  email: string,
  role: Role,
) {
  const newPerm = authService.addFolderPermission(folderId, email, role);
  return serialize(newPerm);
}

/**
 * フォルダ権限削除
 */
export function removeFolderPermission(permissionId: string) {
  authService.removeFolderPermission(permissionId);
  return serialize({ success: true, permissionId });
}

/**
 * フォルダ権限更新
 */
export function updateFolderPermission(permissionId: string, role: Role) {
  const updated = authService.updateFolderPermission(permissionId, role);
  return serialize(updated);
}

/**
 * フローのバージョン一覧取得
 */
export function getFlowVersions(flowId: string) {
  const versions = flowService.getFlowVersions(flowId);
  return serialize(versions);
}

/**
 * フロー検索
 */
export function searchFlows(query: string) {
  const email = Session.getActiveUser().getEmail();
  const results = flowService.searchFlows(email, query);
  return serialize(results);
}

export type FlowDataWithRole = FlowData & { userRole: Role | null };

/**
 * 編集画面・閲覧画面データ取得
 * - 必須: flowId, versionId
 */
export function getFlowData(flowId: string, versionId: string) {
  const email = Session.getActiveUser().getEmail();

  // 権限チェック
  authService.requirePermission(email, flowId, 'VIEWER');

  // 権限レベル取得
  const role = authService.getRole(email, flowId);

  // 指定バージョンを取得
  const result = flowService.getFlowDetail(flowId, versionId);

  const responseData: FlowDataWithRole = {
    ...result,
    userRole: role,
  };

  return serialize(responseData);
}

/**
 * 下書き保存
 * - 権限: EDITOR以上
 */
export function saveDraft(payload: {
  flowId: string;
  title: string;
  graphData: FlowGraphData;
}) {
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
  return serialize({ versionId });
}

/**
 * 承認申請
 * - 権限: EDITOR以上
 */
export function submitFlow(payload: {
  flowId: string;
  versionId: string;
  comment: string;
}) {
  const email = Session.getActiveUser().getEmail();

  // ▼ 権限チェック
  authService.requirePermission(email, payload.flowId, 'EDITOR');

  flowService.submitFlow(payload.flowId, payload.versionId, payload.comment);
  return serialize({ status: 'PENDING' });
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
}) {
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

  return serialize({ status: 'PUBLISHED', versionId: newVersionId });
}

/**
 * 否認実行 (Reject)
 * - 権限: APPROVER以上
 */
export function rejectFlow(payload: {
  flowId: string;
  versionId: string;
  comment: string;
}) {
  const email = Session.getActiveUser().getEmail();

  // ▼ 権限チェック: APPROVER以上
  authService.requirePermission(email, payload.flowId, 'APPROVER');

  flowService.rejectFlow(
    payload.flowId,
    payload.versionId,
    email,
    payload.comment,
  );

  return serialize({ status: 'REJECTED' });
}
