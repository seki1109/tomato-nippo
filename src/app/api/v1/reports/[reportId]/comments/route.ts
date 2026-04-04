import { forbiddenError, notFoundError, successResponse, validationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const authUser = requireRole(request, ["MANAGER"]);
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

  const body = (await request.json()) as { comment_text?: unknown };

  if (
    body.comment_text === undefined ||
    body.comment_text === null ||
    body.comment_text === ""
  ) {
    return validationError("入力値が不正です", [
      { field: "comment_text", message: "コメント本文は必須です" },
    ]);
  }

  if (typeof body.comment_text !== "string") {
    return validationError("入力値が不正です", [
      { field: "comment_text", message: "コメント本文は文字列で入力してください" },
    ]);
  }

  const comment = await prisma.comment.create({
    data: {
      reportId: reportIdNum,
      userId: authUser.userId,
      commentText: body.comment_text,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return successResponse(
    {
      comment_id: comment.id,
      comment_text: comment.commentText,
      user: {
        user_id: comment.user.id,
        name: comment.user.name,
      },
      created_at: comment.createdAt.toISOString(),
      updated_at: comment.updatedAt.toISOString(),
    },
    201,
  );
}
