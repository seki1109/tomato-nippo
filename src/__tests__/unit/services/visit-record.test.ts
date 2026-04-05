import { describe, expect, it, vi } from "vitest";

import { reorderVisitRecords } from "@/lib/services/visit-record";

describe("UT-B-003: 訪問順序の整合性", () => {
  it("#1 並び替え後の順序が正しく反映される", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: 0 });
    const mockDB = {
      visitRecord: {
        findMany: vi.fn().mockResolvedValue([
          { id: 20, reportId: 10 },
          { id: 25, reportId: 10 },
          { id: 21, reportId: 10 },
        ]),
        update: mockUpdate,
      },
    };

    const orders = [
      { visit_id: 20, visit_order: 1 },
      { visit_id: 25, visit_order: 2 },
      { visit_id: 21, visit_order: 3 },
    ];

    const result = await reorderVisitRecords(mockDB, 10, orders);

    expect(result.success).toBe(true);
    // update が各 visit_id に対して正しい visit_order で呼ばれたか確認
    expect(mockUpdate).toHaveBeenCalledTimes(3);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { visitOrder: 1 },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 25 },
      data: { visitOrder: 2 },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 21 },
      data: { visitOrder: 3 },
    });
  });

  it("#2 存在しない visit_id を指定 → NOT_FOUND エラー", async () => {
    const mockDB = {
      visitRecord: {
        findMany: vi.fn().mockResolvedValue([
          // visit_id: 9999 は存在しない（返ってこない）
          { id: 20, reportId: 10 },
        ]),
        update: vi.fn(),
      },
    };

    const orders = [
      { visit_id: 20, visit_order: 1 },
      { visit_id: 9999, visit_order: 2 },
    ];

    const result = await reorderVisitRecords(mockDB, 10, orders);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("NOT_FOUND");
      expect(result.visitId).toBe(9999);
    }
    // update は呼ばれないはず
    expect(mockDB.visitRecord.update).not.toHaveBeenCalled();
  });
});
