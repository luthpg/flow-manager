import { SHEET_NAMES } from '../constants';
import { SheetDB } from '../repository/SheetDB';

// 権限レベル定義 (数値が大きいほど強い)
export const ROLE_LEVELS: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 11,
  APPROVER: 31,
  ADMIN: 99,
};

// 型定義
export type Role = 'VIEWER' | 'EDITOR' | 'APPROVER' | 'ADMIN';

export interface PermissionRow {
  permission_id: string;
  folder_id: string;
  subject_email: string; // User Email or Group ID
  role: Role;
}

export interface FlowRow {
  flow_id: string;
  folder_id: string;
  // ...others
}

export interface UserRow {
  email: string;
  groups: string; // カンマ区切り文字列 "group-a,group-b" を想定
}

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
    const targetFlow = flows.find((f) => f.flow_id === flowId);

    if (!targetFlow) {
      // フローが存在しない場合は権限なしとする
      return null;
    }

    const folderId = targetFlow.folder_id;

    // 2. ユーザーの所属グループを取得
    const users = this.db.getData<UserRow>(SHEET_NAMES.SYSTEM_USERS);
    const targetUser = users.find((u) => u.email === userEmail);

    const userGroups =
      targetUser && targetUser.groups
        ? targetUser.groups.split(',').map((g) => g.trim())
        : [];

    // 検索対象のSubject (自分自身 + 所属グループ)
    const subjects = [userEmail, ...userGroups];

    // 3. フォルダ権限テーブルを検索
    const permissions = this.db.getData<PermissionRow>(
      SHEET_NAMES.FOLDER_PERMISSIONS,
    );

    // 対象フォルダ かつ Subjectが一致する権限を全て抽出
    const matchedPerms = permissions.filter(
      (p) => p.folder_id === folderId && subjects.includes(p.subject_email),
    );

    if (matchedPerms.length === 0) {
      return null; // 権限なし
    }

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
   * (ダッシュボード一覧表示のフィルタリング用)
   */
  getAuthorizedFolderIds(userEmail: string): string[] {
    // 1. ユーザーの所属グループを取得
    const users = this.db.getData<UserRow>(SHEET_NAMES.SYSTEM_USERS);
    const targetUser = users.find((u) => u.email === userEmail);

    const userGroups = targetUser?.groups
      ? targetUser.groups.split(',').map((g) => g.trim())
      : [];

    const subjects = [userEmail, ...userGroups];

    // 2. 権限テーブルから対象Subjectが含まれる行を抽出
    const permissions = this.db.getData<PermissionRow>(
      SHEET_NAMES.FOLDER_PERMISSIONS,
    );

    // 役割を問わず、レコードが存在すればアクセス可能とみなす
    const accessibleFolderIds = permissions
      .filter((p) => subjects.includes(p.subject_email))
      .map((p) => p.folder_id);

    // 3. 重複を排除して返す
    return [...new Set(accessibleFolderIds)];
  }

  /**
   * 権限チェック (Guard Clause)
   * Controllerでこのメソッドを呼び出し、権限が足りなければ例外を投げる
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
   * ユーザー情報の取得 (ヘッダー表示用など)
   */
  getUserInfo(email: string) {
    const users = this.db.getData<UserRow & { name: string }>(
      SHEET_NAMES.SYSTEM_USERS,
    );
    const user = users.find((u) => u.email === email);
    return user || { email, name: email.split('@')[0], groups: '' };
  }
}
