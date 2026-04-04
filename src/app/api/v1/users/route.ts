import { forbiddenError, successResponse } from "@/lib/api-response";
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
