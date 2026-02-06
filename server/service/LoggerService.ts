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

  getLogs(limit?: number) {
    const logs = this.db.getData<{
      logId: string;
      timestamp: string | Date; // Depending on SheetDB parsing
      action: LogAction;
      actor: string;
      targetId: string;
      details: string;
    }>(SHEET_NAMES.SYSTEM_LOGS);

    // Sort by timestamp desc
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    if (limit) {
      return logs.slice(0, limit);
    }
    return logs;
  }
}
