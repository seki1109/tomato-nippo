import { forbiddenError, notFoundError, successResponse, validationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const authUser = requireRole(request, ["SALES"]);
  if (!authUser) return forbiddenError();

  const { reportId } = await params;
  const reportIdNum = Number(reportId);

  if (!Number.isInteger(reportIdNum) || reportIdNum <= 0) {
    return notFoundError("日報が見つかりません");
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

  const body = (await request.json()) as { orders?: unknown };

  if (!Array.isArray(body.orders) || body.orders.length === 0) {
    return validationError("入力値が不正です", [
      { field: "orders", message: "ordersは1件以上の配列で指定してください" },
    ]);
  }

  const details: { field: string; message: string }[] = [];

  for (let i = 0; i < body.orders.length; i++) {
    const item = body.orders[i] as Record<string, unknown>;

    if (
      typeof item.visit_id !== "number" ||
      !Number.isInteger(item.visit_id) ||
      item.visit_id <= 0
    ) {
      details.push({ field: `orders[${i}].visit_id`, message: "visit_idは正の整数で指定してください" });
    }

    if (
      typeof item.visit_order !== "number" ||
      !Number.isInteger(item.visit_order) ||
      item.visit_order <= 0
    ) {
      details.push({ field: `orders[${i}].visit_order`, message: "visit_orderは正の整数で指定してください" });
    }
  }

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  type OrderItem = { visit_id: number; visit_order: number };
  const orders = body.orders as OrderItem[];
  const visitIds = orders.map((o) => o.visit_id);

  const existingRecords = await prisma.visitRecord.findMany({
    where: { id: { in: visitIds } },
    select: { id: true, reportId: true },
  });

  const existingIds = new Set(existingRecords.map((r) => r.id));

  for (const visitId of visitIds) {
    if (!existingIds.has(visitId)) {
      return notFoundError(`visit_id: ${visitId} の訪問記録が見つかりません`);
    }
  }

  const wrongReport = existingRecords.find((r) => r.reportId !== reportIdNum);
  if (wrongReport) {
    return validationError("入力値が不正です", [
      { field: "orders", message: "別の日報に属するvisit_idが含まれています" },
    ]);
  }

  await prisma.$transaction(
    orders.map((o) =>
      prisma.visitRecord.update({
        where: { id: o.visit_id },
        data: { visitOrder: o.visit_order },
      }),
    ),
  );

  return successResponse(null);
}
