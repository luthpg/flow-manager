import type { Folder } from '~/types/flow';
import { SHEET_NAMES } from '../constants';
import { SheetDB } from '../repository/SheetDB';

export class FolderService {
  private db: SheetDB;

  constructor() {
    this.db = new SheetDB();
  }

  /**
   * フォルダ一覧を取得
   */
  getFolders(): Folder[] {
    return this.db.getData<Folder>(SHEET_NAMES.FOLDERS);
  }
}
