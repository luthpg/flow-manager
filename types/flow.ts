import type { Edge, Node } from '@xyflow/react';

// ==========================================
// 1. Database Schema (Spreadsheet Rows)
// ==========================================
export interface FlowRow {
  flowId: string;
  folderId: string;
  title: string;
  currentStatus: string;
  activeVersionId: string;
  updatedAt: string;
}

export interface FlowVersionRow {
  versionId: string;
  flowId: string;
  versionNum: number;
  status: string;
  jsonData: string;
  createdBy: string;
  createdAt: string;
  comment: string;
}

export interface FolderRow {
  folderId: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export interface PermissionRow {
  permissionId: string;
  folderId: string;
  subjectEmail: string;
  role: Role;
}

export interface UserRow {
  email: string;
  name: string;
  groups: string;
}

// ==========================================
// 2. Domain Models
// ==========================================
export type FlowStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
export type Role = 'VIEWER' | 'EDITOR' | 'APPROVER' | 'ADMIN';

export interface FlowSheet {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface FlowGraphData {
  sheets: FlowSheet[];
  activeSheetId: string;
}

export interface FlowMeta {
  flowId: string;
  folderId: string;
  title: string;
  currentStatus: FlowStatus;
  activeVersionId: string;
  updatedAt: string;
}

export interface FlowVersionSummary {
  versionId: string;
  versionNum: number;
  status: FlowStatus;
  comment: string;
  createdBy: string;
  createdAt: string;
}

export interface FolderMeta {
  id: string;
  name: string;
  parentId?: string;
}

export interface DashboardFlowItem extends FlowMeta {
  versions: FlowVersionSummary[];
}

// ==========================================
// 3. API Response Payloads (Data Content)
//    ※ サーバーレスポンスの `data` プロパティの中身はこれに準拠する
// ==========================================

/** getFlowData() のレスポンスデータ */
export interface FlowDetailData {
  meta: FlowMeta;
  graphData: FlowGraphData;
  version: FlowVersionSummary; // 以前は versionDetail でしたが短縮して統一
  userRole: Role;
}

/** getFlows() のレスポンスデータ */
export interface FlowListData {
  flows: DashboardFlowItem[];
  folders: FolderMeta[];
}

/** saveDraft() のレスポンスデータ */
export interface SaveDraftResult {
  versionId: string;
}

/** approveFlow() のレスポンスデータ */
export interface ApproveFlowResult {
  status: 'PUBLISHED';
  versionId: string;
}

/** submitFlow(), rejectFlow() のレスポンスデータ */
export interface StatusUpdateResult {
  status: 'PENDING' | 'REJECTED';
}

export interface AdvancedSearchQuery {
  keyword: string;
  targetField: 'all' | 'label' | 'description' | 'assignee';
}
