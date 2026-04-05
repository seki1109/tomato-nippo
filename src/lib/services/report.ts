type DailyReportDB = {
  dailyReport: {
    findUnique: (args: {
      where: { userId_reportDate: { userId: number; reportDate: Date } };
      select?: { id: true };
    }) => Promise<{ id: number } | null>;
  };
};

/**
 * 同ユーザー・同日付の日報が既に存在するか確認する。
 * true → 重複あり（作成不可）、false → 重複なし（作成可能）
 */
export async function checkReportDuplicate(
  db: DailyReportDB,
  userId: number,
  reportDate: Date,
): Promise<boolean> {
  const existing = await db.dailyReport.findUnique({
    where: { userId_reportDate: { userId, reportDate } },
    select: { id: true },
  });
  return existing !== null;
}

/** DRAFT ステータスの日報のみ編集可能 */
export function canEditReport(status: string): boolean {
  return status === "DRAFT";
}

/** DRAFT ステータスの日報のみ削除可能 */
export function canDeleteReport(status: string): boolean {
  return status === "DRAFT";
}
