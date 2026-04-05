/**
 * AT-REPORT-001: GET /api/v1/reports
 * AT-REPORT-002: POST /api/v1/reports
 * AT-REPORT-003: GET /api/v1/reports/:id
 * AT-REPORT-004: PUT /api/v1/reports/:id
 * AT-REPORT-005: PATCH /api/v1/reports/:id/submit
 * AT-REPORT-006: DELETE /api/v1/reports/:id
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  DELETE as deleteReport,
  GET as getReport,
  PUT as updateReport,
} from "@/app/api/v1/reports/[reportId]/route";
import { PATCH as submitReport } from "@/app/api/v1/reports/[reportId]/submit/route";
import { GET as getReports, POST as createReport } from "@/app/api/v1/reports/route";

import { callWithAuth, makeRequest } from "./helpers/request";
import { clearTestData, seedTestData, testPrisma } from "./helpers/seed";

import type { SeedData } from "./helpers/seed";

const BASE_URL = "http://localhost/api/v1";

let seed: SeedData;

/** params を持つルートハンドラ呼び出しの型エイリアス */
type ParamHandler = (
  req: Parameters<typeof getReport>[0],
  ctx: { params: Promise<{ reportId: string }> },
) => ReturnType<typeof getReport>;

/** reportId パラメータを解決済みのコンテキストを生成する */
function reportCtx(reportId: number) {
  return { params: Promise.resolve({ reportId: String(reportId) }) };
}

beforeAll(async () => {
  seed = await seedTestData();
});

afterAll(async () => {
  await clearTestData();
});

// ─── AT-REPORT-001: GET /reports ─────────────────────────────────────────────

