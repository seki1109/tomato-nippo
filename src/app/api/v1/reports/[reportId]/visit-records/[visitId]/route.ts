import { forbiddenError, notFoundError, successResponse, validationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; visitId: string }> },
) {
  const authUser = requireRole(request, ["SALES"]);
  if (!authUser) return forbiddenError();

  const { reportId, visitId } = await params;
  const reportIdNum = Number(reportId);
  const visitIdNum = Number(visitId);

  if (!Number.isInteger(reportIdNum) || reportIdNum <= 0) {
    return notFoundError("日報が見つかりません");
  }
  if (!Number.isInteger(visitIdNum) || visitIdNum <= 0) {
    return notFoundError("訪問記録が見つかりません");
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportIdNum },
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

  const visitRecord = await prisma.visitRecord.findUnique({
    where: { id: visitIdNum },
  });

  if (!visitRecord || visitRecord.reportId !== reportIdNum) {
    return notFoundError("訪問記録が見つかりません");
  }

  const body = (await request.json()) as {
    customer_id?: unknown;
    visit_content?: unknown;
    visit_order?: unknown;
  };

  const details: { field: string; message: string }[] = [];

  if (body.customer_id === undefined || body.customer_id === null) {
    details.push({ field: "customer_id", message: "顧客IDは必須です" });
  } else if (
    typeof body.customer_id !== "number" ||
    !Number.isInteger(body.customer_id) ||
    body.customer_id <= 0
  ) {
    details.push({ field: "customer_id", message: "顧客IDは正の整数で指定してください" });
  }

  if (body.visit_content === undefined || body.visit_content === null || body.visit_content === "") {
    details.push({ field: "visit_content", message: "訪問内容は必須です" });
  } else if (typeof body.visit_content !== "string") {
    details.push({ field: "visit_content", message: "訪問内容は文字列で入力してください" });
  } else if (body.visit_content.length > 1000) {
    details.push({ field: "visit_content", message: "訪問内容は1000文字以内で入力してください" });
  }

  if (body.visit_order === undefined || body.visit_order === null) {
    details.push({ field: "visit_order", message: "訪問順は必須です" });
  } else if (
    typeof body.visit_order !== "number" ||
    !Number.isInteger(body.visit_order) ||
    body.visit_order <= 0
  ) {
    details.push({ field: "visit_order", message: "訪問順は正の整数で指定してください" });
  }

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  const customer = await prisma.customer.findUnique({
    where: { id: body.customer_id as number },
  });

  if (!customer || !customer.isActive) {
    return validationError("入力値が不正です", [
      { field: "customer_id", message: "指定された顧客が存在しません" },
    ]);
  }

  const updated = await prisma.visitRecord.update({
    where: { id: visitIdNum },
    data: {
      customerId: body.customer_id as number,
      visitContent: body.visit_content as string,
      visitOrder: body.visit_order as number,
    },
    include: {
      customer: { select: { id: true, companyName: true } },
    },
  });

  return successResponse({
    visit_id: updated.id,
    customer: {
      customer_id: updated.customer.id,
      company_name: updated.customer.companyName,
    },
    visit_content: updated.visitContent,
    visit_order: updated.visitOrder,
    created_at: updated.createdAt.toISOString(),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; visitId: string }> },
) {
  const authUser = requireRole(request, ["SALES"]);
  if (!authUser) return forbiddenError();

  const { reportId, visitId } = await params;
  const reportIdNum = Number(reportId);
  const visitIdNum = Number(visitId);

  if (!Number.isInteger(reportIdNum) || reportIdNum <= 0) {
    return notFoundError("日報が見つかりません");
  }
  if (!Number.isInteger(visitIdNum) || visitIdNum <= 0) {
    return notFoundError("訪問記録が見つかりません");
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id: reportIdNum },
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

  const visitRecord = await prisma.visitRecord.findUnique({
    where: { id: visitIdNum },
  });

  if (!visitRecord || visitRecord.reportId !== reportIdNum) {
    return notFoundError("訪問記録が見つかりません");
  }

  await prisma.visitRecord.delete({
    where: { id: visitIdNum },
  });

  return new NextResponse(null, { status: 204 });
}
