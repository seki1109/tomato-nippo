/**
 * Next.js App Router テスト用ヘルパー
 *
 * NextRequest を直接構築し、ルートハンドラを呼び出す。
 * ミドルウェアが設定する x-user-* ヘッダーを手動で付与することで
 * 認証済みリクエストを再現する。
 */
import { NextRequest, NextResponse } from "next/server";

import { generateToken, verifyToken } from "@/lib/auth";

import type { Role } from "@/types";

export interface TestUser {
  userId: number;
  role: Role;
  name: string;
}

/** Bearer トークン文字列を生成する */
export function makeToken(user: TestUser): string {
  return generateToken(user);
}

/** ミドルウェアが JWT 検証後にセットする x-user-* ヘッダーを返す */
function userHeaders(user: TestUser): Record<string, string> {
  return {
    "x-user-id": String(user.userId),
    "x-user-role": user.role,
    "x-user-name": encodeURIComponent(user.name),
  };
}

/**
 * 認証済み NextRequest を生成する。
 * ユーザーを指定しない場合は x-user-* ヘッダーなし（認証なしリクエスト相当）。
 */
export function makeRequest(
  url: string,
  opts: {
    method?: string;
    body?: unknown;
    user?: TestUser;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, user, headers = {} } = opts;

  const allHeaders: Record<string, string> = {
    ...(body !== undefined ? { "content-type": "application/json" } : {}),
    ...(user ? userHeaders(user) : {}),
    ...headers,
  };

  return new NextRequest(url, {
    method,
    headers: allHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * ミドルウェアの認証フローを模倣するラッパー。
 * - Authorization ヘッダーなし → 401
 * - 無効トークン → 401
 * - 有効トークン → x-user-* ヘッダーを付与してハンドラを呼ぶ
 */
export async function callWithAuth(
  handler: (req: NextRequest) => Promise<Response> | Response,
  url: string,
  opts: {
    method?: string;
    body?: unknown;
    authorization?: string;
    isPublicPath?: boolean;
  } = {},
): Promise<Response> {
  const { method = "GET", body, authorization, isPublicPath = false } = opts;

  if (!isPublicPath) {
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "認証トークンが指定されていません",
          },
        },
        { status: 401 },
      );
    }

    const token = authorization.slice(7);
    let payload: ReturnType<typeof verifyToken>;
    try {
      payload = verifyToken(token);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "トークンが無効または期限切れです",
          },
        },
        { status: 401 },
      );
    }

    const req = new NextRequest(url, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        authorization,
        "x-user-id": String(payload.userId),
        "x-user-role": payload.role,
        "x-user-name": encodeURIComponent(payload.name),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handler(req);
  }

  const req = new NextRequest(url, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handler(req);
}
