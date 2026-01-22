// --- 1. 型定義 ---
declare const __brand: unique symbol;
// T型の情報を持ったJSON文字列型
export type JsonString<T> = string & { [__brand]: T };

// --- 2. Date復元用のヘルパー (Reviver) ---
// ISO 8601形式の日付文字列にマッチする正規表現
const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

function dateReviver(_key: string, value: any): any {
  // 文字列かつ、ISO日付フォーマットの場合
  if (typeof value === 'string' && isoDateRegex.test(value)) {
    const date = new Date(value);
    // 無効な日付(Invalid Date)でなければDateオブジェクトを返す
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
}

// --- 3. シリアライズ関数 (stringify) ---
export const serialize = <T>(data: T): JsonString<T> => {
  return JSON.stringify(data) as JsonString<T>;
};

// --- 4. デシリアライズ関数 (parse) ---
// Reviverを内部で自動適用します
export const deserialize = <T>(json: JsonString<T>): T => {
  return JSON.parse(json, dateReviver);
};
