import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE,
  PUT,
} from "@/app/api/v1/reports/[reportId]/comments/[commentId]/route";
import { POST } from "@/app/api/v1/reports/[reportId]/comments/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyReport: { findUnique: vi.fn() },
    comment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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

const REPORT_ID = "10";
const COMMENT_ID = "3";
const POST_PARAMS = { params: Promise.resolve({ reportId: REPORT_ID }) };
const COMMENT_PARAMS = {
  params: Promise.resolve({ reportId: REPORT_ID, commentId: COMMENT_ID }),
};

const existingReport = {
  id: 10,
  userId: 1,
  status: "SUBMITTED",
  reportDate: new Date("2026-03-27"),
};

const managerComment = {
  id: 3,
  reportId: 10,
  userId: 2,
  commentText: "既存コメント",
  createdAt: new Date("2026-03-27T19:00:00Z"),
  updatedAt: new Date("2026-03-27T19:00:00Z"),
  user: { id: 2, name: "山田部長" },
};

// ─────────────────────────────────────────────────────────────────────────────
// AT-COMMENT-001: POST /api/v1/reports/:id/comments
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-COMMENT-001: POST /reports/:id/comments", () => {
  beforeEach(() => {
    vi.mocked(prisma.dailyReport.findUnique).mockReset();
    vi.mocked(prisma.comment.create).mockReset();
  });

  it("#1 正常投稿 → 201", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({
      id: 3,
      commentText: "テストコメント",
      createdAt: new Date("2026-03-27T19:00:00Z"),
      updatedAt: new Date("2026-03-27T19:00:00Z"),
      user: { id: 2, name: "山田部長" },
    } as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/comments`,
      "POST",
      "MANAGER",
      2,
      { comment_text: "テストコメント" },
    );
    const res = await POST(req, POST_PARAMS);

    expect(res.status).toBe(201);
    const json = await res.json() as { data: { comment_id: number } };
    expect(json.data.comment_id).toBe(3);
  });

  it("#2 SALES がコメント投稿 → 403", async () => {
    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/comments`,
      "POST",
      "SALES",
      1,
      { comment_text: "テストコメント" },
    );
    const res = await POST(req, POST_PARAMS);

    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("#3 本文が空 → 400", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(existingReport as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/comments`,
      "POST",
      "MANAGER",
      2,
      { comment_text: "" },
    );
    const res = await POST(req, POST_PARAMS);

    expect(res.status).toBe(400);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("#4 存在しない日報 → 404", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(null);

    const req = makeRequest(
      "/api/v1/reports/9999/comments",
      "POST",
      "MANAGER",
      2,
      { comment_text: "テストコメント" },
    );
    const res = await POST(req, {
      params: Promise.resolve({ reportId: "9999" }),
    });

    expect(res.status).toBe(404);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("NOT_FOUND");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AT-COMMENT-002: PUT / DELETE /api/v1/reports/:id/comments/:id
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-COMMENT-002: PUT / DELETE /reports/:id/comments/:id", () => {
  beforeEach(() => {
    vi.mocked(prisma.comment.findUnique).mockReset();
    vi.mocked(prisma.comment.update).mockReset();
    vi.mocked(prisma.comment.delete).mockReset();
  });

  it("#1 自分のコメントを編集 → 200", async () => {
    // userId=2 のコメントを userId=2 が編集する
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(managerComment as never);
    vi.mocked(prisma.comment.update).mockResolvedValue({
      ...managerComment,
      commentText: "修正コメント",
    } as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/comments/${COMMENT_ID}`,
      "PUT",
      "MANAGER",
      2,
      { comment_text: "修正コメント" },
    );
    const res = await PUT(req, COMMENT_PARAMS);

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { comment_text: string } };
    expect(json.data.comment_text).toBe("修正コメント");
  });

  it("#2 他者のコメントを編集 → 403", async () => {
    // userId=2 のコメントを userId=3 が編集しようとする
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(managerComment as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/comments/${COMMENT_ID}`,
      "PUT",
      "MANAGER",
      3,
      { comment_text: "修正コメント" },
    );
    const res = await PUT(req, COMMENT_PARAMS);

    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("#3 自分のコメントを削除 → 204", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(managerComment as never);
    vi.mocked(prisma.comment.delete).mockResolvedValue(managerComment as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/comments/${COMMENT_ID}`,
      "DELETE",
      "MANAGER",
      2,
    );
    const res = await DELETE(req, COMMENT_PARAMS);

    expect(res.status).toBe(204);
  });

  it("#4 他者のコメントを削除 → 403", async () => {
    // userId=2 のコメントを userId=3 が削除しようとする
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(managerComment as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/comments/${COMMENT_ID}`,
      "DELETE",
      "MANAGER",
      3,
    );
    const res = await DELETE(req, COMMENT_PARAMS);

    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("FORBIDDEN");
  });
});
