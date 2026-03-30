
import {
  conflictError,
  forbiddenError,
  successResponse,
  validationError,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { Prisma } from "@/generated/prisma/client";
import type { NextRequest } from "next/server";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authUser = requireRole(request, ["SALES", "MANAGER"]);
  if (!authUser) return forbiddenError();

  const { searchParams } = request.nextUrl;

  // SALES が user_id を指定した場合は 403
  if (authUser.role === "SALES" && searchParams.has("user_id")) {
    return forbiddenError();
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const perPage = Math.max(
    1,
    Number(searchParams.get("per_page") ?? "20") || 20,
  );

  const where: Prisma.DailyReportWhereInput = {};

  // ロールによる絞り込み
  if (authUser.role === "SALES") {
    where.userId = authUser.userId;
  } else {
    const userIdParam = searchParams.get("user_id");
    if (userIdParam) {
      where.userId = Number(userIdParam);
    }
  }

  // year_month フィルター（例: "2026-03"）
  const yearMonth = searchParams.get("year_month");
  if (yearMonth && /^\d{4}-\d{2}$/.test(yearMonth)) {
    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    where.reportDate = { gte: startDate, lt: endDate };
  }

  // status フィルター
  const status = searchParams.get("status");
  if (status === "DRAFT" || status === "SUBMITTED") {
    where.status = status;
  }

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        reportDate: true,
        status: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
      },
    }),
  ]);

  return successResponse({
    reports: reports.map((r) => ({
      report_id: r.id,
      report_date: formatDate(r.reportDate),
      status: r.status,
      user: { user_id: r.user.id, name: r.user.name },
      updated_at: r.updatedAt.toISOString(),
    })),
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  });
}

interface VisitRecordInput {
  customer_id: unknown;
  visit_content: unknown;
  visit_order: unknown;
}

export async function POST(request: NextRequest) {
  // 1. ロール検証: SALES のみ許可
  const authUser = requireRole(request, ["SALES"]);
  if (!authUser) return forbiddenError();

  // 2. リクエストボディのパース
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return validationError("リクエストボディが不正です");
  }

  const { report_date, visit_records, problem, plan, status } = body;
  const details: { field: string; message: string }[] = [];

  // 3. バリデーション

  // report_date（ローカル時刻で今日の日付を取得）
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (report_date === undefined || report_date === null || report_date === "") {
    details.push({ field: "report_date", message: "日付は必須です" });
  } else if (
    typeof report_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(report_date)
  ) {
    details.push({
      field: "report_date",
      message: "日付の形式が正しくありません（YYYY-MM-DD）",
    });
  } else if (report_date > today) {
    details.push({
      field: "report_date",
      message: "今日以前の日付を指定してください",
    });
  }

  // visit_records
  if (!Array.isArray(visit_records) || visit_records.length === 0) {
    details.push({
      field: "visit_records",
      message: "訪問記録は1件以上必要です",
    });
  } else {
    (visit_records as VisitRecordInput[]).forEach((vr, i) => {
      if (!vr.customer_id) {
        details.push({
          field: `visit_records[${i}].customer_id`,
          message: "顧客IDは必須です",
        });
      }
      if (!vr.visit_content) {
        details.push({
          field: `visit_records[${i}].visit_content`,
          message: "訪問内容は必須です",
        });
      } else if (
        typeof vr.visit_content === "string" &&
        vr.visit_content.length > 1000
      ) {
        details.push({
          field: `visit_records[${i}].visit_content`,
          message: "訪問内容は1000文字以内で入力してください",
        });
      }
    });
  }

  // problem
  if (typeof problem === "string" && problem.length > 2000) {
    details.push({
      field: "problem",
      message: "課題・相談は2000文字以内で入力してください",
    });
  }

  // plan
  if (typeof plan === "string" && plan.length > 2000) {
    details.push({
      field: "plan",
      message: "明日やることは2000文字以内で入力してください",
    });
  }

  // status
  const statusValue = status ?? "DRAFT";
  if (statusValue !== "DRAFT" && statusValue !== "SUBMITTED") {
    details.push({
      field: "status",
      message: "ステータスは DRAFT または SUBMITTED を指定してください",
    });
  }

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  // 4. 顧客の存在チェック（is_active = true のみ）
  const visitRecordsInput = visit_records as VisitRecordInput[];
  const customerIds = [
    ...new Set(visitRecordsInput.map((vr) => Number(vr.customer_id))),
  ];
  const activeCustomers = await prisma.customer.findMany({
    where: { id: { in: customerIds }, isActive: true },
    select: { id: true },
  });
  const activeCustomerIds = new Set(activeCustomers.map((c) => c.id));
  const invalidIds = customerIds.filter((id) => !activeCustomerIds.has(id));
  if (invalidIds.length > 0) {
    return validationError("入力値が不正です", [
      {
        field: "visit_records[].customer_id",
        message: `顧客ID ${invalidIds.join(", ")} が存在しません`,
      },
    ]);
  }

  // 5. 同日付の重複チェック + トランザクションで日報・訪問記録を一括作成
  const reportDate = new Date(report_date as string);

  try {
    const report = await prisma.$transaction(async (tx) => {
      const existing = await tx.dailyReport.findUnique({
        where: {
          userId_reportDate: { userId: authUser.userId, reportDate },
        },
        select: { id: true },
      });
      if (existing) {
        throw new Error("CONFLICT");
      }

      return tx.dailyReport.create({
        data: {
          userId: authUser.userId,
          reportDate,
          problem: typeof problem === "string" ? problem : null,
          plan: typeof plan === "string" ? plan : null,
          status: statusValue as "DRAFT" | "SUBMITTED",
          visitRecords: {
            create: visitRecordsInput.map((vr) => ({
              customerId: Number(vr.customer_id),
              visitContent: vr.visit_content as string,
              visitOrder:
                typeof vr.visit_order === "number" ? vr.visit_order : 1,
            })),
          },
        },
        include: {
          user: { select: { id: true, name: true } },
          visitRecords: {
            include: {
              customer: { select: { id: true, companyName: true } },
            },
            orderBy: { visitOrder: "asc" },
          },
        },
      });
    });

    return successResponse(
      {
        report_id: report.id,
        report_date: formatDate(report.reportDate),
        status: report.status,
        problem: report.problem,
        plan: report.plan,
        user: { user_id: report.user.id, name: report.user.name },
        visit_records: report.visitRecords.map((vr) => ({
          visit_id: vr.id,
          customer: {
            customer_id: vr.customer.id,
            company_name: vr.customer.companyName,
          },
          visit_content: vr.visitContent,
          visit_order: vr.visitOrder,
        })),
        comments: [],
        created_at: report.createdAt.toISOString(),
        updated_at: report.updatedAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") {
      return conflictError(`${report_date as string} の日報は既に存在します`);
    }
    throw error;
  }
}
