import type { Edge, Node } from '@xyflow/react';

// ==========================================
// 1. Database Schema Types (Spreadsheet Rows)
//    ※ Spreadsheetのヘッダー行もこのプロパティ名に合わせてください
// ==========================================

/** Flow管理簿 (Flowsシート) */
export interface FlowRow {
  flowId: string;
  folderId: string;
  title: string;
  currentStatus: string; // "DRAFT" | "PENDING" | ...
  activeVersionId: string;
  updatedAt: string; // ISO String
}

/** バージョン履歴 (Flow_Versionsシート) */
export interface FlowVersionRow {
  versionId: string;
  flowId: string;
  versionNum: number;
  status: string; // "DRAFT" | "PENDING" | ...
  jsonData: string; // JSON Stringified FlowGraphData
  createdBy: string;
  createdAt: string; // ISO String
  comment: string;
}

/** フォルダシートの行データ */
export interface FolderRow {
  folderId: string;
  name: string;
  parentId?: string;
  createdAt: string; // ISO string
}

/** 権限管理 (Folder_Permissionsシート) */
export interface PermissionRow {
  permissionId: string;
  folderId: string;
  subjectEmail: string; // User Email or Group ID
  role: Role;
}

/** ユーザー管理 (System_Usersシート) */
export interface UserRow {
  email: string;
  name: string;
  groups: string; // カンマ区切り文字列
}

// ==========================================
// 2. Domain Models (Application Types)
// ==========================================

export type FlowStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
export type Role = 'VIEWER' | 'EDITOR' | 'APPROVER' | 'ADMIN';

/** シート定義 */
export interface FlowSheet {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport?: { x: number; y: number; zoom: number };
}

/** 保存データ構造 (jsonDataの中身) */
export interface FlowGraphData {
  sheets: FlowSheet[];
  activeSheetId: string;
}

/** フローメタデータ (一覧表示用) */
export interface FlowMeta {
  flowId: string;
  folderId: string;
  title: string;
  currentStatus: FlowStatus;
  activeVersionId: string;
  updatedAt: string;
}

// フォルダメタデータ
export interface FolderMeta {
  id: string;
  name: string;
  parentId?: string;
}

/**
 * ダッシュボード表示用アイテム
 * FlowMeta に加え、軽量化された全バージョン履歴を持つ
 */
export interface DashboardFlowItem extends FlowMeta {
  versions: FlowVersionSummary[];
}

/** バージョン詳細情報 */
export interface FlowVersionSummary {
  versionId: string;
  versionNum: number;
  status: FlowStatus;
  comment: string;
  createdBy: string;
  createdAt: string;
}

// ▼ 更新: getFlows の新しいレスポンス型
export interface FlowListResponse {
  flows: DashboardFlowItem[];
  folders: FolderMeta[];
}
