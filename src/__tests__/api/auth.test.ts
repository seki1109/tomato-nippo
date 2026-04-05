/**
 * AT-AUTH-001: POST /api/v1/auth/login
 * AT-AUTH-002: POST /api/v1/auth/logout
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginHandler } from "@/app/api/v1/auth/login/route";
import { POST as _logoutHandler } from "@/app/api/v1/auth/logout/route";

import { callWithAuth, makeRequest, makeToken } from "./helpers/request";
import { clearTestData, seedTestData, TEST_PASSWORD } from "./helpers/seed";

import type { SeedData } from "./helpers/seed";
import type { NextRequest } from "next/server";

const BASE_URL = "http://localhost/api/v1";

let seed: SeedData;

beforeAll(async () => {
  seed = await seedTestData();
});

afterAll(async () => {
  await clearTestData();
});

// ─── AT-AUTH-001: POST /auth/login ───────────────────────────────────────────

describe("AT-AUTH-001: POST /auth/login", () => {
  it("#1 正しいメール・パスワード → 200 + token + user情報", async () => {
    const req = makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: { email: seed.salesUser.email, password: TEST_PASSWORD },
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.token).toBeDefined();
    expect(typeof body.data.token).toBe("string");
    expect(body.data.user.email).toBe(seed.salesUser.email);
    expect(body.data.user.role).toBe("SALES");
    expect(body.message).toBe("success");
  });

  it("#2 正しいメール・誤ったパスワード → 401 UNAUTHORIZED", async () => {
    const req = makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: { email: seed.salesUser.email, password: "wrongpassword" },
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("#3 存在しないメールアドレス → 401 UNAUTHORIZED", async () => {
    const req = makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: { email: "notexist@example.com", password: TEST_PASSWORD },
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("#4 is_active = false のユーザー → 401 UNAUTHORIZED", async () => {
    const req = makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: { email: seed.inactiveUser.email, password: TEST_PASSWORD },
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("#5 email を省略 → 400 VALIDATION_ERROR", async () => {
    const req = makeRequest(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: { password: TEST_PASSWORD },
    });

    const res = await loginHandler(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.some((d: { field: string }) => d.field === "email")).toBe(true);
  });
});

// ─── AT-AUTH-002: POST /auth/logout ──────────────────────────────────────────

describe("AT-AUTH-002: POST /auth/logout", () => {
  // logoutHandler は NextRequest を受け取らないため、ラッパーで型を合わせる
  const logoutWrapper = (_req: NextRequest) => Promise.resolve(_logoutHandler());

  it("#1 有効なトークンで → 204", async () => {
    const token = makeToken({
      userId: seed.salesUser.id,
      role: "SALES",
      name: seed.salesUser.name,
    });

    const res = await callWithAuth(
      logoutWrapper,
      `${BASE_URL}/auth/logout`,
      { method: "POST", authorization: `Bearer ${token}` },
    );

    expect(res.status).toBe(204);
  });

  it("#2 Authorization ヘッダーなし → 401 UNAUTHORIZED", async () => {
    const res = await callWithAuth(
      logoutWrapper,
      `${BASE_URL}/auth/logout`,
      { method: "POST" },
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
