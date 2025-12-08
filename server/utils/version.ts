/**
 * 日付を YYYYMMDD 形式の文字列に変換
 */
export const getDateString = (targetDate = new Date()): string => {
  return Utilities.formatDate(new Date(targetDate), 'JST', 'yyyyMMdd');
};

/**
 * ドラフトバージョンIDを生成
 * Format: draft-{userName}-{YYYYMMDD}
 */
export const generateDraftVersionId = (email: string): string => {
  const userName = email.split('@')[0]; // @より前を使用
  const dateStr = getDateString();
  return `draft-${userName}-${dateStr}`;
};

/**
 * リリースバージョンIDを生成
 * Format: {YYYYMMDD} or {YYYYMMDD}-{nnn}
 */
export const generateReleaseVersionId = (
  existingVersions: string[],
): string => {
  const dateStr = getDateString();

  // 完全一致チェック
  if (!existingVersions.includes(dateStr)) {
    return dateStr;
  }

  // 枝番採番 (YYYYMMDD-001, -002...)
  let counter = 1;
  let newId = `${dateStr}-${String(counter).padStart(3, '0')}`;

  while (existingVersions.includes(newId)) {
    counter++;
    newId = `${dateStr}-${String(counter).padStart(3, '0')}`;
  }

  return newId;
};
