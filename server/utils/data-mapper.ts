import type { FlowMeta, FlowStatus, FlowVersionDetail } from '../../types/flow';

// --- Types for DB Rows ---

export interface FlowRow {
  flowId: string;
  folderId: string;
  title: string;
  currentStatus: string;
  activeVersionId: string;
  updatedAt: string | Date;
}

export interface FlowVersionRow {
  versionId: string;
  flowId: string;
  versionNum: number;
  status: string;
  jsonData: string;
  // Extra columns for large data support
  jsonData2?: string;
  jsonData3?: string;
  jsonData4?: string;
  jsonData5?: string;
  createdBy: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  comment: string;
}

// --- Mappers ---

export function toFlowMeta(row: FlowRow): FlowMeta {
  return {
    flowId: row.flowId,
    folderId: row.folderId,
    title: row.title,
    currentStatus: row.currentStatus as FlowStatus,
    activeVersionId: row.activeVersionId,
    // For dashboard, we might not have a specific 'versionId' context,
    // so we can use activeVersionId or empty string.
    versionId: row.activeVersionId,
    updatedAt: new Date(row.updatedAt).toISOString(),
    thumbnail: undefined, // Not in DB
  };
}

export function toFlowVersionDetail(row: FlowVersionRow): FlowVersionDetail {
  return {
    versionId: row.versionId,
    versionNum: row.versionNum,
    status: row.status as FlowStatus,
    comment: row.comment,
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

// --- JSON Chunking ---

const MAX_CELL_LENGTH = 49000; // Safety margin below 50k

export function splitJsonData(jsonString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const totalLength = jsonString.length;

  // jsonData (1)
  result.jsonData = jsonString.substring(0, MAX_CELL_LENGTH);

  if (totalLength > MAX_CELL_LENGTH) {
    result.jsonData2 = jsonString.substring(
      MAX_CELL_LENGTH,
      MAX_CELL_LENGTH * 2,
    );
  }
  if (totalLength > MAX_CELL_LENGTH * 2) {
    result.jsonData3 = jsonString.substring(
      MAX_CELL_LENGTH * 2,
      MAX_CELL_LENGTH * 3,
    );
  }
  if (totalLength > MAX_CELL_LENGTH * 3) {
    result.jsonData4 = jsonString.substring(
      MAX_CELL_LENGTH * 3,
      MAX_CELL_LENGTH * 4,
    );
  }
  if (totalLength > MAX_CELL_LENGTH * 4) {
    result.jsonData5 = jsonString.substring(
      MAX_CELL_LENGTH * 4,
      MAX_CELL_LENGTH * 5,
    );
  }

  return result;
}

export function joinJsonChunks(row: FlowVersionRow): string {
  let json = row.jsonData || '';
  if (row.jsonData2) json += row.jsonData2;
  if (row.jsonData3) json += row.jsonData3;
  if (row.jsonData4) json += row.jsonData4;
  if (row.jsonData5) json += row.jsonData5;
  return json;
}
