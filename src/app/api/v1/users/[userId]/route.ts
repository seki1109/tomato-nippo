import {
  conflictError,
  forbiddenError,
  notFoundError,
  successResponse,
  validationError,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { Role } from "@/types";
import type { NextRequest } from "next/server";

const VALID_ROLES: Role[] = ["SALES", "MANAGER", "ADMIN"];

export async function PUT(
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

  const { name, email, role, department, is_active } = body;
  const details: { field: string; message: string }[] = [];

  // 4. バリデーション（POST と同様。password は不要）

  // name: 必須・100文字以内
  if (name === undefined || name === null || name === "") {
    details.push({ field: "name", message: "氏名は必須です" });
  } else if (typeof name !== "string") {
    details.push({ field: "name", message: "氏名の形式が正しくありません" });
  } else if (name.length > 100) {
    details.push({
      field: "name",
      message: "氏名は100文字以内で入力してください",
    });
  }

  // email: 必須・メール形式
  if (email === undefined || email === null || email === "") {
    details.push({ field: "email", message: "メールアドレスは必須です" });
  } else if (typeof email !== "string") {
    details.push({
      field: "email",
      message: "メールアドレスの形式が正しくありません",
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.push({
      field: "email",
      message: "メール形式で入力してください",
    });
  }

  // role: 必須・有効値
  if (role === undefined || role === null || role === "") {
    details.push({ field: "role", message: "ロールは必須です" });
  } else if (!VALID_ROLES.includes(role as Role)) {
    details.push({
      field: "role",
      message: "ロールは SALES / MANAGER / ADMIN のいずれかを指定してください",
    });
  }

  // department: 任意・100文字以内
  if (typeof department === "string" && department.length > 100) {
    details.push({
      field: "department",
      message: "部署名は100文字以内で入力してください",
    });
  }

  // is_active: 必須・boolean
  if (is_active === undefined || is_active === null) {
    details.push({ field: "is_active", message: "有効フラグは必須です" });
  } else if (typeof is_active !== "boolean") {
    details.push({
      field: "is_active",
      message: "有効フラグは true または false で指定してください",
    });
  }

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  // 5. 自分自身を is_active=false にしようとする場合 → 400
  if (authUser.userId === userIdNum && is_active === false) {
    return validationError("自分自身を無効化することはできません");
  }

  // 6. email 変更時の重複チェック
  if (typeof email === "string" && email !== existing.email) {
    const duplicate = await prisma.user.findUnique({
      where: { email },
    });
    if (duplicate) {
      return conflictError("このメールアドレスは既に使用されています");
    }
  }

  // 7. ユーザーを更新
  const updated = await prisma.user.update({
    where: { id: userIdNum },
    data: {
      name: name as string,
      email: email as string,
      role: role as Role,
      department:
        typeof department === "string" && department.length > 0
          ? department
          : null,
      isActive: is_active as boolean,
    },
  });

  // 8. 200: 更新後のユーザー情報
  return successResponse({
    user_id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    department: updated.department,
    is_active: updated.isActive,
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  });
}
