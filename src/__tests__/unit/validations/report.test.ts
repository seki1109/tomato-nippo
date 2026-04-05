import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateReportCreate } from "@/lib/validations/report";

const VALID_VISIT_RECORD = {
  customer_id: 1,
  visit_content: "テスト訪問内容",
  visit_order: 1,
};

describe("UT-V-001: 日報作成バリデーション", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("#1 report_date が null → エラー", () => {
    const result = validateReportCreate({
      report_date: null,
      visit_records: [VALID_VISIT_RECORD],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "report_date")).toBe(true);
  });

  it("#2 未来日付 → エラー", () => {
    const result = validateReportCreate({
      report_date: "2099-01-01",
      visit_records: [VALID_VISIT_RECORD],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "report_date")).toBe(true);
  });

  it("#3 visit_records が空配列 → エラー", () => {
    const result = validateReportCreate({
      report_date: "2026-04-04",
      visit_records: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "visit_records")).toBe(true);
  });

  it("#4 visit_content が 1001 文字 → エラー", () => {
    const result = validateReportCreate({
      report_date: "2026-04-04",
      visit_records: [
        { customer_id: 1, visit_content: "あ".repeat(1001), visit_order: 1 },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.field.includes("visit_content")),
    ).toBe(true);
  });

  it("#5 problem が 2001 文字 → エラー", () => {
    const result = validateReportCreate({
      report_date: "2026-04-04",
      visit_records: [VALID_VISIT_RECORD],
      problem: "あ".repeat(2001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "problem")).toBe(true);
  });

  it("#6 plan が 2001 文字 → エラー", () => {
    const result = validateReportCreate({
      report_date: "2026-04-04",
      visit_records: [VALID_VISIT_RECORD],
      plan: "あ".repeat(2001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "plan")).toBe(true);
  });

  it("#7 全項目が正しい値 → エラーなし", () => {
    const result = validateReportCreate({
      report_date: "2026-04-04",
      visit_records: [VALID_VISIT_RECORD],
      problem: "課題内容",
      plan: "翌日計画",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
