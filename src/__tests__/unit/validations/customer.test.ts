import { describe, expect, it } from "vitest";

import { validateCustomerCreate } from "@/lib/validations/customer";

describe("UT-V-004: 顧客登録バリデーション", () => {
  it("#1 company_name が null → エラー", () => {
    const result = validateCustomerCreate({ company_name: null });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "company_name")).toBe(true);
  });

  it("#2 company_name が 201 文字 → エラー", () => {
    const result = validateCustomerCreate({
      company_name: "あ".repeat(201),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "company_name")).toBe(true);
  });

  it('#3 phone が "abc" → エラー', () => {
    const result = validateCustomerCreate({
      company_name: "株式会社テスト",
      phone: "abc",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "phone")).toBe(true);
  });

  it("正常な入力値 → エラーなし", () => {
    const result = validateCustomerCreate({
      company_name: "株式会社テスト",
      contact_person: "佐藤一郎",
      phone: "03-0000-0000",
      address: "東京都千代田区",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
