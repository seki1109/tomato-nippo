import { NextResponse } from "next/server";


import { forbiddenError, notFoundError, successResponse, validationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; commentId: string }> },
) {
  const authUser = requireRole(request, ["MANAGER"]);
  if (!authUser) return forbiddenError();

  const { reportId, commentId } = await params;
  const reportIdNum = Number(reportId);
  const commentIdNum = Number(commentId);

  if (!Number.isInteger(reportIdNum) || reportIdNum <= 0) {
    return notFoundError("日報が見つかりません");
  }
  if (!Number.isInteger(commentIdNum) || commentIdNum <= 0) {
    return notFoundError("コメントが見つかりません");
  }

  // 1. コメントの取得（日報への所属も確認）
  const comment = await prisma.comment.findUnique({
    where: { id: commentIdNum },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!comment || comment.reportId !== reportIdNum) {
    return notFoundError("コメントが見つかりません");
  }

  // 2. 投稿者チェック: 自分以外 → 403
  if (comment.userId !== authUser.userId) {
    return forbiddenError("他のユーザーのコメントは編集できません");
  }

  // 3. バリデーション
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

  // 4. コメントを更新
  const updated = await prisma.comment.update({
    where: { id: commentIdNum },
    data: { commentText: body.comment_text },
    include: { user: { select: { id: true, name: true } } },
  });

  // 5. 200: 更新後のコメントを返す
  return successResponse({
    comment_id: updated.id,
    comment_text: updated.commentText,
    user: {
      user_id: updated.user.id,
      name: updated.user.name,
    },
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; commentId: string }> },
) {
  const authUser = requireRole(request, ["MANAGER"]);
  if (!authUser) return forbiddenError();

  const { reportId, commentId } = await params;
  const reportIdNum = Number(reportId);
  const commentIdNum = Number(commentId);

  if (!Number.isInteger(reportIdNum) || reportIdNum <= 0) {
    return notFoundError("日報が見つかりません");
  }
  if (!Number.isInteger(commentIdNum) || commentIdNum <= 0) {
    return notFoundError("コメントが見つかりません");
  }

  // 1. コメントの取得（日報への所属も確認）
  const comment = await prisma.comment.findUnique({
    where: { id: commentIdNum },
  });

  if (!comment || comment.reportId !== reportIdNum) {
    return notFoundError("コメントが見つかりません");
  }

  // 2. 投稿者チェック: 自分以外 → 403
  if (comment.userId !== authUser.userId) {
    return forbiddenError("他のユーザーのコメントは削除できません");
  }

  // 3. コメントを削除
  await prisma.comment.delete({ where: { id: commentIdNum } });

  // 4. 204 No Content
  return new NextResponse(null, { status: 204 });
}
