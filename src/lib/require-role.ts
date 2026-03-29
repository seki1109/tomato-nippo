
import type { JwtPayload } from "@/lib/auth";
import type { Role } from "@/types";
import type { NextRequest } from "next/server";

/**
 * ミドルウェアが Request ヘッダーに埋め込んだ認証済みユーザー情報を取得する。
 * Route Handler 内で呼び出す。
 */
export function getAuthUser(request: NextRequest): JwtPayload {
  const userId = Number(request.headers.get("x-user-id"));
  const role = request.headers.get("x-user-role") as Role;
  const name = request.headers.get("x-user-name") ?? "";
  return { userId, role, name };
}

/**
 * 許可ロール以外のユーザーにアクセスを制限する。
 * 権限不足の場合は `null` を返す（呼び出し側で 403 を返すこと）。
 *
 * @example
 * const user = requireRole(request, ['MANAGER', 'ADMIN']);
 * if (!user) return forbiddenError();
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: Role[],
): JwtPayload | null {
  const user = getAuthUser(request);
  if (!allowedRoles.includes(user.role)) {
    return null;
  }
  return user;
}
