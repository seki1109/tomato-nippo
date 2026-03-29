
import { forbiddenError, successResponse } from "@/lib/api-response";
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
