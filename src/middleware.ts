import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

const PUBLIC_PATHS = ["/api/v1/auth/login"];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
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

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload["userId"]));
    requestHeaders.set("x-user-role", String(payload["role"]));
    requestHeaders.set("x-user-name", encodeURIComponent(String(payload["name"])));

    return NextResponse.next({ request: { headers: requestHeaders } });
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
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
