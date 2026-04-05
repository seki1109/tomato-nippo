import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUT } from "@/app/api/v1/users/[userId]/route";
import { POST } from "@/app/api/v1/users/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// bcryptjs をモックして高速化
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashed_password"),
  },
}));

function makeRequest(
  url: string,
  method: string,
  role: string,
  userId: number,
  body?: unknown,
): NextRequest {
  const headers: Record<string, string> = {
    "x-user-id": String(userId),
    "x-user-role": role,
    "x-user-name": encodeURIComponent("テストユーザー"),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const USER_ID = "10";
const USER_PARAMS = { params: Promise.resolve({ userId: USER_ID }) };

const existingUser = {
  id: 10,
  name: "田中太郎",
  email: "tanaka@example.com",
  passwordHash: "$2b$10$hashed_password",
  role: "SALES",
  department: "東京営業部",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-03-27T10:00:00Z"),
};

// ─────────────────────────────────────────────────────────────────────────────
// AT-USER-001: POST /api/v1/users
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-USER-001: POST /users", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
  });

  it("#1 正常登録 → 201", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // メール重複なし
    vi.mocked(prisma.user.create).mockResolvedValue({
      ...existingUser,
      id: 20,
      email: "new@example.com",
    } as never);

    const req = makeRequest("/api/v1/users", "POST", "ADMIN", 1, {
      name: "新規ユーザー",
      email: "new@example.com",
      password: "password123",
      role: "SALES",
      department: "東京営業部",
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json() as { data: { user_id: number; is_active: boolean } };
    expect(json.data.user_id).toBe(20);
    expect(json.data.is_active).toBe(true);
  });

  it("#2 メールアドレス重複 → 409", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as never); // 重複あり

    const req = makeRequest("/api/v1/users", "POST", "ADMIN", 1, {
      name: "別ユーザー",
      email: "tanaka@example.com", // 既存メール
      password: "password123",
      role: "SALES",
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("CONFLICT");
  });

  it("#3 SALES がアクセス → 403", async () => {
    const req = makeRequest("/api/v1/users", "POST", "SALES", 1, {
      name: "新規ユーザー",
      email: "new@example.com",
      password: "password123",
      role: "SALES",
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("FORBIDDEN");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AT-USER-002: PUT /api/v1/users/:id
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-USER-002: PUT /users/:id", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.update).mockReset();
  });

  it("#1 ロール変更（SALES → MANAGER）→ 200", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...existingUser,
      role: "MANAGER",
    } as never);

    const req = makeRequest(
      `/api/v1/users/${USER_ID}`,
      "PUT",
      "ADMIN",
      1, // ADMIN のユーザーID（更新対象とは異なる）
      {
        name: "田中太郎",
        email: "tanaka@example.com",
        role: "MANAGER",
        department: "東京営業部",
        is_active: true,
      },
    );
    const res = await PUT(req, USER_PARAMS);

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { role: string } };
    expect(json.data.role).toBe("MANAGER");
  });

  it("#2 無効化（is_active: false）→ 200", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...existingUser,
      isActive: false,
    } as never);

    const req = makeRequest(
      `/api/v1/users/${USER_ID}`,
      "PUT",
      "ADMIN",
      1, // ADMIN のユーザーID（更新対象 userId=10 とは異なる）
      {
        name: "田中太郎",
        email: "tanaka@example.com",
        role: "SALES",
        department: "東京営業部",
        is_active: false,
      },
    );
    const res = await PUT(req, USER_PARAMS);

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { is_active: boolean } };
    expect(json.data.is_active).toBe(false);
  });

  it("#3 自分自身を無効化 → 400", async () => {
    // ADMIN (userId=10) が userId=10 を無効化しようとする
    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as never);

    const req = makeRequest(
      `/api/v1/users/${USER_ID}`,
      "PUT",
      "ADMIN",
      10, // 自分自身を操作（authUser.userId === userIdNum）
      {
        name: "田中太郎",
        email: "tanaka@example.com",
        role: "ADMIN",
        department: "東京営業部",
        is_active: false,
      },
    );
    const res = await PUT(req, USER_PARAMS);

    expect(res.status).toBe(400);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
