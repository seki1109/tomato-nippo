import { describe, expect, it, vi } from "vitest";

import {
  canDeleteReport,
  canEditReport,
  checkReportDuplicate,
} from "@/lib/services/report";

// ───────────────────────────────────────────────
// UT-B-001: 日報の重複チェック
// ───────────────────────────────────────────────
describe("UT-B-001: 日報の重複チェック", () => {
  it("#1 同ユーザー・同日付で2件目 → 重複あり（true）", async () => {
    const mockDB = {
      dailyReport: {
        findUnique: vi.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const result = await checkReportDuplicate(
      mockDB,
      1,
      new Date("2026-03-27"),
    );
    expect(result).toBe(true);
    expect(mockDB.dailyReport.findUnique).toHaveBeenCalledWith({
      where: {
        userId_reportDate: { userId: 1, reportDate: new Date("2026-03-27") },
      },
      select: { id: true },
    });
  });

  it("#2 別ユーザー・同日付 → 重複なし（false）", async () => {
    const mockDB = {
      dailyReport: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const result = await checkReportDuplicate(
      mockDB,
      2,
      new Date("2026-03-27"),
    );
    expect(result).toBe(false);
  });

  it("#3 同ユーザー・別日付 → 重複なし（false）", async () => {
    const mockDB = {
      dailyReport: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const result = await checkReportDuplicate(
      mockDB,
      1,
      new Date("2026-03-28"),
    );
    expect(result).toBe(false);
  });
});

// ───────────────────────────────────────────────
// UT-B-002: 日報ステータス遷移
// ───────────────────────────────────────────────
describe("UT-B-002: 日報ステータス遷移", () => {
  it("#1 DRAFT → 編集・削除可能", () => {
    expect(canEditReport("DRAFT")).toBe(true);
    expect(canDeleteReport("DRAFT")).toBe(true);
  });

  it("#2 SUBMITTED の日報は編集不可", () => {
    expect(canEditReport("SUBMITTED")).toBe(false);
  });

  it("#3 SUBMITTED の日報は削除不可", () => {
    expect(canDeleteReport("SUBMITTED")).toBe(false);
  });
});
