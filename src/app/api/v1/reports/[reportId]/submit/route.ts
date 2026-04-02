import { conflictError, forbiddenError, notFoundError, successResponse } from "@/lib/api-response";
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
  const id = Number(reportId);
  if (!Number.isInteger(id) || id <= 0) {
    return notFoundError("日報が見つかりません");
  }

  const report = await prisma.dailyReport.findUnique({
    where: { id },
  });

  if (!report) {
    return notFoundError("日報が見つかりません");
  }

  if (report.userId !== authUser.userId) {
    return forbiddenError("この日報を提出する権限がありません");
  }

  if (report.status === "SUBMITTED") {
    return conflictError("この日報は既に提出済みです");
  }

  const updated = await prisma.dailyReport.update({
    where: { id },
    data: { status: "SUBMITTED" },
  });

  return successResponse({
    report_id: updated.id,
    status: updated.status,
    updated_at: updated.updatedAt.toISOString(),
  });
}
