import { describe, expect, it } from "vitest";

import { validateLogin } from "@/lib/validations/auth";

describe("UT-V-002: ログインバリデーション", () => {
  it("#1 email が null → エラー", () => {
    const result = validateLogin({ email: null, password: "password123" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "email")).toBe(true);
  });

  it("#2 email が無効形式 → エラー", () => {
    const result = validateLogin({ email: "invalid", password: "password123" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "email")).toBe(true);
  });

  it("#3 password が null → エラー", () => {
    const result = validateLogin({
      email: "test@example.com",
      password: null,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "password")).toBe(true);
  });

  it("正常な入力値 → エラーなし", () => {
    const result = validateLogin({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
