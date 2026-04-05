type VisitRecordDB = {
  visitRecord: {
    findMany: (args: {
      where: { id: { in: number[] } };
      select: { id: true; reportId: true };
    }) => Promise<{ id: number; reportId: number }[]>;
    update: (args: {
      where: { id: number };
      data: { visitOrder: number };
    }) => Promise<{ id: number }>;
  };
};

export type ReorderResult =
  | { success: true }
  | { success: false; error: "NOT_FOUND"; visitId: number }
  | { success: false; error: "WRONG_REPORT"; visitId: number };

/**
 * 訪問記録の並び順を一括更新する。
 * - 存在しない visit_id が含まれる場合: { success: false, error: 'NOT_FOUND' }
 * - 別日報の visit_id が含まれる場合: { success: false, error: 'WRONG_REPORT' }
 * - 正常: { success: true }
 */
export async function reorderVisitRecords(
  db: VisitRecordDB,
  reportId: number,
  orders: { visit_id: number; visit_order: number }[],
): Promise<ReorderResult> {
  const visitIds = orders.map((o) => o.visit_id);

  const records = await db.visitRecord.findMany({
    where: { id: { in: visitIds } },
    select: { id: true, reportId: true },
  });

  const foundIds = new Set(records.map((r) => r.id));
  const notFoundId = visitIds.find((id) => !foundIds.has(id));
  if (notFoundId !== undefined) {
    return { success: false, error: "NOT_FOUND", visitId: notFoundId };
  }

  const wrongRecord = records.find((r) => r.reportId !== reportId);
  if (wrongRecord) {
    return { success: false, error: "WRONG_REPORT", visitId: wrongRecord.id };
  }

  for (const order of orders) {
    await db.visitRecord.update({
      where: { id: order.visit_id },
      data: { visitOrder: order.visit_order },
    });
  }

  return { success: true };
}
