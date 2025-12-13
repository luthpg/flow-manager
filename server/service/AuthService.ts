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
}
