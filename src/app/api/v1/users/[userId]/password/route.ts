import { NextResponse } from "next/server";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  // 1. ロール検証: ADMIN のみ許可
  const authUser = requireRole(request, ["ADMIN"]);
  if (!authUser) return forbiddenError();

  const { userId } = await params;
  const userIdNum = Number(userId);

  if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
    return notFoundError("ユーザーが見つかりません");
  }

  // 2. ユーザーの取得
  const existing = await prisma.user.findUnique({
    where: { id: userIdNum },
  });

  if (!existing) {
    return notFoundError("ユーザーが見つかりません");
  }

  // 3. リクエストボディのパース
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return validationError("リクエストボディが不正です");
  }

  const { new_password } = body;
  const details: { field: string; message: string }[] = [];

  // 4. バリデーション
  if (
    new_password === undefined ||
    new_password === null ||
    new_password === ""
  ) {
    details.push({ field: "new_password", message: "パスワードは必須です" });
  } else if (typeof new_password !== "string") {
    details.push({
      field: "new_password",
      message: "パスワードの形式が正しくありません",
    });
  } else {
    if (new_password.length < 8) {
      details.push({
        field: "new_password",
        message: "パスワードは8文字以上で入力してください",
      });
    } else if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      details.push({
        field: "new_password",
        message: "パスワードは英字と数字を混在させてください",
      });
    }
  }

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  // 5. bcrypt でハッシュ化して保存
  const hashed = await hashPassword(new_password as string);

  await prisma.user.update({
    where: { id: userIdNum },
    data: { passwordHash: hashed },
  });

  // 6. 204 No Content
  return new NextResponse(null, { status: 204 });
}
