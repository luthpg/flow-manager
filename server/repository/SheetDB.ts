export class SheetDB {
  private ss: GoogleAppsScript.Spreadsheet.Spreadsheet;

  constructor(spreadsheetId?: string) {
    if (spreadsheetId) {
      this.ss = SpreadsheetApp.openById(spreadsheetId);
    } else {
      // コンテナバインドされていない場合のエラーハンドリング
      try {
        this.ss = SpreadsheetApp.getActiveSpreadsheet();
      } catch {
        throw new Error(
          'No active spreadsheet found. Please provide a spreadsheet ID.',
        );
      }
    }
  }

  /**
   * 指定したシートの全データをオブジェクト配列として取得
   * 1行目をヘッダーとして扱う
   */
  getData<T>(sheetName: string): T[] {
    const sheet = this.ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0] as string[];
    const rows = data.slice(1);

    return rows.map((row) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        // undefined対策: 列が足りない場合は空文字などを入れる
        obj[header] = row[index] ?? '';
      });
      return obj as T;
    });
  }

  /**
   * 行の追加
   */
  insert(sheetName: string, rowData: Record<string, any>): void {
    const sheet = this.ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

    // ヘッダー行からカラム順序を特定 (キャッシュも検討可能だが、整合性重視で都度取得)
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) throw new Error(`Sheet "${sheetName}" has no headers`);

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];

    const newRow = headers.map((header) => {
      const val = rowData[header];
      // Date型は文字列に変換
      if (val instanceof Date) return val.toISOString();
      // オブジェクト/配列はJSON文字列化
      if (typeof val === 'object' && val !== null) return JSON.stringify(val);
      return val ?? ''; // null/undefinedは空文字
    });

    sheet.appendRow(newRow);
  }

  /**
   * 条件に一致する行を更新
   * ※ パフォーマンスのため、一度全データを読み込んでメモリ上で特定し、その行だけ書き込む
   */
  update(
    sheetName: string,
    keyColumn: string,
    keyValue: string,
    updateData: Record<string, any>,
  ): void {
    const sheet = this.ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0] as string[];
    const keyIndex = headers.indexOf(keyColumn);

    if (keyIndex === -1)
      throw new Error(
        `Column "${keyColumn}" not found in sheet "${sheetName}"`,
      );

    // 2行目以降を走査 (1-based indexで行番号を保持)
    // ここではIDの一意性を前提とするが下から探索
    for (let i = data.length - 1; i > 0; i--) {
      // 型変換して比較（スプレッドシートの数値と文字列の差異を吸収）
      if (String(data[i][keyIndex]) === String(keyValue)) {
        // 更新対象行
        const rowNumber = i + 1;
        const currentRow = data[i];

        // 更新データで上書きした新しい行データを作成
        const newRow = headers.map((header, colIndex) => {
          if (Object.hasOwn(updateData, header)) {
            const val = updateData[header];
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'object' && val !== null)
              return JSON.stringify(val);
            return val;
          }
          return currentRow[colIndex];
        });

        // 行単位で更新 (APIコール 1回)
        sheet.getRange(rowNumber, 1, 1, newRow.length).setValues([newRow]);
        return; // 1件更新したら終了
      }
    }
  }

  /**
   * 条件に一致する行を削除
   */
  delete(sheetName: string, keyColumn: string, keyValue: string): void {
    const sheet = this.ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0] as string[];
    const keyIndex = headers.indexOf(keyColumn);

    if (keyIndex === -1)
      throw new Error(
        `Column "${keyColumn}" not found in sheet "${sheetName}"`,
      );

    // 下から走査して一致する行を削除
    for (let i = data.length - 1; i > 0; i--) {
      if (String(data[i][keyIndex]) === String(keyValue)) {
        sheet.deleteRow(i + 1);
        return; // 1件削除したら終了
      }
    }
  }
}
