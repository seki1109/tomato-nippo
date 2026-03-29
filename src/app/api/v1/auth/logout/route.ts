import { NextResponse } from "next/server";

/**
 * POST /api/v1/auth/logout
 *
 * JWT はステートレスなため、サーバー側での無効化は行わない。
 * クライアントがトークンを破棄することでログアウトとする。
 * 認証チェックは Middleware が担う（トークンなし → 401）。
 */
export function POST() {
  return new NextResponse(null, { status: 204 });
}
