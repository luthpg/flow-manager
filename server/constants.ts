/**
 * スプレッドシートのシート名定義
 */
export const SHEET_NAMES = {
  SYSTEM_USERS: 'System_Users',
  SYSTEM_GROUPS: 'System_Groups',
  FOLDERS: 'Folders',
  FOLDER_PERMISSIONS: 'Folder_Permissions',
  FLOWS: 'Flows',
  FLOW_VERSIONS: 'Flow_Versions',
  SYSTEM_LOGS: 'System_Logs',
} as const;

/**
 * アプリケーション設定
 */
export const APP_CONFIG = {
  APP_TITLE: 'flow-manager',
  LOCK_WAIT_MS: 30000,
} as const;
