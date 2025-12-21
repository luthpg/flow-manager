import type { Edge, Node } from '@xyflow/react';

// --- 基本的なステータスとロール ---
export type FlowStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
export type Role = 'VIEWER' | 'EDITOR' | 'APPROVER' | 'ADMIN';

export interface Folder {
  folderId: string;
  name: string;
  parentId?: string;
}

export type FolderRole = 'VIEWER' | 'EDITOR' | 'OWNER';

export interface FolderPermission {
  permissionId: string;
  folderId: string;
  email: string;
  role: FolderRole;
  avatarUrl?: string; // Optional for UI
}

// --- 1枚のシートの定義 ---
export interface FlowSheet {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport?: { x: number; y: number; zoom: number };
}

/**
 * フロー全体の定義
 */
export interface FlowData {
  /** フロー全体のメタ情報 */
  meta: FlowMeta;
  /** バージョン詳細情報 */
  version: FlowVersionDetail;
  graphData: FlowGraphData;
}

/**
 * 保存されるJSONデータ全体
 * サーバーの 'json_data' カラムには、このオブジェクトがJSON文字列化されて格納されます
 */
export interface FlowGraphData {
  /** シートのリスト */
  sheets: FlowSheet[];
  /** 現在選択されているシートのID */
  activeSheetId: string;
}

/**
 * フローのメタデータ (ダッシュボード表示用)
 */
export interface FlowMeta {
  flowId: string;
  versionId: string;
  activeVersionId: string;
  folderId: string;
  title: string;
  currentStatus: FlowStatus;
  updatedAt: string; // ISO String
  thumbnail?: string;
}

/**
 * バージョン詳細 (履歴表示用)
 */
export interface FlowVersionDetail {
  versionId: string;
  versionNum: number;
  status: FlowStatus;
  comment: string;
  createdBy: string;
  createdAt: string;
}

export interface FlowVersion {
  versionId: string;
  versionNum: number;
  status: FlowStatus;
  createdAt: string;
}