describe("AT-REPORT-001: GET /api/v1/reports", () => {
  it("#1 SALES が自分の日報一覧を取得 → 自分の日報のみ返る", async () => {
    const req = makeRequest(`${BASE_URL}/reports`, {
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await getReports(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const reports = body.data.reports as { user: { user_id: number } }[];
    expect(reports.length).toBeGreaterThan(0);
    reports.forEach((r) => expect(r.user.user_id).toBe(seed.salesUser.id));
  });

  it("#2 MANAGER が全員分の日報を取得 → 複数ユーザーの日報が返る", async () => {
    const req = makeRequest(`${BASE_URL}/reports`, {
      user: { userId: seed.managerUser.id, role: "MANAGER", name: seed.managerUser.name },
    });

    const res = await getReports(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const userIds = new Set(
      (body.data.reports as { user: { user_id: number } }[]).map((r) => r.user.user_id),
    );
    expect(userIds.size).toBeGreaterThan(1);
  });

  it("#3 SALES が user_id を指定して他者の日報を取得しようとする → 403", async () => {
    const req = makeRequest(
      `${BASE_URL}/reports?user_id=${seed.sales2User.id}`,
      { user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name } },
    );

    const res = await getReports(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("#4 status=DRAFT で絞り込み → DRAFT のみ返る", async () => {
    const req = makeRequest(`${BASE_URL}/reports?status=DRAFT`, {
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await getReports(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const reports = body.data.reports as { status: string }[];
    reports.forEach((r) => expect(r.status).toBe("DRAFT"));
  });

  it("#5 year_month で絞り込み → 指定月のみ返る", async () => {
    const req = makeRequest(`${BASE_URL}/reports?year_month=2026-03`, {
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await getReports(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    const reports = body.data.reports as { report_date: string }[];
    reports.forEach((r) => expect(r.report_date.startsWith("2026-03")).toBe(true));
  });

  it("#6 Authorization ヘッダーなし → 401 UNAUTHORIZED", async () => {
    const res = await callWithAuth(getReports, `${BASE_URL}/reports`);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// ─── AT-REPORT-002: POST /reports ────────────────────────────────────────────

describe("AT-REPORT-002: POST /api/v1/reports", () => {
  it("#1 正常作成（DRAFT） → 201 + 作成された日報", async () => {
    const req = makeRequest(`${BASE_URL}/reports`, {
      method: "POST",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
      body: {
        report_date: "2026-01-10",
        visit_records: [
          { customer_id: seed.customers[0].id, visit_content: "テスト訪問", visit_order: 1 },
        ],
        problem: "テスト課題",
        plan: "テスト計画",
        status: "DRAFT",
      },
    });

    const res = await createReport(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.status).toBe("DRAFT");
    expect(body.data.report_id).toBeDefined();

    // クリーンアップ
    await testPrisma.dailyReport.delete({ where: { id: body.data.report_id } });
  });

  it("#2 正常作成（SUBMITTED） → 201 + ステータスが SUBMITTED", async () => {
    const req = makeRequest(`${BASE_URL}/reports`, {
      method: "POST",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
      body: {
        report_date: "2026-01-11",
        visit_records: [
          { customer_id: seed.customers[1].id, visit_content: "テスト訪問", visit_order: 1 },
        ],
        status: "SUBMITTED",
      },
    });

    const res = await createReport(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.status).toBe("SUBMITTED");

    await testPrisma.dailyReport.delete({ where: { id: body.data.report_id } });
  });

  it("#3 同日の日報が既に存在する → 409 CONFLICT", async () => {
    const req = makeRequest(`${BASE_URL}/reports`, {
      method: "POST",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
      body: {
        report_date: seed.draftReport.reportDate,
        visit_records: [
          { customer_id: seed.customers[0].id, visit_content: "重複テスト", visit_order: 1 },
        ],
        status: "DRAFT",
      },
    });

    const res = await createReport(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("#4 存在しない customer_id → 400 VALIDATION_ERROR", async () => {
    const req = makeRequest(`${BASE_URL}/reports`, {
      method: "POST",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
      body: {
        report_date: "2026-01-12",
        visit_records: [
          { customer_id: 999999, visit_content: "不正顧客テスト", visit_order: 1 },
        ],
        status: "DRAFT",
      },
    });

    const res = await createReport(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("#5 MANAGER ロールでアクセス → 403 FORBIDDEN", async () => {
    const req = makeRequest(`${BASE_URL}/reports`, {
      method: "POST",
      user: { userId: seed.managerUser.id, role: "MANAGER", name: seed.managerUser.name },
      body: {
        report_date: "2026-01-15",
        visit_records: [
          { customer_id: seed.customers[0].id, visit_content: "テスト", visit_order: 1 },
        ],
        status: "DRAFT",
      },
    });

    const res = await createReport(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ─── AT-REPORT-003: GET /reports/:id ─────────────────────────────────────────

describe("AT-REPORT-003: GET /api/v1/reports/:id", () => {
  it("#1 SALES が自分の日報を取得 → 200 + 詳細（訪問記録・コメント含む）", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.draftReport.id}`, {
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (getReport as ParamHandler)(req, reportCtx(seed.draftReport.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.report_id).toBe(seed.draftReport.id);
    expect(body.data.visit_records).toBeDefined();
    expect(body.data.comments).toBeDefined();
  });

  it("#2 SALES が他者の日報を取得 → 403 FORBIDDEN", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.otherDraftReport.id}`, {
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (getReport as ParamHandler)(req, reportCtx(seed.otherDraftReport.id));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("#3 MANAGER が任意の日報を取得 → 200", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.otherDraftReport.id}`, {
      user: { userId: seed.managerUser.id, role: "MANAGER", name: seed.managerUser.name },
    });

    const res = await (getReport as ParamHandler)(req, reportCtx(seed.otherDraftReport.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.report_id).toBe(seed.otherDraftReport.id);
  });

  it("#4 存在しない report_id → 404 NOT_FOUND", async () => {
    const req = makeRequest(`${BASE_URL}/reports/999999`, {
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (getReport as ParamHandler)(req, reportCtx(999999));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

// ─── AT-REPORT-004: PUT /reports/:id ─────────────────────────────────────────

describe("AT-REPORT-004: PUT /api/v1/reports/:id", () => {
  it("#1 DRAFT の日報を更新 → 200 + 更新後の日報", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.draftReport.id}`, {
      method: "PUT",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
      body: { problem: "更新した課題", plan: "更新した計画" },
    });

    const res = await (updateReport as ParamHandler)(req, reportCtx(seed.draftReport.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.problem).toBe("更新した課題");
    expect(body.data.plan).toBe("更新した計画");
  });

  it("#2 SUBMITTED の日報を更新しようとする → 403 FORBIDDEN", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.submittedReport.id}`, {
      method: "PUT",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
      body: { problem: "変更しようとする" },
    });

    const res = await (updateReport as ParamHandler)(req, reportCtx(seed.submittedReport.id));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("#3 他者の日報を更新しようとする → 403 FORBIDDEN", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.otherDraftReport.id}`, {
      method: "PUT",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
      body: { problem: "不正更新" },
    });

    const res = await (updateReport as ParamHandler)(req, reportCtx(seed.otherDraftReport.id));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ─── AT-REPORT-005: PATCH /reports/:id/submit ────────────────────────────────

describe("AT-REPORT-005: PATCH /api/v1/reports/:id/submit", () => {
  type SubmitParamHandler = (
    req: Parameters<typeof submitReport>[0],
    ctx: { params: Promise<{ reportId: string }> },
  ) => ReturnType<typeof submitReport>;

  let freshDraftId: number;

  beforeEach(async () => {
    // 各テストで新しい DRAFT 日報を作成
    const report = await testPrisma.dailyReport.create({
      data: {
        userId: seed.salesUser.id,
        reportDate: new Date("2026-01-20"),
        status: "DRAFT",
        visitRecords: {
          create: [
            {
              customerId: seed.customers[0].id,
              visitContent: "提出テスト",
              visitOrder: 1,
            },
          ],
        },
      },
    });
    freshDraftId = report.id;
  });

  afterEach(async () => {
    await testPrisma.dailyReport.deleteMany({
      where: { id: freshDraftId },
    });
  });

  it("#1 DRAFT の日報を提出 → 200 + ステータスが SUBMITTED", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${freshDraftId}/submit`, {
      method: "PATCH",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (submitReport as SubmitParamHandler)(req, reportCtx(freshDraftId));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("SUBMITTED");
  });

  it("#2 既に SUBMITTED の日報を再提出 → 409 CONFLICT", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.submittedReport.id}/submit`, {
      method: "PATCH",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (submitReport as SubmitParamHandler)(
      req,
      reportCtx(seed.submittedReport.id),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("#3 他者の日報を提出しようとする → 403 FORBIDDEN", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.otherDraftReport.id}/submit`, {
      method: "PATCH",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (submitReport as SubmitParamHandler)(
      req,
      reportCtx(seed.otherDraftReport.id),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

// ─── AT-REPORT-006: DELETE /reports/:id ──────────────────────────────────────

describe("AT-REPORT-006: DELETE /api/v1/reports/:id", () => {
  type DeleteParamHandler = (
    req: Parameters<typeof deleteReport>[0],
    ctx: { params: Promise<{ reportId: string }> },
  ) => ReturnType<typeof deleteReport>;

  let deletableReportId: number;

  beforeEach(async () => {
    const report = await testPrisma.dailyReport.create({
      data: {
        userId: seed.salesUser.id,
        reportDate: new Date("2026-01-25"),
        status: "DRAFT",
        visitRecords: {
          create: [
            {
              customerId: seed.customers[0].id,
              visitContent: "削除テスト",
              visitOrder: 1,
            },
          ],
        },
      },
    });
    deletableReportId = report.id;
  });

  afterEach(async () => {
    // テスト後に作成したレポートが残っていれば削除（#1 は既に削除済みのため no-op）
    await testPrisma.dailyReport.deleteMany({ where: { id: deletableReportId } });
  });

  it("#1 DRAFT の日報を削除 → 204", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${deletableReportId}`, {
      method: "DELETE",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (deleteReport as DeleteParamHandler)(req, reportCtx(deletableReportId));

    expect(res.status).toBe(204);

    // 実際に削除されていることを確認
    const deleted = await testPrisma.dailyReport.findUnique({
      where: { id: deletableReportId },
    });
    expect(deleted).toBeNull();
  });

  it("#2 SUBMITTED の日報を削除しようとする → 403 FORBIDDEN", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.submittedReport.id}`, {
      method: "DELETE",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (deleteReport as DeleteParamHandler)(
      req,
      reportCtx(seed.submittedReport.id),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("#3 他者の日報を削除しようとする → 403 FORBIDDEN", async () => {
    const req = makeRequest(`${BASE_URL}/reports/${seed.otherDraftReport.id}`, {
      method: "DELETE",
      user: { userId: seed.salesUser.id, role: "SALES", name: seed.salesUser.name },
    });

    const res = await (deleteReport as DeleteParamHandler)(
      req,
      reportCtx(seed.otherDraftReport.id),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
