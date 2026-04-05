import { describe, expect, it } from "vitest";

import { validateUserCreate } from "@/lib/validations/user";

const VALID_BASE = {
  name: "田中太郎",
  email: "tanaka@example.com",
  password: "password123",
  role: "SALES",
};

describe("UT-V-003: ユーザー登録バリデーション", () => {
  it("#1 name が null → エラー", () => {
    const result = validateUserCreate({ ...VALID_BASE, name: null });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "name")).toBe(true);
  });

  it("#2 password が 6 文字（8文字未満）→ エラー", () => {
    const result = validateUserCreate({ ...VALID_BASE, password: "abc123" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "password")).toBe(true);
  });

  it("#3 password が英字のみ（数字なし）→ エラー", () => {
    const result = validateUserCreate({
      ...VALID_BASE,
      password: "aaaaaaaa",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "password")).toBe(true);
  });

  it('#4 role が "UNKNOWN" → エラー', () => {
    const result = validateUserCreate({ ...VALID_BASE, role: "UNKNOWN" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "role")).toBe(true);
  });

  it("正常な入力値 → エラーなし", () => {
    const result = validateUserCreate(VALID_BASE);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
