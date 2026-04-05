import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/reports/[reportId]/visit-records/route";
import { PATCH } from "@/app/api/v1/reports/[reportId]/visit-records/reorder/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyReport: { findUnique: vi.fn() },
    visitRecord: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    customer: { findUnique: vi.fn() },
    $transaction: vi.fn(),
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
const VISIT_PARAMS = { params: Promise.resolve({ reportId: REPORT_ID }) };

const draftReport = {
  id: 10,
  userId: 1,
  status: "DRAFT",
  reportDate: new Date("2026-03-27"),
};

const submittedReport = {
  id: 10,
  userId: 1,
  status: "SUBMITTED",
  reportDate: new Date("2026-03-27"),
};

const activeCustomer = { id: 5, companyName: "株式会社〇〇", isActive: true };

// ─────────────────────────────────────────────────────────────────────────────
// AT-VISIT-001: POST /api/v1/reports/:id/visit-records
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-VISIT-001: POST /reports/:id/visit-records", () => {
  beforeEach(() => {
    vi.mocked(prisma.dailyReport.findUnique).mockReset();
    vi.mocked(prisma.customer.findUnique).mockReset();
    vi.mocked(prisma.visitRecord.create).mockReset();
  });

  it("#1 正常追加 → 201", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(draftReport as never);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(activeCustomer as never);
    vi.mocked(prisma.visitRecord.create).mockResolvedValue({
      id: 25,
      customerId: 5,
      visitContent: "訪問内容テスト",
      visitOrder: 1,
      createdAt: new Date("2026-03-27T17:00:00Z"),
      customer: { id: 5, companyName: "株式会社〇〇" },
    } as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/visit-records`,
      "POST",
      "SALES",
      1,
      { customer_id: 5, visit_content: "訪問内容テスト", visit_order: 1 },
    );
    const res = await POST(req, VISIT_PARAMS);

    expect(res.status).toBe(201);
    const json = await res.json() as { data: { visit_id: number } };
    expect(json.data.visit_id).toBe(25);
  });

  it("#2 SUBMITTED の日報に追加 → 403", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(submittedReport as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/visit-records`,
      "POST",
      "SALES",
      1,
      { customer_id: 5, visit_content: "訪問内容テスト", visit_order: 1 },
    );
    const res = await POST(req, VISIT_PARAMS);

    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("#3 存在しない customer_id → 400", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(draftReport as never);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/visit-records`,
      "POST",
      "SALES",
      1,
      { customer_id: 9999, visit_content: "訪問内容テスト", visit_order: 1 },
    );
    const res = await POST(req, VISIT_PARAMS);

    expect(res.status).toBe(400);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("#4 他者の日報に追加 → 403", async () => {
    // userId=2 の日報に userId=1 が追加しようとする
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue({
      ...draftReport,
      userId: 2,
    } as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/visit-records`,
      "POST",
      "SALES",
      1,
      { customer_id: 5, visit_content: "訪問内容テスト", visit_order: 1 },
    );
    const res = await POST(req, VISIT_PARAMS);

    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("FORBIDDEN");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AT-VISIT-002: PATCH /api/v1/reports/:id/visit-records/reorder
// ─────────────────────────────────────────────────────────────────────────────
describe("AT-VISIT-002: PATCH /reports/:id/visit-records/reorder", () => {
  beforeEach(() => {
    vi.mocked(prisma.dailyReport.findUnique).mockReset();
    vi.mocked(prisma.visitRecord.findMany).mockReset();
    vi.mocked(prisma.visitRecord.update).mockReset();
    vi.mocked(prisma.$transaction).mockReset();
  });

  it("#1 正常な並び替え → 200", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(draftReport as never);
    vi.mocked(prisma.visitRecord.findMany).mockResolvedValue([
      { id: 20, reportId: 10 },
      { id: 25, reportId: 10 },
    ] as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([]);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/visit-records/reorder`,
      "PATCH",
      "SALES",
      1,
      {
        orders: [
          { visit_id: 20, visit_order: 2 },
          { visit_id: 25, visit_order: 1 },
        ],
      },
    );
    const res = await PATCH(req, VISIT_PARAMS);

    expect(res.status).toBe(200);
    const json = await res.json() as { data: null; message: string };
    expect(json.message).toBe("success");
  });

  it("#2 別日報の visit_id を含む → 400", async () => {
    vi.mocked(prisma.dailyReport.findUnique).mockResolvedValue(draftReport as never);
    // visit_id: 99 は reportId: 99（別日報）に属する
    vi.mocked(prisma.visitRecord.findMany).mockResolvedValue([
      { id: 20, reportId: 10 },
      { id: 99, reportId: 99 },
    ] as never);

    const req = makeRequest(
      `/api/v1/reports/${REPORT_ID}/visit-records/reorder`,
      "PATCH",
      "SALES",
      1,
      {
        orders: [
          { visit_id: 20, visit_order: 1 },
          { visit_id: 99, visit_order: 2 },
        ],
      },
    );
    const res = await PATCH(req, VISIT_PARAMS);

    expect(res.status).toBe(400);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
