
import {
  forbiddenError,
  notFoundError,
  successResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { NextRequest } from "next/server";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const authUser = requireRole(request, ["SALES", "MANAGER"]);
  if (!authUser) return forbiddenError();

  const { reportId } = await params;
  const id = Number(reportId);
  if (!Number.isInteger(id) || id <= 0) {
    return notFoundError("日報が見つかりません");
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, department: true } },
      visitRecords: {
        include: {
          customer: { select: { id: true, companyName: true } },
        },
        orderBy: { visitOrder: "asc" },
      },
      comments: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!report) {
    return notFoundError("日報が見つかりません");
  }

  // SALES は自分の日報のみ
  if (authUser.role === "SALES" && report.userId !== authUser.userId) {
    return forbiddenError("この日報を閲覧する権限がありません");
  }

  return successResponse({
    report_id: report.id,
    report_date: formatDate(report.reportDate),
    status: report.status,
    problem: report.problem,
    plan: report.plan,
    user: {
      user_id: report.user.id,
      name: report.user.name,
      department: report.user.department,
    },
    visit_records: report.visitRecords.map((vr) => ({
      visit_id: vr.id,
      customer: {
        customer_id: vr.customer.id,
        company_name: vr.customer.companyName,
      },
      visit_content: vr.visitContent,
      visit_order: vr.visitOrder,
    })),
    comments: report.comments.map((c) => ({
      comment_id: c.id,
      comment_text: c.commentText,
      user: { user_id: c.user.id, name: c.user.name },
      created_at: c.createdAt.toISOString(),
    })),
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
  });
}
