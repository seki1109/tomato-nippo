
import {
  successResponse,
  unauthorizedError,
  validationError,
} from "@/lib/api-response";
import { comparePassword, generateToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_CREDENTIALS_MSG =
  "メールアドレスまたはパスワードが正しくありません";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("リクエストボディが不正です");
  }

  const { email, password } = body as Record<string, unknown>;

  // バリデーション
  const details: { field: string; message: string }[] = [];

  if (!email) {
    details.push({ field: "email", message: "メールアドレスは必須です" });
  } else if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    details.push({
      field: "email",
      message: "メールアドレスの形式で入力してください",
    });
  }

  if (!password) {
    details.push({ field: "password", message: "パスワードは必須です" });
  }

  if (details.length > 0) {
    return validationError("入力値が不正です", details);
  }

  // 認証ロジック
  const user = await prisma.user.findUnique({
    where: { email: email as string },
  });

  if (!user || !user.isActive) {
    return unauthorizedError(INVALID_CREDENTIALS_MSG);
  }

  const passwordMatch = await comparePassword(
    password as string,
    user.passwordHash,
  );
  if (!passwordMatch) {
    return unauthorizedError(INVALID_CREDENTIALS_MSG);
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
    name: user.name,
  });

  return successResponse({
    token,
    user: {
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department ?? undefined,
    },
  });
}
