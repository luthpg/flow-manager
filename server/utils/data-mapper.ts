import type { FlowMeta, FlowStatus, FlowVersionDetail } from '../../types/flow';

// --- Types for DB Rows ---

export interface FlowRow {
  flow_id: string;
  folder_id: string;
  title: string;
  current_status: string;
  active_version_id: string;
  updated_at: string | Date;
}

export interface FlowVersionRow {
  version_id: string;
  flow_id: string;
  version_num: number;
  status: string;
  json_data: string;
  // Extra columns for large data support
  json_data_2?: string;
  json_data_3?: string;
  json_data_4?: string;
  json_data_5?: string;
  created_by: string;
  created_at: string | Date;
  comment: string;
}

// --- Mappers ---

export function toFlowMeta(row: FlowRow): FlowMeta {
  return {
    flowId: row.flow_id,
    folderId: row.folder_id,
    title: row.title,
    currentStatus: row.current_status as FlowStatus,
    activeVersionId: row.active_version_id,
    // For dashboard, we might not have a specific 'versionId' context, 
    // so we can use activeVersionId or empty string.
    versionId: row.active_version_id, 
    updatedAt: new Date(row.updated_at).toISOString(),
    thumbnail: undefined, // Not in DB
  };
}

export function toFlowVersionDetail(row: FlowVersionRow): FlowVersionDetail {
  return {
    versionId: row.version_id,
    versionNum: row.version_num,
    status: row.status as FlowStatus,
    comment: row.comment,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// --- JSON Chunking ---

const MAX_CELL_LENGTH = 49000; // Safety margin below 50k

export function splitJsonData(jsonString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const totalLength = jsonString.length;
  
  // json_data (1)
  result.json_data = jsonString.substring(0, MAX_CELL_LENGTH);

  if (totalLength > MAX_CELL_LENGTH) {
    result.json_data_2 = jsonString.substring(MAX_CELL_LENGTH, MAX_CELL_LENGTH * 2);
  }
  if (totalLength > MAX_CELL_LENGTH * 2) {
    result.json_data_3 = jsonString.substring(MAX_CELL_LENGTH * 2, MAX_CELL_LENGTH * 3);
  }
  if (totalLength > MAX_CELL_LENGTH * 3) {
    result.json_data_4 = jsonString.substring(MAX_CELL_LENGTH * 3, MAX_CELL_LENGTH * 4);
  }
  if (totalLength > MAX_CELL_LENGTH * 4) {
    result.json_data_5 = jsonString.substring(MAX_CELL_LENGTH * 4, MAX_CELL_LENGTH * 5);
  }

  return result;
}

export function joinJsonChunks(row: FlowVersionRow): string {
  let json = row.json_data || '';
  if (row.json_data_2) json += row.json_data_2;
  if (row.json_data_3) json += row.json_data_3;
  if (row.json_data_4) json += row.json_data_4;
  if (row.json_data_5) json += row.json_data_5;
  return json;
}
