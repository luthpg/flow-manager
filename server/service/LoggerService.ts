import { SHEET_NAMES } from '../constants';
import { SheetDB } from '../repository/SheetDB';

export type LogAction =
  | 'APPROVE_FLOW'
  | 'REJECT_FLOW'
  | 'SUBMIT_FLOW'
  | 'ADD_PERMISSION'
  | 'REMOVE_PERMISSION'
  | 'UPDATE_PERMISSION';

export class LoggerService {
  private db: SheetDB;

  constructor() {
    this.db = new SheetDB();
  }

  log(action: LogAction, actor: string, targetId: string, details?: string) {
    try {
      this.db.insert(SHEET_NAMES.SYSTEM_LOGS, {
        logId: Utilities.getUuid(),
        timestamp: new Date(),
        action,
        actor,
        targetId, // FlowID or PermissionID or FolderID
        details: details || '',
      });
    } catch (e) {
      console.error('Logging failed', e);
      // Don't throw, logging failure shouldn't break the app flow
    }
  }
}
