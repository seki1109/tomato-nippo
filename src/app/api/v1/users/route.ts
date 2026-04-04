import bcrypt from "bcryptjs";

import {
  conflictError,
  forbiddenError,
  successResponse,
  validationError,
} from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

import type { Role } from "@/types";
import type { NextRequest } from "next/server";

const VALID_ROLES: Role[] = ["SALES", "MANAGER", "ADMIN"];

export async function GET(request: NextRequest) {
  // 1. ロール検証: ADMIN のみ許可
  const authUser = requireRole(request, ["ADMIN"]);
  if (!authUser) return forbiddenError();

  const { searchParams } = request.nextUrl;
  const roleParam = searchParams.get("role");
  const isActiveParam = searchParams.get("is_active");

  // 2. フィルター構築
  const where: { role?: Role; isActive: boolean } = {
    isActive: isActiveParam === "false" ? false : true,
  };

  if (roleParam !== null && VALID_ROLES.includes(roleParam as Role)) {
    where.role = roleParam as Role;
  }

  // 3. ユーザー一覧取得（password_hash は含めない）
  const users = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      isActive: true,
      createdAt: true,
    },
  });

  return successResponse({
    users: users.map((u) => ({
      user_id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      is_active: u.isActive,
      created_at: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  // 1. ロール検証: ADMIN のみ許可
  const authUser = requireRole(request, ["ADMIN"]);
  if (!authUser) return forbiddenError();

  // 2. リクエストボディのパース
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return validationError("リクエストボディが不正です");
  }

  const { name, email, password, role, department } = body;
  const details: { field: string; message: string }[] = [];

  // 3. バリデーション

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
      message: "メールアドレスの形式で入力してください",
    });
  }

  // password: 必須・8文字以上・英数字混在
  if (password === undefined || password === null || password === "") {
    details.push({ field: "password", message: "パスワードは必須です" });
  } else if (typeof password !== "string") {
    details.push({
      field: "password",
      message: "パスワードの形式が正しくありません",
    });
  } else if (password.length < 8) {
    details.push({
      field: "password",
      message: "パスワードは8文字以上で入力してください",
    });
  } else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    details.push({
      field: "password",
      message: "パスワードは英字と数字を混在させてください",
    });
  }

  // role: 必須・SALES / MANAGER / ADMIN のいずれか
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

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  // 4. email 重複チェック
  const existing = await prisma.user.findUnique({
    where: { email: email as string },
  });
  if (existing) {
    return conflictError("このメールアドレスは既に使用されています");
  }

  // 5. パスワードをハッシュ化
  const passwordHash = await bcrypt.hash(password as string, 10);

  // 6. ユーザーを作成（is_active = true はデフォルト）
  const user = await prisma.user.create({
    data: {
      name: name as string,
      email: email as string,
      passwordHash,
      role: role as Role,
      department:
        typeof department === "string" && department.length > 0
          ? department
          : null,
    },
  });

  return successResponse(
    {
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      is_active: user.isActive,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    },
    201,
  );
}
