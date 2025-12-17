import type { FlowRow, PermissionRow, Role, UserRow } from '~/types/flow';
import { SHEET_NAMES } from '../constants';
import { SheetDB } from '../repository/SheetDB';

// 権限レベル定義
export const ROLE_LEVELS: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 11,
  APPROVER: 31,
  ADMIN: 99,
};

export class AuthService {
  private db: SheetDB;

  constructor() {
    this.db = new SheetDB();
  }

  /**
   * 指定されたフローに対するユーザーの権限を取得する
   */
  getRole(userEmail: string, flowId: string): Role | null {
    // 1. フローIDから親フォルダIDを特定
    const flows = this.db.getData<FlowRow>(SHEET_NAMES.FLOWS);
    const targetFlow = flows.find((f) => f.flowId === flowId);

    if (!targetFlow) return null;

    const folderId = targetFlow.folderId;

    // 2. ユーザーの所属グループを取得
    const users = this.db.getData<UserRow>(SHEET_NAMES.SYSTEM_USERS);
    const targetUser = users.find((u) => u.email === userEmail);

    const userGroups = targetUser?.groups
      ? targetUser.groups.split(',').map((g) => g.trim())
      : [];

    const subjects = [userEmail, ...userGroups];

    // 3. フォルダ権限テーブルを検索
    const permissions = this.db.getData<PermissionRow>(
      SHEET_NAMES.FOLDER_PERMISSIONS,
    );

    // キャメルケース (folderId, subjectEmail) でアクセス
    const matchedPerms = permissions.filter(
      (p) => p.folderId === folderId && subjects.includes(p.subjectEmail),
    );

    if (matchedPerms.length === 0) return null;

    // 4. 最も強い権限を適用
    let maxLevel = 0;
    let currentRole: Role = 'VIEWER';

    matchedPerms.forEach((p) => {
      const level = ROLE_LEVELS[p.role] || 0;
      if (level > maxLevel) {
        maxLevel = level;
        currentRole = p.role;
      }
    });

    return currentRole;
  }

  /**
   * ユーザーがアクセス権限を持つフォルダIDのリストを返す
   */
  getAuthorizedFolderIds(userEmail: string): string[] {
    const users = this.db.getData<UserRow>(SHEET_NAMES.SYSTEM_USERS);
    const targetUser = users.find((u) => u.email === userEmail);

    const userGroups = targetUser?.groups
      ? targetUser.groups.split(',').map((g) => g.trim())
      : [];

    const subjects = [userEmail, ...userGroups];

    const permissions = this.db.getData<PermissionRow>(
      SHEET_NAMES.FOLDER_PERMISSIONS,
    );

    const accessibleFolderIds = permissions
      .filter((p) => subjects.includes(p.subjectEmail))
      .map((p) => p.folderId);

    return [...new Set(accessibleFolderIds)];
  }

  /**
   * 権限チェック (Guard Clause)
   */
  requirePermission(
    userEmail: string,
    flowId: string,
    requiredRole: Role,
  ): void {
    const currentRole = this.getRole(userEmail, flowId);

    if (!currentRole) {
      throw new Error(
        `Access Denied: You have no permission for flow ${flowId}.`,
      );
    }

    const currentLevel = ROLE_LEVELS[currentRole];
    const requiredLevel = ROLE_LEVELS[requiredRole];

    if (currentLevel < requiredLevel) {
      throw new Error(
        `Access Denied: Requires ${requiredRole}, but you are ${currentRole}.`,
      );
    }
  }

  /**
   * フォルダの権限一覧を取得
   */
  getPermissions(folderId: string): PermissionRow[] {
    const permissions = this.db.getData<PermissionRow>(
      SHEET_NAMES.FOLDER_PERMISSIONS,
    );
    return permissions.filter((p) => p.folderId === folderId);
  }

  /**
   * 権限を追加
   */
  addPermission(folderId: string, email: string, role: Role): PermissionRow {
    // 重複チェック
    const current = this.getPermissions(folderId);
    const exists = current.find((p) => p.subjectEmail === email);
    if (exists) {
      throw new Error(`User ${email} already has permission.`);
    }

    const newPermission: PermissionRow = {
      permissionId: Utilities.getUuid(),
      folderId,
      subjectEmail: email,
      role,
    };

    this.db.insert(SHEET_NAMES.FOLDER_PERMISSIONS, newPermission);
    return newPermission;
  }

  /**
   * 権限を更新
   */
  updatePermission(permissionId: string, role: Role): PermissionRow {
    // SheetDB.update は (sheetName, keyCol, keyVal, data)
    this.db.update(
      SHEET_NAMES.FOLDER_PERMISSIONS,
      'permissionId',
      permissionId,
      {
        role,
      },
    );

    // 更新後のデータを返すために再取得（簡易実装）
    const permissions = this.db.getData<PermissionRow>(
      SHEET_NAMES.FOLDER_PERMISSIONS,
    );
    const updated = permissions.find((p) => p.permissionId === permissionId);
    if (!updated) throw new Error('Permission not found after update');
    return updated;
  }

  /**
   * 権限を削除
   */
  removePermission(permissionId: string): void {
    this.db.delete(
      SHEET_NAMES.FOLDER_PERMISSIONS,
      'permissionId',
      permissionId,
    );
  }
}
