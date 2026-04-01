
import {
  forbiddenError,
  notFoundError,
  successResponse,
  validationError,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const authUser = requireRole(request, ["SALES"]);
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

  if (report.userId !== authUser.userId) {
    return forbiddenError("この日報を編集する権限がありません");
  }

  if (report.status === "SUBMITTED") {
    return forbiddenError("提出済みの日報は編集できません");
  }

  const body = (await request.json()) as { problem?: unknown; plan?: unknown };

  const details: { field: string; message: string }[] = [];
  if (body.problem !== undefined && body.problem !== null) {
    if (typeof body.problem !== "string" || body.problem.length > 2000) {
      details.push({ field: "problem", message: "2000文字以内で入力してください" });
    }
  }
  if (body.plan !== undefined && body.plan !== null) {
    if (typeof body.plan !== "string" || body.plan.length > 2000) {
      details.push({ field: "plan", message: "2000文字以内で入力してください" });
    }
  }
  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  const updated = await prisma.dailyReport.update({
    where: { id },
    data: {
      problem: body.problem !== undefined ? (body.problem as string | null) : report.problem,
      plan: body.plan !== undefined ? (body.plan as string | null) : report.plan,
    },
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

  return successResponse({
    report_id: updated.id,
    report_date: formatDate(updated.reportDate),
    status: updated.status,
    problem: updated.problem,
    plan: updated.plan,
    user: {
      user_id: updated.user.id,
      name: updated.user.name,
      department: updated.user.department,
    },
    visit_records: updated.visitRecords.map((vr) => ({
      visit_id: vr.id,
      customer: {
        customer_id: vr.customer.id,
        company_name: vr.customer.companyName,
      },
      visit_content: vr.visitContent,
      visit_order: vr.visitOrder,
    })),
    comments: updated.comments.map((c) => ({
      comment_id: c.id,
      comment_text: c.commentText,
      user: { user_id: c.user.id, name: c.user.name },
      created_at: c.createdAt.toISOString(),
    })),
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  });
}
